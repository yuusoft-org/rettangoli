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
    expect(viewData.options[0].hasLeadingVisualSlot).toBe(true);
    expect(viewData.options[0].hasIcon).toBe(true);
    expect(viewData.options[1].hasLeadingVisualSlot).toBe(true);
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
    expect(viewData.options[3].hasLeadingVisualSlot).toBe(true);
  });

  it('normalizes image defaults and prefers images over icons in the trigger and options', () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: {
        selectedValue: 'ada',
        options: [
          {
            value: 'ada',
            label: 'Ada',
            imageSrc: '/avatars/ada.svg',
            icon: 'info',
          },
          { value: 'grace', label: 'Grace', icon: 'text' },
          { value: 'linus', label: 'Linus' },
        ],
      },
    });

    expect(viewData).toMatchObject({
      selectedImageSrc: '/avatars/ada.svg',
      hasSelectedImage: true,
      hasSelectedIcon: false,
      imageSize: 20,
      imageBorderRadius: 'sm',
      imageBorderColor: '',
      imageHasBorder: false,
      imageFit: 'cov',
    });
    expect(viewData.options[0]).toMatchObject({
      hasLeadingVisualSlot: true,
      leadingVisualSize: 20,
      imageSrc: '/avatars/ada.svg',
      hasImage: true,
      hasIcon: false,
    });
    expect(viewData.options[1]).toMatchObject({
      hasLeadingVisualSlot: true,
      leadingVisualSize: 20,
      hasImage: false,
      hasIcon: true,
    });
    expect(viewData.options[2]).toMatchObject({
      hasLeadingVisualSlot: true,
      leadingVisualSize: 20,
      hasImage: false,
      hasIcon: false,
    });
  });

  it('applies one custom image style to every image slot', () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: {
        selectedValue: 'ada',
        image: {
          size: 24,
          borderRadius: 'full',
          borderColor: 'bo',
          fit: 'contain',
        },
        options: [
          { value: 'ada', label: 'Ada', imageSrc: '/avatars/ada.svg' },
          { value: 'grace', label: 'Grace', imageSrc: '/avatars/grace.svg' },
        ],
      },
    });

    expect(viewData).toMatchObject({
      imageSize: 24,
      imageBorderRadius: 'f',
      imageBorderColor: 'bo',
      imageHasBorder: true,
      imageFit: 'con',
    });
    expect(viewData.options.every((option) => option.leadingVisualSize === 24)).toBe(true);
    expect(viewData.containerAttrString).not.toContain('[object Object]');
    expect(viewData.containerAttrString).not.toContain('image=');
  });

  it('falls back safely for empty sources and invalid image configuration', () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: {
        selectedValue: 'blank',
        image: {
          size: 0,
          borderRadius: 'circle',
          borderColor: 'not-a-token',
          fit: 'stretch',
        },
        options: [
          { value: 'blank', label: 'Blank', imageSrc: '   ', icon: 'info' },
          { value: 'image', label: 'Image', imageSrc: '/avatars/ada.svg' },
        ],
      },
    });

    expect(viewData).toMatchObject({
      hasSelectedImage: false,
      hasSelectedIcon: true,
      imageSize: 20,
      imageBorderRadius: 'sm',
      imageBorderColor: '',
      imageHasBorder: false,
      imageFit: 'cov',
    });
    expect(viewData.options[0]).toMatchObject({
      imageSrc: '',
      hasImage: false,
      hasIcon: true,
      leadingVisualSize: 20,
    });
  });

  it('filters searchable options by label while preserving original option indexes', () => {
    const viewData = selectViewData({
      state: {
        ...createInitialState(),
        searchQuery: 'app',
      },
      props: {
        searchable: true,
        options: [
          { value: 'banana', label: 'Banana' },
          { value: 'apple', label: 'Apple' },
          { value: 'orange', label: 'Orange' },
        ],
      },
    });

    expect(viewData.options.map((option) => option.label)).toEqual(['Apple']);
    expect(viewData.options[0].index).toBe(1);
    expect(viewData.renderOptions.map((option) => ({
      label: option.label,
      isSearchHidden: option.isSearchHidden,
    }))).toEqual([
      { label: 'Banana', isSearchHidden: true },
      { label: 'Apple', isSearchHidden: false },
      { label: 'Orange', isSearchHidden: true },
    ]);
    expect(viewData.showEmptySearch).toBe(false);
  });

  it('keeps selected trigger metadata resolved from the full options list during search', () => {
    const viewData = selectViewData({
      state: {
        ...createInitialState(),
        searchQuery: 'paste',
      },
      props: {
        searchable: true,
        selectedValue: 'copy',
        options: [
          {
            value: 'copy',
            label: 'Copy',
            imageSrc: '/avatars/copy.svg',
            icon: 'text',
            shortcut: 'Cmd+C',
          },
          { value: 'paste', label: 'Paste' },
        ],
      },
    });

    expect(viewData.options.map((option) => option.label)).toEqual(['Paste']);
    expect(viewData.selectedLabel).toBe('Copy');
    expect(viewData.hasSelectedImage).toBe(true);
    expect(viewData.selectedImageSrc).toBe('/avatars/copy.svg');
    expect(viewData.hasSelectedIcon).toBe(false);
    expect(viewData.hasSelectedSuffixText).toBe(true);
    expect(viewData.selectedSuffixText).toBe('Cmd+C');
  });

  it('filters sectioned options without orphan separators', () => {
    const viewData = selectViewData({
      state: {
        ...createInitialState(),
        searchQuery: 'engineering',
      },
      props: {
        searchable: true,
        options: [
          { type: 'section', label: 'Product' },
          { value: 'designer', label: 'Designer' },
          { type: 'separator' },
          { value: 'researcher', label: 'Researcher' },
          { type: 'section', label: 'Engineering' },
          { value: 'frontend', label: 'Frontend Engineer' },
          { type: 'separator' },
          { value: 'backend', label: 'Backend Engineer' },
        ],
      },
    });

    expect(viewData.options.map((option) => ({
      type: option.type,
      label: option.label,
      index: option.index,
    }))).toEqual([
      { type: 'section', label: 'Engineering', index: 4 },
      { type: 'item', label: 'Frontend Engineer', index: 5 },
      { type: 'separator', label: undefined, index: 6 },
      { type: 'item', label: 'Backend Engineer', index: 7 },
    ]);
  });

  it('exposes empty search text when a query has no matching option labels', () => {
    const viewData = selectViewData({
      state: {
        ...createInitialState(),
        searchQuery: 'missing',
      },
      props: {
        searchable: true,
        emptySearchLabel: 'Nothing found',
        options: [
          { value: 'alpha', label: 'Alpha' },
          { value: 'beta', label: 'Beta' },
        ],
      },
    });

    expect(viewData.options).toEqual([]);
    expect(viewData.renderOptions.every((option) => option.isSearchHidden)).toBe(true);
    expect(viewData.showEmptySearch).toBe(true);
    expect(viewData.hideEmptySearch).toBe(false);
    expect(viewData.emptySearchLabel).toBe('Nothing found');
  });
});
