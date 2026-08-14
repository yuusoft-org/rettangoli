import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const helperSource = await readFile(
  new URL('../sitekit/public/docs-sidebar-scroll.js', import.meta.url),
  'utf8',
);

test('hides stored desktop state before the sidebar can paint', () => {
  const styleChanges = [];
  const context = {
    document: {
      currentScript: {
        getAttribute(name) {
          assert.equal(name, 'data-docs-sidebar-restore-scope');
          return '/docs';
        },
      },
      documentElement: {
        style: {
          removeProperty(name) {
            styleChanges.push(['remove', name]);
          },
          setProperty(name, value) {
            styleChanges.push(['set', name, value]);
          },
        },
      },
    },
    window: {
      sessionStorage: {
        getItem(key) {
          assert.equal(key, 'rtgl:docs-sidebar:/docs:desktop');
          return '640';
        },
      },
      setTimeout() {},
    },
  };

  vm.runInNewContext(helperSource, context);

  assert.deepEqual(styleChanges, [
    ['set', '--rtgl-docs-sidebar-desktop-visibility', 'hidden'],
  ]);
});

test('restores the desktop sidebar without waiting for a paint frame', async () => {
  const restoredPositions = [];
  let animationFrameCalls = 0;
  const sidebar = {
    getAttribute(name) {
      return {
        'data-docs-sidebar': 'desktop',
        'data-docs-sidebar-scope': '/docs',
      }[name] ?? null;
    },
    getScrollPosition() {
      return { top: 0 };
    },
    setScrollPosition(position) {
      restoredPositions.push(position);
    },
    addEventListener() {},
  };
  const context = {
    Array,
    Number,
    WeakSet,
    customElements: {
      whenDefined() {
        return Promise.resolve();
      },
    },
    document: {
      currentScript: null,
      documentElement: {
        style: {
          removeProperty() {},
        },
      },
      getElementById() {
        return null;
      },
      querySelectorAll() {
        return [sidebar];
      },
    },
    window: {
      addEventListener() {},
      requestAnimationFrame() {
        animationFrameCalls += 1;
      },
      sessionStorage: {
        getItem(key) {
          assert.equal(key, 'rtgl:docs-sidebar:/docs:desktop');
          return '640';
        },
        setItem() {},
      },
    },
  };

  vm.runInNewContext(helperSource, context);
  await Promise.resolve();

  assert.equal(animationFrameCalls, 0);
  assert.equal(restoredPositions.length, 1);
  assert.equal(restoredPositions[0].top, 640);
});

test('keeps the mobile position when navigation hides the menu', async () => {
  const sidebarListeners = [];
  const buttonListeners = [];
  const windowListeners = new Map();
  const storage = new Map();
  let overlayHidden = true;
  let scrollTop = 0;
  const sidebar = {
    getAttribute(name) {
      return {
        'data-docs-sidebar': 'mobile',
        'data-docs-sidebar-scope': '/docs',
      }[name] ?? null;
    },
    getScrollPosition() {
      return { top: overlayHidden ? 0 : scrollTop };
    },
    setScrollPosition(position) {
      scrollTop = position.top;
    },
    addEventListener(type, listener, options) {
      sidebarListeners.push({ type, listener, options });
    },
  };
  const mobileMenuButton = {
    addEventListener(type, listener, options) {
      buttonListeners.push({ type, listener, options });
    },
  };
  const mobileOverlay = {
    contains(candidate) {
      return candidate === sidebar;
    },
    hasAttribute(name) {
      assert.equal(name, 'hidden');
      return overlayHidden;
    },
  };
  const context = {
    Array,
    Number,
    WeakSet,
    customElements: {
      whenDefined() {
        return Promise.resolve();
      },
    },
    document: {
      currentScript: null,
      documentElement: {
        style: {
          removeProperty() {},
        },
      },
      getElementById(id) {
        return {
          'mobile-menu-btn': mobileMenuButton,
          'mobile-nav-overlay': mobileOverlay,
        }[id] ?? null;
      },
      querySelectorAll() {
        return [sidebar];
      },
    },
    window: {
      addEventListener(type, listener) {
        windowListeners.set(type, listener);
      },
      requestAnimationFrame() {
        assert.fail('Mobile restoration must not wait for a paint frame.');
      },
      sessionStorage: {
        getItem(key) {
          return storage.get(key) ?? null;
        },
        setItem(key, value) {
          storage.set(key, value);
        },
      },
    },
  };

  vm.runInNewContext(helperSource, context);
  await Promise.resolve();

  const itemClick = sidebarListeners.find(({ type }) => type === 'item-click');
  assert.equal(itemClick.options, true);

  overlayHidden = false;
  const openRestore = buttonListeners.find(({ options }) => options !== true);
  openRestore.listener();
  scrollTop = 900;
  itemClick.listener();
  assert.equal(storage.get('rtgl:docs-sidebar:/docs:mobile'), '900');

  overlayHidden = true;
  windowListeners.get('pagehide')();
  assert.equal(storage.get('rtgl:docs-sidebar:/docs:mobile'), '900');

  storage.clear();
  overlayHidden = false;
  const closeSave = buttonListeners.find(({ options }) => options === true);
  closeSave.listener();
  assert.equal(storage.get('rtgl:docs-sidebar:/docs:mobile'), '900');
});
