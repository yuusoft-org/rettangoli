import { existsSync, mkdirSync, cpSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function initSite({ projectName, template = 'default' }) {
  const templatesDir = resolve(__dirname, '../../templates');
  const templatePath = resolve(templatesDir, template);
  const targetPath = resolve(process.cwd(), projectName);

  // Check if template exists
  if (!existsSync(templatePath)) {
    const available = readdirSync(templatesDir).filter(f =>
      existsSync(resolve(templatesDir, f, 'package.json'))
    );
    console.error(`Template "${template}" not found.`);
    console.error(`Available templates: ${available.join(', ')}`);
    process.exit(1);
  }

  // Check if target directory already exists
  if (existsSync(targetPath)) {
    console.error(`Directory "${projectName}" already exists.`);
    process.exit(1);
  }

  // Create target directory and copy template
  mkdirSync(targetPath, { recursive: true });
  cpSync(templatePath, targetPath, { recursive: true });

  console.log(`Created "${projectName}" from template "${template}"`);
  console.log('');
  console.log('Next steps:');
  console.log(`  cd ${projectName}`);
  console.log('  bun install');
  console.log('  bun run build');
}
