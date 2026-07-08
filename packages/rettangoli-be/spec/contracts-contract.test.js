import { describe, expect, it } from 'vitest';
import {
  isSupportedMethodFile,
  SUPPORTED_METHOD_FILE_SUFFIXES,
} from '../src/cli/contracts.js';

describe('contracts helper', () => {
  it('recognizes contract suffix', () => {
    expect(isSupportedMethodFile('/tmp/modules/health/ping/ping.contract.yaml')).toBe(true);
    expect(SUPPORTED_METHOD_FILE_SUFFIXES).toHaveLength(3);
  });

  it('rejects unsupported suffix', () => {
    expect(isSupportedMethodFile('/tmp/modules/health/ping/ping.txt')).toBe(false);
    expect(SUPPORTED_METHOD_FILE_SUFFIXES).toHaveLength(3);
  });
});
