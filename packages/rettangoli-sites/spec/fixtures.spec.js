import { describe, expect, it } from 'vitest';
import { listFixtures, runFixture } from './fixtureRunner.js';

describe('fixtures', () => {
  it.each(listFixtures())('%s builds exactly the expected tree', async (name) => {
    const { outEntries, actual, expected } = await runFixture(name);

    expect(outEntries).toEqual(['_site']);
    expect(Object.keys(actual)).toEqual(Object.keys(expected));
    expect(actual).toEqual(expected);
  });
});
