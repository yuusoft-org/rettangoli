import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

import { createWatchClientScript } from '../src/cli/watchClient.js';

const waitForUpdate = () => new Promise((resolve) => setTimeout(resolve, 25));

// Serves `initialBody` with the body-mode client, then answers each HTML update with the next body.
function createWatchDom(initialBody, nextBodies) {
  let socket = null;
  let responseIndex = 0;
  let revision = 0;
  const bodies = Array.isArray(nextBodies) ? nextBodies : [nextBodies];
  const dom = new JSDOM(
    `<!doctype html><html><head></head><body>${initialBody}${createWatchClientScript('body', 0, 's')}</body></html>`,
    {
      runScripts: 'dangerously',
      url: 'http://localhost:3001/p/',
      beforeParse(window) {
        window.WebSocket = class {
          constructor() {
            socket = this;
          }
        };
        window.fetch = async () => {
          const body = bodies[Math.min(responseIndex++, bodies.length - 1)];
          return { ok: true, status: 200, text: async () => `<!doctype html><html><head></head><body>${body}</body></html>` };
        };
        window.scrollTo = () => {};
      },
    },
  );
  const update = async () => {
    socket.onmessage({
      data: JSON.stringify({ type: 'reload-current', sessionId: 's', updateKind: 'html', paths: [], revision: ++revision }),
    });
    await waitForUpdate();
  };
  return { document: dom.window.document, update };
}

describe('source edits to untouched controls apply', () => {
  it('input value attribute', async () => {
    const { document, update } = createWatchDom('<input id="x" value="old">', '<input id="x" value="new">');
    await update();
    expect(document.querySelector('#x').value).toBe('new');
  });

  it('input value attribute across two edits', async () => {
    const { document, update } = createWatchDom('<input id="x" value="v0">', ['<input id="x" value="v1">', '<input id="x" value="v2">']);
    await update();
    await update();
    expect(document.querySelector('#x').value).toBe('v2');
  });

  it('hidden input value attribute', async () => {
    const { document, update } = createWatchDom('<input id="x" type="hidden" value="old">', '<input id="x" type="hidden" value="new">');
    await update();
    expect(document.querySelector('#x').value).toBe('new');
  });

  it('checkbox value attribute', async () => {
    const { document, update } = createWatchDom('<input id="x" type="checkbox" value="a">', '<input id="x" type="checkbox" value="b">');
    await update();
    expect(document.querySelector('#x').value).toBe('b');
  });

  it('checkbox checked removed', async () => {
    const { document, update } = createWatchDom('<input id="x" type="checkbox" checked>', '<input id="x" type="checkbox">');
    await update();
    expect(document.querySelector('#x').checked).toBe(false);
  });

  it('radio checked moved', async () => {
    const { document, update } = createWatchDom(
      '<input id="r1" type="radio" name="g" checked><input id="r2" type="radio" name="g">',
      '<input id="r1" type="radio" name="g"><input id="r2" type="radio" name="g" checked>',
    );
    await update();
    expect(document.querySelector('#r2').checked).toBe(true);
    expect(document.querySelector('#r1').checked).toBe(false);
  });

  it('select gains an explicit selected option (implicit first selection before)', async () => {
    const { document, update } = createWatchDom(
      '<select id="x"><option value="a">A</option><option value="b">B</option></select>',
      '<select id="x"><option value="a">A</option><option value="b" selected>B</option></select>',
    );
    await update();
    expect(document.querySelector('#x').value).toBe('b');
  });

  it('select explicit selected option moves from b to c', async () => {
    const { document, update } = createWatchDom(
      '<select id="x"><option value="a">A</option><option value="b" selected>B</option><option value="c">C</option></select>',
      '<select id="x"><option value="a">A</option><option value="b">B</option><option value="c" selected>C</option></select>',
    );
    await update();
    expect(document.querySelector('#x').value).toBe('c');
  });

  it('textarea text', async () => {
    const { document, update } = createWatchDom('<textarea id="x">old</textarea>', '<textarea id="x">new</textarea>');
    await update();
    expect(document.querySelector('#x').value).toBe('new');
  });

  it('details open removed', async () => {
    const { document, update } = createWatchDom('<details id="x" open><summary>S</summary></details>', '<details id="x"><summary>S</summary></details>');
    await update();
    expect(document.querySelector('#x').open).toBe(false);
  });

  it('details open added', async () => {
    const { document, update } = createWatchDom('<details id="x"><summary>S</summary></details>', '<details id="x" open><summary>S</summary></details>');
    await update();
    expect(document.querySelector('#x').open).toBe(true);
  });

  it('dialog open added', async () => {
    const { document, update } = createWatchDom('<dialog id="x">d</dialog>', '<dialog id="x" open>d</dialog>');
    await update();
    expect(document.querySelector('#x').open).toBe(true);
  });

  it('details open removed after an earlier unrelated edit', async () => {
    const { document, update } = createWatchDom(
      '<p>a</p><details id="x" open><summary>S</summary></details>',
      ['<p>b</p><details id="x" open><summary>S</summary></details>', '<p>b</p><details id="x"><summary>S</summary></details>'],
    );
    await update();
    await update();
    expect(document.querySelector('#x').open).toBe(false);
  });

  it('does not add a value attribute to a checkbox without one', async () => {
    const { document, update } = createWatchDom('<p>a</p><input id="x" type="checkbox">', '<p>b</p><input id="x" type="checkbox">');
    await update();
    expect(document.querySelector('#x').outerHTML).toBe('<input id="x" type="checkbox">');
  });
});

