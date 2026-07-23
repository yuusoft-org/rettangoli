import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

import { createClientScript } from '../src/cli/watch.js';
import { createViteWatchClientModuleSource } from '../src/cli/watchClient.js';

const waitForUpdate = () => new Promise((resolve) => setTimeout(resolve, 20));
const withDefaultDoctype = (html) => /^\s*<!doctype\s/i.test(html)
  ? html
  : `<!doctype html>${html}`;

function createWatchDom({
  initialBody,
  initialHead = '',
  initialRevision = 0,
  initialSessionId = 'session-a',
  nextHtml,
  responseStatus = 200,
  responses = null,
}) {
  let socket = null;
  let responseIndex = 0;
  let windowScrollX = 0;
  let windowScrollY = 0;

  const dom = new JSDOM(
    `<!doctype html><html lang="en"><head>${initialHead}</head><body class="before">${initialBody}${createClientScript('body', initialRevision, initialSessionId)}</body></html>`,
    {
      runScripts: 'dangerously',
      url: 'http://localhost:3001/example/',
      beforeParse(window) {
        const nativeSetTimeout = window.setTimeout.bind(window);
        window.setTimeout = (callback, delay, ...args) =>
          nativeSetTimeout(callback, delay === 1000 ? 0 : delay, ...args);

        class FakeWebSocket {
          constructor() {
            socket = this;
          }
        }

        window.WebSocket = FakeWebSocket;
        window.fetch = vi.fn(async () => {
          const response = responses?.[responseIndex++] || {
            html: nextHtml,
            status: responseStatus,
          };
          return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            text: async () => withDefaultDoctype(await response.html),
          };
        });
        Object.defineProperty(window, 'scrollX', {
          configurable: true,
          get: () => windowScrollX,
        });
        Object.defineProperty(window, 'scrollY', {
          configurable: true,
          get: () => windowScrollY,
        });
        window.scrollTo = vi.fn((x, y) => {
          windowScrollX = x;
          windowScrollY = y;
        });

        window.customElements.define('stateful-box', class extends window.HTMLElement {});
      },
    },
  );

  return {
    dom,
    async handshake({
      revision = initialRevision,
      fullReloadRevision = 0,
      sessionId = initialSessionId,
    } = {}) {
      socket.onopen?.();
      socket.onmessage({
        data: JSON.stringify({
          type: 'watch-state',
          sessionId,
          revision,
          fullReloadRevision,
        }),
      });
      await waitForUpdate();
    },
    async reconnect({
      revision = initialRevision,
      fullReloadRevision = 0,
      sessionId = initialSessionId,
    } = {}) {
      socket.onopen?.();
      socket.onclose();
      await waitForUpdate();
      socket.onopen?.();
      socket.onmessage({
        data: JSON.stringify({
          type: 'watch-state',
          sessionId,
          revision,
          fullReloadRevision,
        }),
      });
      await waitForUpdate();
    },
    send(updateKind = 'html', paths = [], revision = null) {
      socket.onmessage({
        data: JSON.stringify({
          type: 'reload-current',
          sessionId: initialSessionId,
          updateKind,
          paths,
          revision,
        }),
      });
    },
    sendMessage(data) {
      socket.onmessage({
        data: JSON.stringify(data),
      });
    },
  };
}

