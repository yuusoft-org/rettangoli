import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ script: '' }));
vi.mock('../src/cli/watchClient.js', () => ({ createWatchClientScript: () => client.script }));

const { DevServer } = await import('../src/cli/watch.js');

describe('watch client injection', () => {
  let directory;
  let server;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rettangoli-sites-inject-'));
    server = new DevServer(3001, directory);
  });

  afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

  function serve(html, script) {
    client.script = script;
    fs.writeFileSync(path.join(directory, 'index.html'), html);
    let body;
    server.handleRequest({ url: '/' }, { writeHead() {}, end(content) { body = String(content); } });
    return body;
  }

  const placements = [
    ['before the first </body>', '<html><body>x</body></html><p></body>', (s) => `<html><body>x${s}</body></html><p></body>`],
    ['before the first </html> without </body>', '<html>x</html></html>', (s) => `<html>x${s}</html></html>`],
    ['at the end without </body> or </html>', '<p>x</p>', (s) => `<p>x</p>${s}`],
  ];

  it.each(placements)('injects the client script %s', (_case, html, expected) => {
    const script = '<script>client()</script>';
    expect(serve(html, script)).toBe(expected(script));
  });

  // Every special String.prototype.replace pattern must reach the page unchanged.
  it.each(placements)('injects a script with $ patterns verbatim %s', (_case, html, expected) => {
    const script = "<script>a $& b $' c $` d $$ e $1</script>";
    expect(serve(html, script)).toBe(expected(script));
  });
});