describe('user changes survive source edits', () => {
  it('typed input value', async () => {
    const { document, update } = createWatchDom('<input id="x" value="old">', '<input id="x" value="new">');
    document.querySelector('#x').value = 'typed';
    await update();
    expect(document.querySelector('#x').value).toBe('typed');
  });

  it('typed input value across two edits', async () => {
    const { document, update } = createWatchDom('<input id="x" value="v0">', ['<input id="x" value="v1">', '<input id="x" value="v2">']);
    document.querySelector('#x').value = 'typed';
    await update();
    await update();
    expect(document.querySelector('#x').value).toBe('typed');
  });

  it('typed textarea value', async () => {
    const { document, update } = createWatchDom('<textarea id="x">old</textarea>', '<textarea id="x">new</textarea>');
    document.querySelector('#x').value = 'typed';
    await update();
    expect(document.querySelector('#x').value).toBe('typed');
  });

  it('user-checked checkbox while the source changes its label', async () => {
    const { document, update } = createWatchDom('<label><input id="x" type="checkbox"> a</label>', '<label><input id="x" type="checkbox"> b</label>');
    document.querySelector('#x').checked = true;
    await update();
    expect(document.querySelector('#x').checked).toBe(true);
  });

  it('user-unchecked checkbox while the source keeps it checked', async () => {
    const { document, update } = createWatchDom('<p>a</p><input id="x" type="checkbox" checked>', '<p>b</p><input id="x" type="checkbox" checked>');
    document.querySelector('#x').checked = false;
    await update();
    expect(document.querySelector('#x').checked).toBe(false);
  });

  it('user-checked radio survives the source moving the default', async () => {
    const { document, update } = createWatchDom(
      '<input id="r1" type="radio" name="g" checked><input id="r2" type="radio" name="g"><input id="r3" type="radio" name="g">',
      '<input id="r1" type="radio" name="g"><input id="r2" type="radio" name="g" checked><input id="r3" type="radio" name="g">',
    );
    document.querySelector('#r3').checked = true;
    await update();
    expect(document.querySelector('#r3').checked).toBe(true);
  });

  it('user-selected option survives an unrelated source edit', async () => {
    const { document, update } = createWatchDom(
      '<p>a</p><select id="x"><option value="a">A</option><option value="b">B</option></select>',
      '<p>b</p><select id="x"><option value="a">A</option><option value="b">B</option></select>',
    );
    document.querySelector('#x').value = 'b';
    await update();
    expect(document.querySelector('#x').value).toBe('b');
  });

  it('user-selected option survives the source selecting another option', async () => {
    const { document, update } = createWatchDom(
      '<select id="x"><option value="a">A</option><option value="b">B</option><option value="c">C</option></select>',
      '<select id="x"><option value="a">A</option><option value="b" selected>B</option><option value="c">C</option></select>',
    );
    document.querySelector('#x').value = 'c';
    await update();
    expect(document.querySelector('#x').value).toBe('c');
  });

  it('user-opened details survives an unrelated source edit', async () => {
    const { document, update } = createWatchDom('<p>a</p><details id="x"><summary>S</summary></details>', '<p>b</p><details id="x"><summary>S</summary></details>');
    document.querySelector('#x').open = true;
    await update();
    expect(document.querySelector('#x').open).toBe(true);
  });

  it('user-closed details survives two unrelated source edits', async () => {
    const { document, update } = createWatchDom(
      '<p>a</p><details id="x" open><summary>S</summary></details>',
      ['<p>b</p><details id="x" open><summary>S</summary></details>', '<p>c</p><details id="x" open><summary>S</summary></details>'],
    );
    document.querySelector('#x').open = false;
    await update();
    await update();
    expect(document.querySelector('#x').open).toBe(false);
  });

  it('a details element a script opened after load stays open across reloads', async () => {
    const { document, update } = createWatchDom(
      '<p>a</p><details id="x"><summary>S</summary></details>',
      ['<p>b</p><details id="x"><summary>S</summary></details>', '<p>c</p><details id="x"><summary>S</summary></details>'],
    );
    document.querySelector('#x').open = true;
    await update();
    await update();
    expect(document.querySelector('#x').open).toBe(true);
  });

  it('a dialog a script opened after load stays open across reloads', async () => {
    const { document, update } = createWatchDom('<p>a</p><dialog id="x">d</dialog>', '<p>b</p><dialog id="x">d</dialog>');
    document.querySelector('#x').open = true;
    await update();
    expect(document.querySelector('#x').open).toBe(true);
  });
});
