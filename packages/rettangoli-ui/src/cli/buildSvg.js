import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

function getAllSvgFiles(dir) {
  const svgFiles = [];
  
  function traverse(currentDir) {
    const files = readdirSync(currentDir);
    
    for (const file of files) {
      const fullPath = join(currentDir, file);
      const stats = statSync(fullPath);
      
      if (stats.isDirectory()) {
        traverse(fullPath);
      } else if (file.endsWith('.svg')) {
        svgFiles.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return svgFiles;
}

function removeFrontmatter(content) {
  // Look for a line containing only '---'
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      // Found the separator, return everything after it
      return lines.slice(i + 1).join('\n').trim();
    }
  }
  
  // No frontmatter separator found, return original content
  return content;
}

const buildSvgIcons = (options) => {
  const { dir, outfile } = options;
  
  if (!dir || !outfile) {
    console.error('Error: Both dir and outfile options are required');
    return;
  }
  
  console.log(`Scanning for SVG files in: ${dir}`);
  
  const svgFiles = getAllSvgFiles(dir);
  
  if (svgFiles.length === 0) {
    console.log('No SVG files found');
    return;
  }
  
  console.log(`Found ${svgFiles.length} SVG files`);
  
  const icons = {};
  
  for (const filePath of svgFiles) {
    const fileName = basename(filePath, '.svg');
    let content = readFileSync(filePath, 'utf8');
    
    content = removeFrontmatter(content);
    
    content = content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    icons[fileName] = content;
  }
  
  // Convert to custom format with single quotes for keys and backticks for values
  const iconEntries = Object.entries(icons).map(([key, value]) => {
    return `  '${key}': \`${value}\``;
  });
  
  const output = `window.rtglIcons = {\n${iconEntries.join(',\n')}\n};`;
  
  writeFileSync(outfile, output);
  
  console.log(`SVG icons written to: ${outfile}`);
  console.log(`Total icons: ${Object.keys(icons).length}`);
};

export default buildSvgIcons;