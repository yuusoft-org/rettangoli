import { describe, expect, it, vi } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import { createSiteBuilder } from '../src/createSiteBuilder.js';

function fixture() {
  const volume = Volume.fromJSON({
    '/project/src/pages/index.yaml': '- p: Source survives',
    '/project/package.json': '{"private":true}',
  });
  return createFsFromVolume(volume);
}

describe('output cleanup containment', () => {
  it.each(['.', '..', '../..', '/'])('refuses unsafe output %s before deleting source', async (outputPath) => {
    const fs = fixture();
    const remove = vi.spyOn(fs, 'rmSync');
    const build = createSiteBuilder({ fs, rootDir: '/project/src', outputPath, quiet: true });

    await expect(build()).rejects.toThrow('Refusing to clean output path');
    expect(remove).not.toHaveBeenCalled();
    expect(fs.readFileSync('/project/src/pages/index.yaml', 'utf8')).toContain('Source survives');
    expect(fs.existsSync('/project/package.json')).toBe(true);
  });

  it('rejects output symlinks to source ancestors', async () => {
    const fs = fixture();
    fs.symlinkSync('/project', '/alias');
    const remove = vi.spyOn(fs, 'rmSync');
    const build = createSiteBuilder({ fs, rootDir: '/project/src', outputPath: '/alias', quiet: true });

    await expect(build()).rejects.toThrow('Refusing to clean output path');
    expect(remove).not.toHaveBeenCalled();
  });

  it('protects source reached through a symlink', async () => {
    const fs = fixture();
    fs.symlinkSync('/project/src', '/source');
    const remove = vi.spyOn(fs, 'rmSync');
    const build = createSiteBuilder({ fs, rootDir: '/source', outputPath: '/project', quiet: true });

    await expect(build()).rejects.toThrow('Refusing to clean output path');
    expect(remove).not.toHaveBeenCalled();
  });

  it.each(['../_site', '_site', '/project/src-other', '/alias/new-output'])('allows safe output %s', async (outputPath) => {
    const fs = fixture();
    fs.mkdirSync('/outputs');
    fs.symlinkSync('/outputs', '/alias');
    await createSiteBuilder({ fs, rootDir: '/project/src', outputPath, quiet: true })();
    expect(fs.readFileSync('/project/src/pages/index.yaml', 'utf8')).toContain('Source survives');
    expect(fs.existsSync('/project/package.json')).toBe(true);
  });
});
