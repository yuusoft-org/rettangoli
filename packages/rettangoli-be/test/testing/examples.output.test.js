import { describe, expect, it } from 'vitest';
import { createResponseMismatchMessage } from '../../src/testing/examples.js';

describe('rettangoli examples diagnostics', () => {
  it('formats response mismatches with stable expected and actual JSON', () => {
    const message = createResponseMismatchMessage({
      caseDoc: { case: 'returns-ok' },
      expectedResponse: {
        result: { ok: true },
        id: 'health-ok',
        jsonrpc: '2.0',
      },
      actualResponse: {
        jsonrpc: '2.0',
        id: 'health-ok',
        result: { ok: false },
      },
      assertionMessage: 'expect(received).toEqual(expected)',
    });

    expect(message).toContain("Rettangoli example 'returns-ok' response mismatch.");
    expect(message).toContain([
      'Expected response:',
      '{',
      '  "id": "health-ok",',
      '  "jsonrpc": "2.0",',
      '  "result": {',
      '    "ok": true',
      '  }',
      '}',
    ].join('\n'));
    expect(message).toContain([
      'Actual response:',
      '{',
      '  "id": "health-ok",',
      '  "jsonrpc": "2.0",',
      '  "result": {',
      '    "ok": false',
      '  }',
      '}',
    ].join('\n'));
    expect(message).toContain('expect(received).toEqual(expected)');
  });
});
