import { describe, expect, it } from 'vitest';
import watchSite, { createClientScript } from '../src/cli/watch.js';

describe('watch reload mode script', () => {
  it('uses body replacement logic in body mode', () => {
    const script = createClientScript('body');
    expect(script).toContain("location.protocol === 'https:' ? 'wss://' : 'ws://'");
    expect(script).toContain('fetch(window.location.href)');
    expect(script).toContain('document.body.innerHTML = newDoc.body.innerHTML;');
  });

  it('uses full page reload logic in full mode', () => {
    const script = createClientScript('full');
    expect(script).toContain('window.location.reload();');
    expect(script).not.toContain('document.body.innerHTML = newDoc.body.innerHTML;');
  });

  it('throws on invalid reload mode', async () => {
    await expect(watchSite({ reloadMode: 'instant' })).rejects.toThrow('Invalid reload mode');
  });
});
