# Overlay Scrollbar Architecture

`rtgl-view` and `rtgl-grid` expose one scrollbar behavior. Every effective `sh` / `sv` axis uses native browser scrolling with a Rettangoli-painted overlay track and thumb. There is no opt-in scrollbar primitive and no browser-painted alternative.

"Native scrolling" refers to the scrolling engine: wheel, touch, keyboard, momentum, snapping, programmatic methods, host `scrollTop` / `scrollLeft`, dimensions, and host `scroll` events remain native. The visible track and thumb are Rettangoli elements.

## Contract

- Hide the entire browser-painted scrollbar. Never try to preserve its thumb while selectively suppressing platform arrow buttons.
- Scope that suppression to declared `sh` / `sv` surfaces. Unrelated document and CSS-driven overflow keeps its normal browser scrollbar.
- Keep the custom-element host as the actual overflow scroller.
- Scrolling hosts establish a positioning context for the out-of-flow overlay when `pos` is otherwise unset, so absolutely positioned children use the scrolling host as their containing block. Explicit responsive `pos` values still control the host's own positioning mode.
- Render only enabled axes that genuinely overflow.
- A single effective axis clips the opposite axis. Base and responsive flags compose independently, so `sh sm-sv` enables both axes at the `sm` breakpoint.
- Overlay the scrollport with zero layout gutter and no arrow controls.
- Use a 4px painted track/thumb inset 2px from the outer scrollport edge with a 10px radius and 60% / 70% / 80% normal, hover, and active opacity. Keep it inside a larger edge-aligned transparent pointer target. These visual dimensions must not become content padding or a layout gutter.
- Keep overlays hidden at rest, reveal them on host mouse hover, and keep them visible during pointer-captured dragging.
- `hsb` and its responsive variants keep visuals hidden without disabling scrolling.
- Use `--scrollbar-size`, `--scrollbar-track`, `--scrollbar-thumb`, and `--scrollbar-thumb-hover`; do not hard-code component or test colors.

## Implementation

The shared controller lives in `src/common/overlayScrollbar.js` and is instantiated by both primitives. It creates its shadow layer, listeners, and observers lazily only after the host declares `sh` / `sv` or a responsive variant. Its shadow layer is absolutely positioned and out of flex/grid flow. A content-sized layer contains a sticky, scrollport-sized frame; tracks and thumbs are positioned inside that frame.

Before measuring content, the controller collapses the overlay so it cannot inflate `scrollWidth` or `scrollHeight`. It then:

1. reads the effective responsive axis and `hsb` flags;
2. measures host client and scroll dimensions;
3. renders only overflowing axes;
4. derives thumb length from `viewport / content` with a minimum hit-friendly length;
5. derives thumb position from the host's native scroll offset;
6. observes host/content resize, light-DOM mutation, slot changes, loads, and viewport changes;
7. writes directly to the host's native scroll offset while a thumb is dragged.

The overlay layer sits above the optional link overlay, but only visible tracks receive pointer events. Wheel, touch, and keyboard input continue to target the native host scroller.

## Why CSS Alone Is Not Used

Classic and overlay scrollbar geometry is selected by the browser/OS, and Chromium engineers state that webpages cannot force overlay mode. Styling the legacy WebKit scrollbar width can also turn an available overlay scrollbar into a classic layout-consuming one. See [CSS Overflow](https://drafts.csswg.org/css-overflow/#scrollbar-gutter-property), [Chrome's scrollbar styling guide](https://developer.chrome.com/docs/css-ui/scrollbar-styling), and the [Chromium `overflow: overlay` decision](https://groups.google.com/a/chromium.org/g/blink-dev/c/YEWynF2WZBM).

This architecture follows the production pattern used by [Radix Scroll Area](https://www.radix-ui.com/primitives/docs/components/scroll-area), [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area), and [OverlayScrollbars](https://kingsora.github.io/OverlayScrollbars/): preserve native scrolling mechanics, hide native paint, and synchronize overlay visuals.

## Verification

Automated VT coverage must include vertical, horizontal, bidirectional, responsive axis composition, and grid cases. Assert idle/hover visibility, zero gutter after subtracting borders, thin visible thumbs, no arrow elements, out-of-flow grid/flex geometry, scroll-event delivery, native wheel/programmatic scrolling, thumb synchronization, pointer-drag cleanup and event isolation, inherited RTL updates, and responsive `hsb` changes. Also verify that a view without `sh` / `sv` creates no overlay and does not have its browser scrollbar suppressed.

Run:

```bash
bun run test
bun run vt:generate
rtgl vt screenshot --headed --folder primitives/view --isolation strict
rtgl vt screenshot --headed --folder primitives/grid --isolation strict
```

Manually verify content resize/mutation and disconnect/reconnect behavior in both Chromium and qutebrowser. Browser-native gutter and arrow differences are irrelevant because the browser-painted rail must remain completely hidden.
