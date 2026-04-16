import { describe, expect, it } from 'vitest';
import { createInitialState, selectViewData } from '../src/components/select/select.store.js';

describe('rtgl-select store', () => {
  it('normalizes icon and trailing text metadata for options and the selected trigger', () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: {
        selectedValue: 'copy',
        options: [
          { value: 'copy', label: 'Copy', icon: 'text', shortcut: 'Cmd+C' },
          { value: 'paste', label: 'Paste', suffixText: 'Beta' },
        ],
      },
    });

    expect(viewData.hasSelectedIcon).toBe(true);
    expect(viewData.selectedIcon).toBe('text');
    expect(viewData.hasSelectedSuffixText).toBe(true);
    expect(viewData.selectedSuffixText).toBe('Cmd+C');
    expect(viewData.options[0].hasIconSlot).toBe(true);
    expect(viewData.options[0].hasIcon).toBe(true);
    expect(viewData.options[1].hasIconSlot).toBe(true);
    expect(viewData.options[1].hasIcon).toBe(false);
    expect(viewData.options[1].hasSuffixText).toBe(true);
    expect(viewData.options[1].suffixText).toBe('Beta');
  });

  it('prefers shortcut over suffixText and preserves placeholder state when nothing matches', () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: {
        placeholder: 'Pick one',
        selectedValue: 'missing',
        options: [
          { value: 'alpha', label: 'Alpha', shortcut: 'A', suffixText: 'Alpha suffix' },
        ],
      },
    });

    expect(viewData.selectedLabel).toBe('Pick one');
    expect(viewData.selectedLabelColor).toBe('mu-fg');
    expect(viewData.hasSelectedIcon).toBe(false);
    expect(viewData.hasSelectedSuffixText).toBe(false);
    expect(viewData.options[0].suffixText).toBe('A');
  });

  it('supports flat section and separator rows without breaking item selection', () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: {
        selectedValue: undefined,
        options: [
          { type: 'section', label: 'Common' },
          { value: undefined, label: 'None' },
          { type: 'separator' },
          { value: 'advanced', label: 'Advanced', icon: 'info', suffixText: 'Beta' },
        ],
      },
    });

    expect(viewData.selectedLabel).toBe('None');
    expect(viewData.options[0].isSection).toBe(true);
    expect(viewData.options[1].isItem).toBe(true);
    expect(viewData.options[1].isSelected).toBe(true);
    expect(viewData.options[2].isSeparator).toBe(true);
    expect(viewData.options[3].hasIconSlot).toBe(true);
  });
});
