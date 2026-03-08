import { describe, expect, it } from 'vitest';
import { selectViewData } from '../src/components/card/card.store.js';

describe('rtgl-card store', () => {
  it('defaults to the md preset and renders a header when heading exists', () => {
    const viewData = selectViewData({ props: { heading: 'Billing', subheading: 'Manage invoices.' } });

    expect(viewData.size).toBe('md');
    expect(viewData.hasHeader).toBe(true);
    expect(viewData.headingSize).toBe('h4');
    expect(viewData.subheadingSize).toBe('sm');
    expect(viewData.cardAttrString).toContain('p=lg');
    expect(viewData.headerAttrString).toBe('g=sm');
  });

  it('falls back to md when size is invalid', () => {
    const viewData = selectViewData({ props: { size: 'xl' } });

    expect(viewData.size).toBe('md');
    expect(viewData.headingSize).toBe('h4');
  });

  it('omits the header when no heading or subheading is provided', () => {
    const viewData = selectViewData({ props: {} });

    expect(viewData.hasHeader).toBe(false);
    expect(viewData.heading).toBe('');
    expect(viewData.subheading).toBe('');
  });

  it('blocks internal shell attrs while preserving outer layout attrs', () => {
    const viewData = selectViewData({
      props: {
        heading: 'Card',
        size: 'lg',
        w: '320',
        mb: 'lg',
        p: 'sm',
        g: 'xs',
        bgc: 'ac',
        br: 'sm',
      },
    });

    expect(viewData.containerAttrString).toContain('w=320');
    expect(viewData.containerAttrString).toContain('mb=lg');
    expect(viewData.containerAttrString).not.toContain('heading=');
    expect(viewData.containerAttrString).not.toContain('size=');
    expect(viewData.containerAttrString).not.toContain('p=sm');
    expect(viewData.containerAttrString).not.toContain('g=xs');
    expect(viewData.containerAttrString).not.toContain('bgc=ac');
    expect(viewData.containerAttrString).not.toContain('br=sm');
  });
});
