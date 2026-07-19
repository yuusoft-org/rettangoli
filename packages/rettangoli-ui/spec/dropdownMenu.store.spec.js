import { describe, expect, it } from 'vitest';
import { selectViewData } from '../src/components/dropdown-menu/dropdown-menu.store.js';

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
});
