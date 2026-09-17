import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function getReleaseVersions({ cli, vt }) {
  if (cli.dependencies['@rettangoli/vt'] !== vt.version) {
    throw new Error('rtgl must depend on the exact @rettangoli/vt release being packaged.');
  }
  const versions = {
    rtgl: cli.version,
    vt: vt.version,
    playwright: vt.dependencies.playwright,
  };
  for (const [name, value] of Object.entries(versions)) {
    if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(value)) {
      throw new Error(`${name} must have an exact version, received ${value}.`);
    }
  }
  return versions;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const read = (relative) => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));
  const versions = getReleaseVersions({
    cli: read('../../rettangoli-cli/package.json'),
    vt: read('../package.json'),
  });
  console.log(`${versions.rtgl} ${versions.vt} ${versions.playwright}`);
}
