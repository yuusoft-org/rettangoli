import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DevServer } from '../src/cli/watch.js';

describe('watch request containment', () => {
  let directory;
  let server;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rettangoli-sites-requests-'));
    const site = path.join(directory, 'site');
    fs.mkdirSync(path.join(site, 'guide'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'private.txt'), 'private fixture');
    fs.writeFileSync(path.join(site, 'index.html'), '<body>Home</body>');
    fs.writeFileSync(path.join(site, 'guide/index.html'), '<body>Guide</body>');
    fs.writeFileSync(path.join(site, 'about.html'), '<body>About</body>');
    fs.writeFileSync(path.join(site, 'hello world.txt'), 'Public fixture');
    fs.symlinkSync(path.join(directory, 'private.txt'), path.join(site, 'alias.txt'));
    fs.symlinkSync(directory, path.join(site, 'external'));
    fs.symlinkSync(path.join(site, 'about.html'), path.join(site, 'internal.html'));
    server = new DevServer(3001, site);
  });

  afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

  function request(url) {
    const response = {};
    server.handleRequest({ url }, {
      writeHead(status) { response.status = status; },
      end(content) { response.body = String(content); },
    });
    return response;
  }

  it.each([
    '/../private.txt',
    '/%2e%2e/private.txt',
    '/%2e%2e%2fprivate.txt',
    '/guide/../../private.txt',
    '/alias.txt',
    '/external/private.txt',
  ])('does not serve escaped path %s', (url) => {
    expect(request(url)).toEqual({ status: 403, body: '403 Forbidden' });
  });

  it.each(['/%', '/%00', '/..%5cprivate.txt'])('rejects malformed path %s', (url) => {
    expect(request(url).status).toBe(400);
  });

  it.each([
    ['/', 'Home'],
    ['/guide/', 'Guide'],
    ['/guide', 'Guide'],
    ['/about?refresh=1', 'About'],
    ['/internal.html', 'About'],
    ['/hello%20world.txt', 'Public fixture'],
  ])('preserves public route %s', (url, content) => {
    const response = request(url);
    expect(response.status).toBe(200);
    expect(response.body).toContain(content);
  });

  it('checks directory index symlinks too', () => {
    const directoryIndex = path.join(server.siteDir, 'guide/index.html');
    fs.unlinkSync(directoryIndex);
    fs.symlinkSync(path.join(directory, 'private.txt'), directoryIndex);
    expect(request('/guide/').status).toBe(403);
  });

  it('returns 404 for missing public files', () => {
    expect(request('/missing.txt').status).toBe(404);
  });

  it.each([undefined, '0.0.0.0'])('binds only the requested host (%s)', (host) => {
    const listen = vi.spyOn(http.Server.prototype, 'listen').mockImplementation(function () { return this; });
    const instance = new DevServer(3001, server.siteDir, undefined, undefined, undefined, host);
    try {
      instance.start();
      expect(listen).toHaveBeenCalledWith(3001, host ?? '127.0.0.1', expect.any(Function));
    } finally {
      instance.close();
      listen.mockRestore();
    }
  });
});
