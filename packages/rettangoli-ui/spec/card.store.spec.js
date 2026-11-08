import { describe, expect, it } from 'vitest';
import { selectViewData } from '../src/components/card/card.store.js';

describe('rtgl-card store', () => {
  it('defaults to the md preset and renders a header when heading exists', () => {
    const viewData = selectViewData({ props: { head: 'Billing', desc: 'Manage invoices.' } });

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

  it('omits the header when no head or desc is provided', () => {
    const viewData = selectViewData({ props: {} });

    expect(viewData.hasHeader).toBe(false);
    expect(viewData.head).toBe('');
    expect(viewData.desc).toBe('');
  });

  // Host attributes such as w or mb stay on <rtgl-card>; the store never sees
  // them (spec/hostAttrs.mount.spec.js).
  it('uses the lg preset spacing and heading sizes', () => {
    const viewData = selectViewData({ props: { head: 'Card', size: 'lg' } });

    expect(viewData.cardAttrString).toBe('p=xl lg-p=lg md-p=md sm-p=md g=lg md-g=md sm-g=md');
    expect(viewData.headerAttrString).toBe('g=sm');
    expect(viewData.headingSize).toBe('h3');
    expect(viewData.subheadingSize).toBe('md');
  });
});
