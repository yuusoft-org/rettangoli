import { describe, expect, it } from 'vitest';
import * as cli from '../../src/cli/index.js';

describe('be cli exports', () => {
  it('exports expected command handlers', () => {
    expect(typeof cli.build).toBe('function');
    expect(typeof cli.check).toBe('function');
    expect(typeof cli.db).toBe('function');
    expect(typeof cli.manifest).toBe('function');
    expect(typeof cli.resume).toBe('function');
    expect(typeof cli.scaffold).toBe('function');
    expect(typeof cli.start).toBe('function');
    expect(typeof cli.test).toBe('function');
    expect(typeof cli.verify).toBe('function');
    expect(typeof cli.watch).toBe('function');
  });
});
