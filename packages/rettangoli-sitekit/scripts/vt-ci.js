import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const items = [
  'docs-template/docs-getting-started.html',
  'docs-template/docs-getting-started-mobile-menu-open.html',
  'overview/home.html',
  'templates/blog-article-list.html',
  'templates/blog-article.html',
  'templates/landing-highlights.html',
  'templates/landing-pricing.html',
];

export function runVisualChecks({
  docker = false,
  image = process.env.RTGL_VT_IMAGE ?? 'han4wluc/rtgl:playwright-v1.57.0-rtgl-v1.1.0',
  execute = spawnSync,
} = {}) {
  const selectors = items.flatMap((item) => ['--item', item]);
  const prefix = docker ? [
    'docker', 'run', '--rm', '--pull=missing',
    '--user', `${process.getuid()}:${process.getgid()}`,
    '-v', `${resolve(packageDirectory, '../..')}:/workspace`,
    '-w', '/workspace/packages/rettangoli-sitekit', image,
    'node', '/workspace/packages/rettangoli-cli/cli.js',
  ] : [process.execPath, resolve(packageDirectory, '../rettangoli-cli/cli.js')];

  for (const operation of [
    ['screenshot', '--concurrency', '1'],
    ['report'],
  ]) {
    const [command, ...args] = [...prefix, 'vt', ...operation, ...selectors];
    const result = execute(command, args, { cwd: packageDirectory, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runVisualChecks({ docker: process.argv.includes('--docker') });
}
