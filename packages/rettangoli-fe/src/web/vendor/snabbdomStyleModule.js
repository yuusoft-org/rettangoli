/**
 * Vendored from snabbdom 3.6.2 — `snabbdom/build/modules/style.js`.
 *
 * Copyright (c) 2015 Simon Friis Vindum
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * WHY THIS EXISTS
 *
 * Snabbdom's published style module dereferences a bare `window` at MODULE
 * SCOPE:
 *
 *     const raf = typeof (window === null || window === void 0
 *       ? void 0
 *       : window.requestAnimationFrame) === "function" ? ... : setTimeout;
 *
 * `typeof (...)` looks safe but the parenthesised expression is evaluated
 * first, so on a platform without `window` this throws `ReferenceError` at
 * *import* time — not at call time. Because `createWebPatch.js` imports it
 * statically, `import("@rettangoli/fe")` was unusable in Node, which blocked
 * every Node-side tool: HTML golden tests, static analysis over real output,
 * and any server renderer.
 *
 * Making the patch lazy does NOT help — the failure is module evaluation, not
 * invocation.
 *
 * THE DELTA vs upstream is exactly two lines: `raf` is resolved lazily and
 * reads `globalThis.window` instead of a bare `window`. Everything else is a
 * byte-faithful copy so runtime behaviour — including the `delayed` / `remove`
 * / `destroy` transition hooks — is unchanged in a browser.
 *
 * Keep this in sync if snabbdom is upgraded. `test/web/style-module.test.js`
 * pins the observable behaviour.
 */

/**
 * Resolved on first use rather than at module load. In a browser this is
 * `window.requestAnimationFrame`; anywhere else it degrades to `setTimeout`,
 * exactly as upstream does for non-rAF environments.
 */
let resolvedRaf;
const raf = (callback) => {
  if (resolvedRaf === undefined) {
    const win = globalThis.window;
    resolvedRaf =
      typeof win?.requestAnimationFrame === "function"
        ? win.requestAnimationFrame.bind(win)
        : setTimeout;
  }
  return resolvedRaf(callback);
};

const nextFrame = function (fn) {
  raf(function () {
    raf(fn);
  });
};

let reflowForced = false;

function setNextFrame(obj, prop, val) {
  nextFrame(function () {
    obj[prop] = val;
  });
}

function updateStyle(oldVnode, vnode) {
  let cur;
  let name;
  const elm = vnode.elm;
  let oldStyle = oldVnode.data.style;
  let style = vnode.data.style;
  if (!oldStyle && !style) return;
  if (oldStyle === style) return;
  oldStyle = oldStyle || {};
  style = style || {};
  const oldHasDel = "delayed" in oldStyle;
  for (name in oldStyle) {
    if (!(name in style)) {
      if (name[0] === "-" && name[1] === "-") {
        elm.style.removeProperty(name);
      } else {
        elm.style[name] = "";
      }
    }
  }
  for (name in style) {
    cur = style[name];
    if (name === "delayed" && style.delayed) {
      for (const name2 in style.delayed) {
        cur = style.delayed[name2];
        if (!oldHasDel || cur !== oldStyle.delayed[name2]) {
          setNextFrame(elm.style, name2, cur);
        }
      }
    } else if (name !== "remove" && cur !== oldStyle[name]) {
      if (name[0] === "-" && name[1] === "-") {
        elm.style.setProperty(name, cur);
      } else {
        elm.style[name] = cur;
      }
    }
  }
}

function applyDestroyStyle(vnode) {
  let style;
  let name;
  const elm = vnode.elm;
  const s = vnode.data.style;
  if (!s || !(style = s.destroy)) return;
  for (name in style) {
    elm.style[name] = style[name];
  }
}

function applyRemoveStyle(vnode, rm) {
  const s = vnode.data.style;
  if (!s || !s.remove) {
    rm();
    return;
  }
  if (!reflowForced) {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    vnode.elm.offsetLeft;
    reflowForced = true;
  }
  let name;
  const elm = vnode.elm;
  let i = 0;
  const style = s.remove;
  let amount = 0;
  const applied = [];
  for (name in style) {
    applied.push(name);
    elm.style[name] = style[name];
  }
  const compStyle = getComputedStyle(elm);
  const props = compStyle["transition-property"].split(", ");
  for (; i < props.length; ++i) {
    if (applied.indexOf(props[i]) !== -1) amount++;
  }
  elm.addEventListener("transitionend", function (ev) {
    if (ev.target === elm) --amount;
    if (amount === 0) rm();
  });
}

function forceReflow() {
  reflowForced = false;
}

export const styleModule = {
  pre: forceReflow,
  create: updateStyle,
  update: updateStyle,
  destroy: applyDestroyStyle,
  remove: applyRemoveStyle,
};

export default styleModule;
