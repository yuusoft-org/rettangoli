import fs from 'node:fs';
import path from 'node:path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// only have blank template now. may add more later
const templateDir = path.join(__dirname, 'blank');

const scaffoldPage = (options) => {
  const { dir, category, componentName } = options;
  const targetDir = path.join(dir, category, componentName);

  if (fs.existsSync(targetDir)) {
    console.log(`Stopping because ${targetDir} already exists`);
    return;
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const files = fs.readdirSync(templateDir);
  files.forEach(file => {
    const sourcePath = path.join(templateDir, file);
    const targetPath = path.join(targetDir, file.replace('blank', componentName));

    // If it's a directory, copy recursively
    if (fs.statSync(sourcePath).isDirectory()) {
      fs.cpSync(sourcePath, targetPath, { recursive: true });
    } else {
      // Read file content
      let content = fs.readFileSync(sourcePath, 'utf8');
      
      // Replace all occurrences of 'blank' with componentName in the content
      content = content.replace(/blank/g, componentName);
      
      // Write to new file
      fs.writeFileSync(targetPath, content);
    }
  });

  console.log(`Successfully scaffolded ${targetDir} from template`);
}

export default scaffoldPage;
