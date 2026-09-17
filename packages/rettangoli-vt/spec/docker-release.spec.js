import { describe, expect, it } from 'vitest';
import { getReleaseVersions } from '../docker/release-versions.mjs';

const manifests = {
  cli: { version: '2.1.2', dependencies: { '@rettangoli/vt': '1.1.0' } },
  vt: { version: '1.1.0', dependencies: { playwright: '1.57.0' } },
};

describe('Docker release versions', () => {
  it('derives independent CLI, VT and browser versions from manifests', () => {
    expect(getReleaseVersions(manifests)).toEqual({ rtgl: '2.1.2', vt: '1.1.0', playwright: '1.57.0' });
  });

  it('rejects a CLI carrying a different VT engine', () => {
    expect(() => getReleaseVersions({ ...manifests, cli: { ...manifests.cli, dependencies: { '@rettangoli/vt': '1.0.5' } } })).toThrow('exact @rettangoli/vt release');
  });

  it('rejects floating browser versions that cannot identify an image', () => {
    expect(() => getReleaseVersions({ ...manifests, vt: { ...manifests.vt, dependencies: { playwright: '^1.57.0' } } })).toThrow('exact version');
  });
});
