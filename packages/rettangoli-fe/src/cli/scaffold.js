import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isValidCustomElementName } from '../core/contracts/customElementName.js';
import { toKebabCase } from '../core/runtime/props.js';
import { validateComponentDirs } from './contracts.js';

// only have blank template now. may add more later
const templateDir = fileURLToPath(new URL('./blank', import.meta.url));

const scaffoldPage = (options) => {
  const { dir, category, componentName } = options;
  const targetDir = path.join(dir, category, componentName);

  if (fs.existsSync(targetDir)) {
    console.log(`Stopping because ${targetDir} already exists`);
    return;
  }

  const elementName = `custom-${toKebabCase(componentName)}`;
  if (!isValidCustomElementName(elementName)) {
    throw new Error(
      `[Scaffold] "${componentName}" gives the element name "${elementName}", which is not a valid custom element name.`,
    );
  }

  // Render every file first, so a failure leaves no half-made folder behind.
  const files = fs.readdirSync(templateDir).map((file) => ({
    targetPath: path.join(targetDir, file.replace('blank', componentName)),
    content: fs.readFileSync(path.join(templateDir, file), 'utf8')
      // One pass, so the element name is not rewritten again when it contains "blank".
      .replace(/custom-blank|blank/g, (match) => (match === 'custom-blank' ? elementName : componentName)),
  }));

  fs.mkdirSync(targetDir, { recursive: true });
  files.forEach(({ targetPath, content }) => {
    fs.writeFileSync(targetPath, content);
  });

  validateComponentDirs({
    dirs: [path.resolve(targetDir)],
    errorPrefix: "[Scaffold]",
  });

  console.log(`Successfully scaffolded ${targetDir} from template`);
}

export default scaffoldPage;
