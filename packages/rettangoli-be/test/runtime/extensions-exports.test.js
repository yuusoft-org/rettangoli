import { describe, expect, it } from 'vitest';
import {
  createHealthExtension,
  createReadyExtension,
  createVersionExtension,
} from '../../src/extensions/index.js';

describe('extensions exports', () => {
  it('exports built-in extension factories', () => {
    expect(typeof createHealthExtension).toBe('function');
    expect(typeof createReadyExtension).toBe('function');
    expect(typeof createVersionExtension).toBe('function');
  });

  it('creates default http built-in extensions', () => {
    const health = createHealthExtension();
    const ready = createReadyExtension();
    const version = createVersionExtension();

    expect(health).toMatchObject({
      type: 'http',
      path: '/healthz',
      methods: ['GET'],
    });
    expect(ready).toMatchObject({
      type: 'http',
      path: '/readyz',
      methods: ['GET'],
    });
    expect(version).toMatchObject({
      type: 'http',
      path: '/version',
      methods: ['GET'],
    });
  });
});