describe('watch body morph behavior', () => {
  it('discards an older in-flight response after a newer HTML update finishes', async () => {
    let resolveFirstResponse;
    const firstResponse = new Promise((resolve) => {
      resolveFirstResponse = resolve;
    });
    const { dom, send } = createWatchDom({
      initialBody: '<p id="copy">Initial</p>',
      responses: [
        {
          html: firstResponse,
          status: 200,
        },
        {
          html: '<html><head></head><body><p id="copy">Newest revision</p></body></html>',
          status: 200,
        },
      ],
    });

    send('html', [], 1);
    send('html', [], 2);

    await vi.waitFor(() => {
      expect(dom.window.fetch).toHaveBeenCalledTimes(2);
      expect(dom.window.document.querySelector('#copy').textContent)
        .toBe('Newest revision');
    });
    resolveFirstResponse(
      '<html><head></head><body><p id="copy">Older revision</p></body></html>',
    );
    await waitForUpdate();

    expect(dom.window.document.querySelector('#copy').textContent)
      .toBe('Newest revision');

    dom.window.close();
  });

  it('keeps a newer generation error visible when an older HTML fetch finishes later', async () => {
    let resolveOlderResponse;
    const olderResponse = new Promise((resolve) => {
      resolveOlderResponse = resolve;
    });
    const recoveredHtml =
      '<html><head></head><body><p id="copy">Recovered revision</p></body></html>';
    const { dom, send, sendMessage } = createWatchDom({
      initialBody: '<p id="copy">Last valid page</p>',
      responses: [
        {
          html: olderResponse,
          status: 200,
        },
        {
          html: recoveredHtml,
          status: 200,
        },
      ],
    });

    send('html', [], 1);
    await vi.waitFor(() => {
      expect(dom.window.fetch).toHaveBeenCalledTimes(1);
    });
    sendMessage({
      type: 'watch-error',
      message: 'The newer revision does not compile',
    });
    await vi.waitFor(() => {
      expect(dom.window.document.querySelector('#rettangoli-watch-error')?.textContent)
        .toContain('The newer revision does not compile');
    });

    resolveOlderResponse(
      '<html><head></head><body><p id="copy">Older revision</p></body></html>',
    );
    await waitForUpdate();

    expect(dom.window.document.querySelector('#copy').textContent)
      .toBe('Last valid page');
    expect(dom.window.document.querySelector('#rettangoli-watch-error')?.textContent)
      .toContain('The newer revision does not compile');

    send('html', [], 3);
    await vi.waitFor(() => {
      expect(dom.window.document.querySelector('#copy').textContent)
        .toBe('Recovered revision');
      expect(dom.window.document.querySelector('#rettangoli-watch-error')).toBeNull();
    });

    dom.window.close();
  });

  it('keeps the current DOM and surfaces generation errors until a valid update arrives', async () => {
    const { dom, send, sendMessage } = createWatchDom({
      initialBody: '<main id="content"><input id="field"></main>',
      nextHtml: '<html><head></head><body><main id="content"><input id="field"><p>Updated</p></main></body></html>',
      responses: [
        {
          html: '<html><body>Invalid response</body></html>',
          status: 500,
        },
        {
          html: '<html><head></head><body><main id="content"><input id="field"><p>Updated</p></main></body></html>',
          status: 200,
        },
      ],
    });
    const { document } = dom.window;
    const content = document.querySelector('#content');
    const input = document.querySelector('#field');
    input.value = 'unsaved state';
    input.focus();

    sendMessage({
      type: 'watch-error',
      message: 'Invalid Liquid template',
    });
    await waitForUpdate();

    expect(document.querySelector('#content')).toBe(content);
    expect(document.querySelector('#field')).toBe(input);
    expect(input.value).toBe('unsaved state');
    expect(document.activeElement).toBe(input);
    expect(document.querySelector('#rettangoli-watch-error')?.textContent)
      .toContain('Invalid Liquid template');

    send();
    await waitForUpdate();

    expect(document.querySelector('#rettangoli-watch-error')?.textContent)
      .toContain('Invalid Liquid template');
    expect(document.querySelector('#content')).toBe(content);
    expect(input.value).toBe('unsaved state');

    send();
    await waitForUpdate();

    expect(document.querySelector('#rettangoli-watch-error')).toBeNull();
    expect(document.querySelector('#content')).toBe(content);
    expect(input.value).toBe('unsaved state');
    expect(document.querySelector('#content p')?.textContent).toBe('Updated');

    dom.window.close();
  });

  it('builds a Vite HMR bridge around the same state-preserving client', () => {
    const source = createViteWatchClientModuleSource({
      eventName: 'rettangoli:test-update',
    });

    expect(source).toContain('"transport":"external"');
    expect(source).toContain('import.meta.hot.on("rettangoli:test-update"');
    expect(source).toContain('handleMessageData(data)');
    expect(source).toContain('morphBody(nextDocument.body)');
  });

  it('deep-clones a newly introduced client-preserved subtree', async () => {
    const { dom, send } = createWatchDom({
      initialBody: '<main id="content">Before</main><button id="runtime-action">Old location</button>',
      nextHtml: `<html><head></head><body>
        <main id="content">After</main>
        <section id="client-panel" data-rtgl-preserve>
          <button id="runtime-action">Ready</button>
        </section>
        <aside data-rtgl-preserve>
          <span class="runtime-note">Unkeyed subtree</span>
        </aside>
      </body></html>`,
    });

    send();
    await waitForUpdate();

    expect(dom.window.document.querySelector('#client-panel')
      ?.hasAttribute('data-rtgl-preserve')).toBe(true);
    expect(dom.window.document.querySelector('#runtime-action')?.textContent)
      .toBe('Ready');
    expect(dom.window.document.querySelectorAll('#runtime-action')).toHaveLength(1);
    expect(dom.window.document.querySelector('aside[data-rtgl-preserve] .runtime-note')
      ?.textContent).toBe('Unkeyed subtree');

    dom.window.close();
  });

  it('retains custom elements, uncontrolled controls, focus, selection, and scroll', async () => {
    const initialBody = `
      <stateful-box data-rtgl-key="counter" data-version="before">
        <input id="field" value="server-before">
        <div id="scroller"><span id="status">Before</span></div>
      </stateful-box>
      <p id="copy">Old copy</p>
      <div id="client-owned" data-rtgl-preserve><span id="runtime-child">User runtime</span></div>
    `;
    const nextHtml = `<!doctype html>
      <html lang="vi">
        <head>
          <title>After title</title>
          <meta name="description" content="after">
          <link rel="stylesheet" href="/after.css">
        </head>
        <body class="after" data-page="updated">
          <p id="copy">New copy</p>
          <section id="wrapper">
            <stateful-box data-rtgl-key="counter" data-version="after">
              <input id="field" value="server-after">
              <div id="scroller"><span id="status">After</span></div>
            </stateful-box>
          </section>
          <div id="client-owned" data-rtgl-preserve data-source="server"><span id="server-child">Server replacement</span></div>
        </body>
      </html>`;
    const { dom, send } = createWatchDom({
      initialBody,
      initialHead: `
        <title>Before title</title>
        <meta name="description" content="before">
        <link rel="stylesheet" href="/before.css">
      `,
      nextHtml,
    });
    const { document } = dom.window;
    const component = document.querySelector('stateful-box');
    const input = document.querySelector('#field');
    const scroller = document.querySelector('#scroller');
    const description = document.querySelector('meta[name="description"]');
    const runtimeHeadNode = document.createElement('meta');
    runtimeHeadNode.setAttribute('data-runtime-only', '');
    document.head.append(runtimeHeadNode);
    const clientOwned = document.querySelector('#client-owned');
    clientOwned.setAttribute('data-runtime', 'kept');

    component.storeState = { count: 7 };
    input.value = 'typed by user';
    input.focus();
    input.setSelectionRange(2, 7, 'forward');
    const addDocumentRange = vi.fn(() => input.setSelectionRange(0, 0));
    Object.defineProperty(document, 'getSelection', {
      configurable: true,
      value: () => ({
        addRange: addDocumentRange,
        getRangeAt: () => ({
          cloneRange: () => ({
            startContainer: input,
            endContainer: input,
          }),
        }),
        rangeCount: 1,
        removeAllRanges: vi.fn(),
      }),
    });
    scroller.scrollTop = 45;
    scroller.scrollLeft = 9;
    dom.window.scrollTo(12, 34);

    send();
    await waitForUpdate();

    expect(document.body.className).toBe('after');
    expect(document.body.dataset.page).toBe('updated');
    expect(document.documentElement.lang).toBe('vi');
    expect(document.querySelector('stateful-box')).toBe(component);
    expect(component.storeState).toEqual({ count: 7 });
    expect(component.dataset.version).toBe('after');
    expect(document.querySelector('#field')).toBe(input);
    expect(input.value).toBe('typed by user');
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(7);
    expect(addDocumentRange).not.toHaveBeenCalled();
    expect(document.querySelector('#scroller')).toBe(scroller);
    expect(scroller.scrollTop).toBe(45);
    expect(scroller.scrollLeft).toBe(9);
    expect(dom.window.scrollX).toBe(12);
    expect(dom.window.scrollY).toBe(34);
    expect(document.querySelector('#copy').textContent).toBe('New copy');
    expect(document.querySelector('#status').textContent).toBe('After');
    expect(document.querySelector('#client-owned').textContent).toBe('User runtime');
    expect(document.querySelector('#runtime-child')?.textContent).toBe('User runtime');
    expect(document.querySelector('#server-child')).toBeNull();
    expect(clientOwned.dataset.runtime).toBe('kept');
    expect(clientOwned.hasAttribute('data-source')).toBe(false);
    expect(document.title).toBe('After title');
    expect(document.querySelector('meta[name="description"]')).toBe(description);
    expect(description.content).toBe('after');
    expect(new URL(document.querySelector('link[rel="stylesheet"]').href).pathname).toBe('/after.css');
    expect(runtimeHeadNode.isConnected).toBe(true);
    expect(document.querySelectorAll('[data-rtgl-watch-client]')).toHaveLength(1);

    dom.window.close();
  });

  it('preserves client-owned head nodes that exist before watch initialization', async () => {
    const { dom, reconnect } = createWatchDom({
      initialHead: `
        <meta name="description" content="before">
        <meta name="runtime-state" content="client" data-rtgl-preserve>
        <link rel="stylesheet" href="/runtime.css" data-rtgl-preserve>
        <style data-rtgl-preserve>.runtime { color: red; }</style>
      `,
      initialBody: '<p id="copy">Before</p>',
      nextHtml: `<html><head>
        <meta name="description" content="after">
      </head><body><p id="copy">After</p></body></html>`,
    });
    const { document } = dom.window;
    const runtimeMeta = document.querySelector('meta[name="runtime-state"]');
    const runtimeLink = document.querySelector('link[data-rtgl-preserve]');
    const runtimeStyle = document.querySelector('style[data-rtgl-preserve]');

    await reconnect({ revision: 1 });

    expect(document.querySelector('meta[name="description"]').content).toBe('after');
    expect(document.querySelector('meta[name="runtime-state"]')).toBe(runtimeMeta);
    expect(document.querySelector('link[data-rtgl-preserve]')).toBe(runtimeLink);
    expect(document.querySelector('style[data-rtgl-preserve]')).toBe(runtimeStyle);
    expect(runtimeMeta.content).toBe('client');
    expect(runtimeLink.getAttribute('href')).toBe('/runtime.css');
    expect(runtimeStyle.textContent).toContain('color: red');
    expect(document.querySelector('#copy').textContent).toBe('After');
    dom.window.close();
  });

  it('does not reuse keyed runtime descendants from preserved subtrees', async () => {
    const { dom, send } = createWatchDom({
      initialBody: `
        <div id="client-owned" data-rtgl-preserve>
          <span id="shared-key">Runtime child</span>
        </div>
      `,
      nextHtml: `<html><head></head><body>
        <div id="client-owned" data-rtgl-preserve>
          <span>Server content must not replace the preserved subtree</span>
        </div>
        <p id="shared-key">Server-owned sibling</p>
      </body></html>`,
    });
    const { document } = dom.window;
    const preservedRoot = document.querySelector('#client-owned');
    const runtimeChild = preservedRoot.querySelector('#shared-key');

    send();
    await waitForUpdate();

    const serverSibling = document.body.querySelector(':scope > #shared-key');
    expect(document.querySelector('#client-owned')).toBe(preservedRoot);
    expect(preservedRoot.querySelector('#shared-key')).toBe(runtimeChild);
    expect(runtimeChild.textContent).toBe('Runtime child');
    expect(serverSibling).not.toBe(runtimeChild);
    expect(serverSibling.localName).toBe('p');
    expect(serverSibling.textContent).toBe('Server-owned sibling');
    dom.window.close();
  });

  it('restores select values after options are inserted and reordered', async () => {
    const { dom, send } = createWatchDom({
      initialBody: `<select id="choice">
        <option value="alpha">Alpha</option>
        <option value="beta">Beta</option>
        <option value="gamma">Gamma</option>
      </select>`,
      nextHtml: `<html><head></head><body><select id="choice">
        <option value="new">New</option>
        <option value="gamma">Gamma updated</option>
        <option value="alpha">Alpha updated</option>
        <option value="beta">Beta updated</option>
      </select></body></html>`,
    });
    const select = dom.window.document.querySelector('#choice');
    select.value = 'gamma';

    send();
    await waitForUpdate();

    expect(dom.window.document.querySelector('#choice')).toBe(select);
    expect(select.value).toBe('gamma');
    expect(select.selectedIndex).toBe(1);
    expect(select.selectedOptions[0].textContent).toBe('Gamma updated');
    dom.window.close();
  });

  it('restores multiple duplicate values by occurrence and falls back to index', async () => {
    const { dom, send } = createWatchDom({
      initialBody: `<select id="choice" multiple>
        <option value="duplicate">First duplicate</option>
        <option value="removed">Removed value</option>
        <option value="duplicate">Second duplicate</option>
        <option value="stable">Stable</option>
      </select>`,
      nextHtml: `<html><head></head><body><select id="choice" multiple>
        <option value="new">New first option</option>
        <option value="fallback">Index fallback</option>
        <option value="stable">Stable updated</option>
        <option value="duplicate">First duplicate updated</option>
        <option value="duplicate">Second duplicate updated</option>
      </select></body></html>`,
    });
    const select = dom.window.document.querySelector('#choice');
    select.options[1].selected = true;
    select.options[2].selected = true;
    select.options[3].selected = true;

    send();
    await waitForUpdate();

    expect(dom.window.document.querySelector('#choice')).toBe(select);
    expect(Array.from(select.selectedOptions, (option) => option.value)).toEqual([
      'fallback',
      'stable',
      'duplicate',
    ]);
    expect(Array.from(select.selectedOptions, (option) => option.textContent.trim())).toEqual([
      'Index fallback',
      'Stable updated',
      'Second duplicate updated',
    ]);
    dom.window.close();
  });

  it('replaces an incompatible keyed element without leaving a duplicate key', async () => {
    const { dom, send } = createWatchDom({
      initialBody: '<div id="changing-kind"><span>Before</span></div>',
      nextHtml: '<html><head></head><body><section id="changing-kind"><span>After</span></section></body></html>',
    });
    const oldElement = dom.window.document.querySelector('#changing-kind');

    send();
    await waitForUpdate();

    const matches = dom.window.document.querySelectorAll('#changing-kind');
    expect(matches).toHaveLength(1);
    expect(matches[0].localName).toBe('section');
    expect(matches[0].textContent).toBe('After');
    expect(oldElement.isConnected).toBe(false);
    dom.window.close();
  });

  it('unlocks and updates a preserved subtree when the source marker is removed', async () => {
    const { dom, send } = createWatchDom({
      initialBody: '<div id="client-owned" data-rtgl-preserve><span>Runtime copy</span></div>',
      nextHtml: '<html><head></head><body><div id="client-owned"><span>Server copy</span></div></body></html>',
    });
    const element = dom.window.document.querySelector('#client-owned');

    send();
    await waitForUpdate();

    expect(dom.window.document.querySelector('#client-owned')).toBe(element);
    expect(element.hasAttribute('data-rtgl-preserve')).toBe(false);
    expect(element.textContent).toBe('Server copy');
    dom.window.close();
  });

  it('updates existing and newly added template contents', async () => {
    const { dom, send } = createWatchDom({
      initialBody: '<template id="existing"><p>Before</p></template>',
      nextHtml: `<html><head></head><body>
        <template id="existing"><p>After</p><span>Added</span></template>
        <template id="new-template"><strong>New template content</strong></template>
      </body></html>`,
    });
    const existing = dom.window.document.querySelector('#existing');

    send();
    await waitForUpdate();

    expect(dom.window.document.querySelector('#existing')).toBe(existing);
    expect(existing.content.textContent).toContain('After');
    expect(existing.content.querySelector('span').textContent).toBe('Added');
    expect(
      dom.window.document.querySelector('#new-template').content.textContent,
    ).toContain('New template content');
    dom.window.close();
  });

  it('continues state restoration when an input changes to file type', async () => {
    const { dom, send } = createWatchDom({
      initialBody: '<input id="field" type="text"><p id="copy">Before</p>',
      nextHtml: '<html><head></head><body><input id="field" type="file"><p id="copy">After</p></body></html>',
    });
    const input = dom.window.document.querySelector('#field');
    const didUpdate = vi.fn();
    dom.window.addEventListener('rettangoli:watch-html-update', didUpdate);
    input.value = 'typed before type change';
    input.focus();

    send();
    await waitForUpdate();

    expect(dom.window.document.querySelector('#field')).toBe(input);
    expect(input.type).toBe('file');
    expect(input.value).toBe('');
    expect(dom.window.document.querySelector('#copy').textContent).toBe('After');
    expect(didUpdate).toHaveBeenCalledTimes(1);
    dom.window.close();
  });

  it('fetches and morphs after reconnecting so missed broadcasts cannot leave stale HTML', async () => {
    const { dom, reconnect } = createWatchDom({
      initialHead: '<link rel="stylesheet" href="https://cdn.example/theme.css">',
      initialBody: `<p id="copy">Before disconnect</p>
        <img id="local-image" src="/hero.png">
        <img id="external-image" src="https://cdn.example/hero.png">
        <img id="data-image" src="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==">
        <svg><use id="inline-icon" href="#icon"></use></svg>`,
      nextHtml: `<html>
        <head><link rel="stylesheet" href="https://cdn.example/theme.css"></head>
        <body><p id="copy">After reconnect</p>
          <img id="local-image" src="/hero.png">
          <img id="external-image" src="https://cdn.example/hero.png">
          <img id="data-image" src="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==">
          <svg><use id="inline-icon" href="#icon"></use></svg>
        </body>
      </html>`,
    });

    await reconnect({ revision: 1 });

    expect(dom.window.fetch).toHaveBeenCalledTimes(1);
    expect(dom.window.document.querySelector('#copy').textContent).toBe('After reconnect');
    expect(dom.window.document.querySelector('#local-image').src).toContain('__rtgl_watch_asset');
    expect(dom.window.document.querySelector('#external-image').getAttribute('src')).toBe(
      'https://cdn.example/hero.png',
    );
    expect(dom.window.document.querySelector('#data-image').getAttribute('src')).toBe(
      'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==',
    );
    expect(dom.window.document.querySelector('#inline-icon').getAttribute('href')).toBe('#icon');
    expect(dom.window.document.querySelector('link').href).toBe(
      'https://cdn.example/theme.css',
    );
    dom.window.close();
  });

  it('requests a full reload after reconnecting across a missed full update', async () => {
    const { dom, reconnect } = createWatchDom({
      initialRevision: 4,
      initialBody: '<p id="copy">Before disconnect</p>',
      nextHtml: '<html><head></head><body><p id="copy">Must not morph</p></body></html>',
    });
    const reloadReasons = [];
    dom.window.addEventListener('rettangoli:watch-full-reload', (event) => {
      reloadReasons.push(event.detail.reason);
      event.preventDefault();
    });

    await reconnect({ revision: 6, fullReloadRevision: 5 });

    expect(reloadReasons).toEqual(['missed-full-update']);
    expect(dom.window.fetch).not.toHaveBeenCalled();
    expect(dom.window.document.querySelector('#copy').textContent).toBe('Before disconnect');
    dom.window.close();
  });

  it('requests a full reload when reconnecting to a restarted watcher', async () => {
    const { dom, reconnect } = createWatchDom({
      initialRevision: 9,
      initialSessionId: 'watcher-before-restart',
      initialBody: '<p id="copy">Old runtime</p>',
      nextHtml: '<html><head></head><body><p id="copy">New runtime</p></body></html>',
    });
    const reloadReasons = [];
    dom.window.addEventListener('rettangoli:watch-full-reload', (event) => {
      reloadReasons.push(event.detail.reason);
      event.preventDefault();
    });

    await reconnect({
      revision: 0,
      fullReloadRevision: 0,
      sessionId: 'watcher-after-restart',
    });

    expect(reloadReasons).toEqual(['watcher-restarted']);
    expect(dom.window.fetch).not.toHaveBeenCalled();
    expect(dom.window.document.querySelector('#copy').textContent).toBe('Old runtime');
    dom.window.close();
  });

  it('accepts the initial handshake from the epoch that served the page', async () => {
    const { dom, handshake } = createWatchDom({
      initialRevision: 7,
      initialSessionId: 'serving-watcher',
      initialBody: '<p id="copy">Fresh page</p>',
      nextHtml: '<html><head></head><body><p id="copy">Unexpected sync</p></body></html>',
    });
    const reloadReasons = [];
    dom.window.addEventListener('rettangoli:watch-full-reload', (event) => {
      reloadReasons.push(event.detail.reason);
      event.preventDefault();
    });

    await handshake({ revision: 7, fullReloadRevision: 7 });

    expect(reloadReasons).toEqual([]);
    expect(dom.window.fetch).not.toHaveBeenCalled();
    expect(dom.window.document.querySelector('#copy').textContent).toBe('Fresh page');
    dom.window.close();
  });

  it('retries a failed HTML update after a later asset revision and reconnect', async () => {
    const afterHtml = '<html><head></head><body><p id="copy">Recovered HTML</p><img src="/hero.png"></body></html>';
    const { dom, reconnect, send } = createWatchDom({
      initialRevision: 1,
      initialBody: '<p id="copy">Stale HTML</p><img src="/hero.png">',
      nextHtml: afterHtml,
      responses: [
        { status: 500, html: 'Build unavailable' },
        { status: 200, html: afterHtml },
      ],
    });
    const consoleError = vi.spyOn(dom.window.console, 'error').mockImplementation(() => {});

    send('html', [], 2);
    await waitForUpdate();
    send('assets', ['/hero.png'], 3);
    await waitForUpdate();
    await reconnect({ revision: 3 });

    expect(dom.window.fetch).toHaveBeenCalledTimes(2);
    expect(dom.window.document.querySelector('#copy').textContent).toBe('Recovered HTML');
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
    dom.window.close();
  });

  it('refreshes a changed stylesheet without fetching or morphing the page', async () => {
    const { dom, send } = createWatchDom({
      initialBody: '<stateful-box id="component"></stateful-box>',
      initialHead: '<link rel="stylesheet" href="/theme.css">',
      nextHtml: '<html><head></head><body></body></html>',
    });
    const component = dom.window.document.querySelector('#component');

    send('assets', ['/theme.css']);
    await waitForUpdate();

    const stylesheets = dom.window.document.querySelectorAll('link[rel="stylesheet"]');
    expect(stylesheets).toHaveLength(2);
    expect(new URL(stylesheets[1].href).searchParams.has('__rtgl_watch_asset')).toBe(true);
    expect(dom.window.fetch).not.toHaveBeenCalled();
    expect(dom.window.document.querySelector('#component')).toBe(component);
    dom.window.close();
  });

  it('cache-busts only the changed responsive-image candidate', async () => {
    const { dom, send } = createWatchDom({
      initialBody: '<img id="hero" srcset="/hero.webp 1x, /hero@2x.webp 2x">',
      nextHtml: '<html><head></head><body></body></html>',
    });

    send('assets', ['/hero@2x.webp']);
    await waitForUpdate();

    const srcset = dom.window.document.querySelector('#hero').getAttribute('srcset');
    expect(srcset).toContain('/hero.webp 1x');
    expect(srcset).toContain('/hero@2x.webp?__rtgl_watch_asset=');
    expect(dom.window.fetch).not.toHaveBeenCalled();
    dom.window.close();
  });

  it('requests a full reload instead of morphing changed executable scripts', async () => {
    const { dom, send } = createWatchDom({
      initialBody: '<p id="copy">Before</p>',
      nextHtml: `<!doctype html><html><head><script type="module" src="/next.js"></script></head><body><p id="copy">After</p></body></html>`,
    });
    const reloadReasons = [];
    dom.window.addEventListener('rettangoli:watch-full-reload', (event) => {
      reloadReasons.push(event.detail.reason);
      event.preventDefault();
    });

    send();
    await waitForUpdate();

    expect(reloadReasons).toEqual(['script-change']);
    expect(dom.window.document.querySelector('#copy').textContent).toBe('Before');
    dom.window.close();
  });

  it('requests a full reload when the current generated route no longer exists', async () => {
    const { dom, send } = createWatchDom({
      initialBody: '<p id="copy">Current route</p>',
      nextHtml: 'Not found',
      responseStatus: 404,
    });
    const reloadReasons = [];
    dom.window.addEventListener('rettangoli:watch-full-reload', (event) => {
      reloadReasons.push(event.detail.reason);
      event.preventDefault();
    });

    send();
    await waitForUpdate();

    expect(reloadReasons).toEqual(['route-unavailable']);
    expect(dom.window.document.querySelector('#copy').textContent).toBe('Current route');
    dom.window.close();
  });

  it('requests a full reload for changed import maps inside template content', async () => {
    const initialBody = `<template id="loader"><script type="importmap">
      {"imports":{"app":"/v1.js"}}
    </script></template><p id="copy">Before</p>`;
    const { dom, send } = createWatchDom({
      initialBody,
      nextHtml: `<html><head></head><body><template id="loader"><script type="importmap">
        {"imports":{"app":"/v2.js"}}
      </script></template><p id="copy">After</p></body></html>`,
    });
    const reloadReasons = [];
    dom.window.addEventListener('rettangoli:watch-full-reload', (event) => {
      reloadReasons.push(event.detail.reason);
      event.preventDefault();
    });

    send();
    await waitForUpdate();

    expect(reloadReasons).toEqual(['script-change']);
    expect(dom.window.document.querySelector('#copy').textContent).toBe('Before');
    expect(
      dom.window.document.querySelector('#loader').content.textContent,
    ).toContain('/v1.js');
    dom.window.close();
  });

  it('requests a full reload when any executable script attribute changes', async () => {
    const { dom, send } = createWatchDom({
      initialHead: '<script src="/app.js" data-mode="before" integrity="sha256-before"></script>',
      initialBody: '<p id="copy">Before</p>',
      nextHtml: `<html><head>
        <script integrity="sha256-before" data-mode="after" src="/app.js"></script>
      </head><body><p id="copy">After</p></body></html>`,
    });
    const reloadReasons = [];
    dom.window.addEventListener('rettangoli:watch-full-reload', (event) => {
      reloadReasons.push(event.detail.reason);
      event.preventDefault();
    });

    send();
    await waitForUpdate();

    expect(reloadReasons).toEqual(['script-change']);
    expect(dom.window.document.querySelector('#copy').textContent).toBe('Before');
    dom.window.close();
  });

  it('does not reload when executable script attributes are only reordered', async () => {
    const { dom, send } = createWatchDom({
      initialHead: '<script src="/app.js" data-mode="same" integrity="sha256-same"></script>',
      initialBody: '<p id="copy">Before</p>',
      nextHtml: `<html><head>
        <script integrity="sha256-same" data-mode="same" src="/app.js"></script>
      </head><body><p id="copy">After</p></body></html>`,
    });
    const reloadReasons = [];
    dom.window.addEventListener('rettangoli:watch-full-reload', (event) => {
      reloadReasons.push(event.detail.reason);
      event.preventDefault();
    });

    send();
    await waitForUpdate();

    expect(reloadReasons).toEqual([]);
    expect(dom.window.document.querySelector('#copy').textContent).toBe('After');
    dom.window.close();
  });

  it('requests a full reload when base href changes a relative script source', async () => {
    const { dom, send } = createWatchDom({
      initialHead: '<base href="/runtime-v1/"><script src="app.js"></script>',
      initialBody: '<p id="copy">Before</p>',
      nextHtml: `<html><head>
        <base href="/runtime-v2/"><script src="app.js"></script>
      </head><body><p id="copy">After</p></body></html>`,
    });
    const reloadReasons = [];
    dom.window.addEventListener('rettangoli:watch-full-reload', (event) => {
      reloadReasons.push(event.detail.reason);
      event.preventDefault();
    });

    send();
    await waitForUpdate();

    expect(reloadReasons).toEqual(['script-change']);
    expect(dom.window.document.querySelector('#copy').textContent).toBe('Before');
    dom.window.close();
  });

  it('requests a full reload when base href changes with an inline executable script', async () => {
    const importMap = '<script type="importmap">{"imports":{"app":"./app.js"}}</script>';
    const { dom, send } = createWatchDom({
      initialHead: `<base href="/runtime-v1/">${importMap}`,
      initialBody: '<p id="copy">Before</p>',
      nextHtml: `<html><head>
        <base href="/runtime-v2/">${importMap}
      </head><body><p id="copy">After</p></body></html>`,
    });
    const reloadReasons = [];
    dom.window.addEventListener('rettangoli:watch-full-reload', (event) => {
      reloadReasons.push(event.detail.reason);
      event.preventDefault();
    });

    send();
    await waitForUpdate();

    expect(reloadReasons).toEqual(['script-change']);
    expect(dom.window.document.querySelector('#copy').textContent).toBe('Before');
    dom.window.close();
  });

  it('requests a full reload when the document type changes', async () => {
    const { dom, send } = createWatchDom({
      initialBody: '<p id="copy">Standards document</p>',
      nextHtml: `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
        "http://www.w3.org/TR/html4/loose.dtd">
        <html><head></head><body><p id="copy">Different document mode</p></body></html>`,
    });
    const reloadReasons = [];
    dom.window.addEventListener('rettangoli:watch-full-reload', (event) => {
      reloadReasons.push(event.detail.reason);
      event.preventDefault();
    });

    send();
    await waitForUpdate();

    expect(reloadReasons).toEqual(['doctype-change']);
    expect(dom.window.document.querySelector('#copy').textContent).toBe('Standards document');
    dom.window.close();
  });
});
