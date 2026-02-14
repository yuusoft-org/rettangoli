import { describe, expect, it } from 'vitest';
import * as cli from '../../src/cli/index.js';

describe('be cli exports', () => {
  it('exports expected command handlers', () => {
    expect(typeof cli.build).toBe('function');
    expect(typeof cli.check).toBe('function');
    expect(typeof cli.watch).toBe('function');
  });
});
