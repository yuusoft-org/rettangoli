import { describe, expect, it } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import {
  readDataDir,
  readYamlTree,
  resolveDirentKind
} from '../src/sources.js';

function memfs(files, links = {}) {
  const fs = createFsFromVolume(Volume.fromJSON(files));
  for (const [linkPath, target] of Object.entries(links)) {
    fs.symlinkSync(target, linkPath);
  }
  return fs;
}

describe('resolveDirentKind', () => {
  it('follows symbolic links and rejects broken ones', () => {
    const fs = memfs(
      { '/d/dir/x.yaml': '', '/d/file.yaml': '', '/target/y.yaml': '' },
      { '/d/dirLink': '/target', '/d/fileLink': '/target/y.yaml', '/d/dead': '/missing' }
    );
    const kinds = Object.fromEntries(fs.readdirSync('/d', { withFileTypes: true })
      .filter(item => item.name !== 'dead')
      .map(item => [item.name, resolveDirentKind(fs, `/d/${item.name}`, item)]));
    const dead = fs.readdirSync('/d', { withFileTypes: true }).find(item => item.name === 'dead');

    expect(kinds).toEqual({ dir: 'directory', dirLink: 'directory', 'file.yaml': 'file', fileLink: 'file' });
    expect(() => resolveDirentKind(fs, '/d/dead', dead)).toThrow(/^Broken symbolic link at "\/d\/dead": /);
  });
});

describe('readYamlTree', () => {
  it('keys every YAML file by its path without the extension', () => {
    const fs = memfs({
      '/p/b.yml': 'b: 1',
      '/p/a.yaml': 'a: 1',
      '/p/nav/main.yaml': '- nav: main',
      '/p/nav/deep/x.yaml': 'x: deep',
      '/p/card.schema.yaml': 'type: object',
      '/p/card.schema.yml': 'type: object',
      '/p/readme.md': '# not yaml',
      '/p/odd.yaml/inner.yaml': 'inner: 1',
      '/shared/s.yaml': 's: 1'
    }, { '/p/linked': '/shared' });

    const tree = readYamlTree(fs, '/p', 'partial file');

    expect(tree).toEqual({
      a: { a: 1 },
      b: { b: 1 },
      'linked/s': { s: 1 },
      'nav/deep/x': { x: 'deep' },
      'nav/main': [{ nav: 'main' }],
      'odd.yaml/inner': { inner: 1 }
    });
    expect(Object.keys(tree)).toEqual(['a', 'b', 'linked/s', 'nav/deep/x', 'nav/main', 'odd.yaml/inner']);
  });

  it('fills the given tree, so local files replace imported entries in place', () => {
    const imported = { card: 'imported card', remote: 'imported remote' };
    const fs = memfs({ '/p/card.yaml': 'local: card', '/p/extra.yaml': 'extra: 1' });

    const tree = readYamlTree(fs, '/p', 'partial file', imported);

    expect(tree).toBe(imported);
    expect(Object.entries(tree)).toEqual([
      ['card', { local: 'card' }],
      ['remote', 'imported remote'],
      ['extra', { extra: 1 }]
    ]);
  });

  it('lets a .yml file replace the .yaml file with the same name', () => {
    const fs = memfs({ '/p/x.yml': 'from: yml', '/p/x.yaml': 'from: yaml' });

    expect(readYamlTree(fs, '/p', 'template file')).toEqual({ x: { from: 'yml' } });
  });

  it('keeps dates as strings (JSON schema)', () => {
    const fs = memfs({ '/p/x.yaml': 'date: 2024-01-02' });

    expect(readYamlTree(fs, '/p', 'template file')).toEqual({ x: { date: '2024-01-02' } });
  });

  it('returns the given tree when the folder does not exist', () => {
    const seed = { a: 1 };

    expect(readYamlTree(memfs({}), '/missing', 'partial file', seed)).toBe(seed);
    expect(readYamlTree(memfs({}), '/missing', 'partial file')).toEqual({});
  });

  it('skips a subfolder that is gone by the time it is read', () => {
    const fs = memfs({ '/p/a.yaml': 'a: 1', '/p/gone/x.yaml': 'x: 1' });
    const list = fs.readdirSync.bind(fs);
    fs.readdirSync = (dir, options) => {
      const items = list(dir, options);
      if (dir === '/p') fs.rmSync('/p/gone', { recursive: true });
      return items;
    };

    expect(readYamlTree(fs, '/p', 'partial file')).toEqual({ a: { a: 1 } });
  });

  it('names the file in YAML errors', () => {
    const fs = memfs({ '/p/nav/bad.yaml': 'a: [' });

    expect(() => readYamlTree(fs, '/p', 'partial file')).toThrow(/^partial file "\/p\/nav\/bad\.yaml": Invalid YAML: /);
  });

  it('rejects a broken symbolic link', () => {
    const fs = memfs({ '/p/a.yaml': 'a: 1' }, { '/p/dead': '/missing' });

    expect(() => readYamlTree(fs, '/p', 'partial file')).toThrow(/^Broken symbolic link at "\/p\/dead": /);
  });
});

describe('readDataDir', () => {
  it('reads top-level YAML and JSON files by name into the given object', () => {
    const fs = memfs({
      '/data/site.yaml': 'title: Site',
      '/data/menu.yml': '- home',
      '/data/stats.json': '{"count": 2}',
      '/data/notes.txt': 'ignored',
      '/data/nested/deep.yaml': 'ignored: true'
    });
    const seed = { catalog: 'imported', site: 'imported' };

    const data = readDataDir(fs, '/data', seed);

    expect(data).toBe(seed);
    expect(Object.entries(data)).toEqual([
      ['catalog', 'imported'],
      ['site', { title: 'Site' }],
      ['menu', ['home']],
      ['stats', { count: 2 }]
    ]);
  });

  it('returns the given object when the folder does not exist', () => {
    const seed = {};

    expect(readDataDir(memfs({}), '/data', seed)).toBe(seed);
  });

  it('rejects a JSON and a YAML file for the same key before parsing either', () => {
    const fs = memfs({ '/data/a.yaml': 'a: [', '/data/site.json': '{', '/data/site.yml': 'x: 1' });

    expect(() => readDataDir(fs, '/data')).toThrow(new Error(
      'Conflicting data files "/data/site.json" and "/data/site.yml": both define global data key "site". Keep only one of them.'
    ));
  });

  it('names the file in YAML and JSON errors', () => {
    expect(() => readDataDir(memfs({ '/data/site.yaml': 'a: [' }), '/data'))
      .toThrow(/^data file "\/data\/site\.yaml": Invalid YAML: /);
    expect(() => readDataDir(memfs({ '/data/site.json': '{' }), '/data'))
      .toThrow(/^data file "\/data\/site\.json": Invalid JSON: /);
  });
});
