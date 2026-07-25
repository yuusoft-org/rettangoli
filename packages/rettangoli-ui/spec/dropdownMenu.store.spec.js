import { describe, expect, it } from 'vitest';
import {
  closeSubmenusFromDepth,
  getItemAtIndexPath,
  openSubmenu,
  selectViewData,
  setActiveIndex,
} from '../src/components/dropdown-menu/dropdown-menu.store.js';

describe('rtgl-dropdown-menu store', () => {
  it('normalizes section rows and keeps label as a backward-compatible alias', () => {
    const viewData = selectViewData({
      props: {
        items: [
          { type: 'section', label: 'File' },
          { type: 'label', label: 'Legacy Section' },
          { id: 'open', label: 'Open', shortcut: 'Cmd+O' },
          { type: 'separator' },
        ],
      },
    });

    expect(viewData.items[0].type).toBe('section');
    expect(viewData.items[0].isSection).toBe(true);
    expect(viewData.items[1].type).toBe('section');
    expect(viewData.items[1].isSection).toBe(true);
    expect(viewData.items[2].isItem).toBe(true);
    expect(viewData.items[2].suffixText).toBe('Cmd+O');
    expect(viewData.items[3].isSeparator).toBe(true);
  });

  it('renders only the open nested branch and assigns stable index paths', () => {
    const items = [
      { id: 'new', label: 'New' },
      {
        id: 'export',
        label: 'Export',
        href: '/ignored-for-submenu',
        items: [
          { id: 'png', label: 'PNG' },
          {
            id: 'advanced',
            label: 'Advanced',
            items: [
              { id: 'optimized', label: 'Optimized' },
            ],
          },
        ],
      },
    ];
    const viewData = selectViewData({
      props: { items, w: '240' },
      state: {
        openIndexPath: [1, 1],
        activeIndexByDepth: [1, 1, 0],
      },
    });

    expect(viewData.panels).toHaveLength(3);
    expect(viewData.panels[0].items[1]).toMatchObject({
      bgc: 'mu',
      hasSubmenu: true,
      hasHref: false,
      indexPath: [1],
      isSubmenuOpen: true,
      optionId: 'optionD0I1',
    });
    expect(viewData.panels[1].items[1]).toMatchObject({
      bgc: 'mu',
      indexPath: [1, 1],
      isSubmenuOpen: true,
      childPanelId: 'menuPanelD2',
    });
    expect(viewData.panels[2].items[0]).toMatchObject({
      bgc: 'ac',
      indexPath: [1, 1, 0],
    });
    expect(viewData.panels[1].panelAttrString).toContain('slot="floating"');
  });

  it('stops rendering at an invalid or disabled open branch', () => {
    const viewData = selectViewData({
      props: {
        items: [
          {
            label: 'Disabled parent',
            disabled: true,
            items: [{ label: 'Never rendered' }],
          },
        ],
      },
      state: {
        openIndexPath: [0],
        activeIndexByDepth: [],
      },
    });

    expect(viewData.panels).toHaveLength(1);
  });

  it('updates and truncates submenu interaction state by depth', () => {
    const state = {
      openIndexPath: [],
      activeIndexByDepth: [],
    };

    openSubmenu({ state }, { depth: 0, index: 2, childActiveIndex: 1 });
    openSubmenu({ state }, { depth: 1, index: 1, childActiveIndex: 0 });
    expect(state).toEqual({
      openIndexPath: [2, 1],
      activeIndexByDepth: [2, 1, 0],
    });

    setActiveIndex({ state }, { depth: 1, index: 3 });
    expect(state.openIndexPath).toEqual([2]);
    expect(state.activeIndexByDepth).toEqual([2, 3]);

    closeSubmenusFromDepth({ state }, { depth: 1 });
    expect(state.openIndexPath).toEqual([2]);
    expect(state.activeIndexByDepth).toEqual([2, 3]);
  });

  it('resolves arbitrary-depth items from an index path', () => {
    const leaf = { id: 'leaf', label: 'Leaf' };
    const items = [
      {
        label: 'One',
        items: [
          {
            label: 'Two',
            items: [leaf],
          },
        ],
      },
    ];

    expect(getItemAtIndexPath(items, [0, 0, 0])).toBe(leaf);
    expect(getItemAtIndexPath(items, [0, 4])).toBeUndefined();
  });

  it('keeps disabled item rows in the roving focus order', () => {
    const viewData = selectViewData({
      props: {
        items: [
          { type: 'section', label: 'Actions' },
          { id: 'disabled', label: 'Unavailable', disabled: true },
          { id: 'enabled', label: 'Available' },
        ],
      },
      state: {
        openIndexPath: [],
        activeIndexByDepth: [],
      },
    });

    expect(viewData.items[1]).toMatchObject({
      bgc: 'ac',
      isDisabled: true,
      isActive: true,
      tabIndex: '0',
      optionId: 'optionD0I1',
    });
    expect(viewData.items[2].tabIndex).toBe('-1');
  });

  it('keeps quote-containing accessible labels as unescaped binding values', () => {
    const ariaLabel = 'Project "Save As"';
    const viewData = selectViewData({
      props: {
        ariaLabel,
        items: [{ id: 'save-as', label: 'Save as' }],
      },
    });

    expect(viewData.menuLabel).toBe(ariaLabel);
    expect(viewData.panels[0].menuLabel).toBe(ariaLabel);
    expect(viewData.panels[0].panelAttrString).not.toContain('aria-label');
  });
});
