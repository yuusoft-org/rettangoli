import path from 'path';

import { resolveSitemapOutputPath } from './sitemap.js';
import { assertSafeOutputPath } from './utils/pathSafety.js';

// Every function takes context: { fs, rootDir, absoluteRootDir, outputRootDir, outputPath, sitemap, quiet }.

function cleanOutputDir({ fs, absoluteRootDir, outputRootDir, outputPath }) {
  assertSafeOutputPath(fs, absoluteRootDir, outputRootDir, outputPath);
  if (fs.existsSync(outputRootDir)) {
    fs.rmSync(outputRootDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputRootDir, { recursive: true });
}

// Copy rootDir/static into the output folder, recursively.
function copyStaticFiles({ fs, rootDir, outputRootDir, quiet }) {
  const staticDir = path.join(rootDir, 'static');

  if (!fs.existsSync(staticDir)) {
    return;
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputRootDir)) {
    fs.mkdirSync(outputRootDir, { recursive: true });
  }

  function copyRecursive(src, dest) {
    const stats = fs.statSync(src);

    if (stats.isDirectory()) {
      // Create directory if it doesn't exist
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }

      // Copy all items in directory
      const items = fs.readdirSync(src);
      items.forEach(item => {
        copyRecursive(path.join(src, item), path.join(dest, item));
      });
    } else if (stats.isFile()) {
      // Copy file
      fs.copyFileSync(src, dest);
      if (!quiet) console.log(`  -> Copied ${src} to ${dest}`);
    }
  }

  if (!quiet) console.log('Copying static files...');
  const items = fs.readdirSync(staticDir);
  items.forEach(item => {
    const srcPath = path.join(staticDir, item);
    const destPath = path.join(outputRootDir, item);
    copyRecursive(srcPath, destPath);
  });
}

function writeRenderedPage({ fs, quiet }, { pageLabel, outputPath, html, markdownCopy }) {
  if (!quiet) console.log(`Processing ${pageLabel}...`);
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write HTML to output file
  fs.writeFileSync(outputPath, html);
  if (!quiet) console.log(`  -> Written to ${outputPath}`);

  if (markdownCopy) {
    const markdownOutputDir = path.dirname(markdownCopy.to);
    if (!fs.existsSync(markdownOutputDir)) {
      fs.mkdirSync(markdownOutputDir, { recursive: true });
    }
    fs.copyFileSync(markdownCopy.from, markdownCopy.to);
    if (!quiet) console.log(`  -> Copied markdown to ${markdownCopy.to}`);
  }
}

function writeSitemapFile({ fs, outputRootDir, sitemap, quiet }, sitemapXml) {
  if (sitemapXml === null) {
    return;
  }

  const sitemapOutputRelativePath = resolveSitemapOutputPath(sitemap);
  const sitemapOutputPath = path.join(outputRootDir, ...sitemapOutputRelativePath.split('/'));
  const sitemapOutputDir = path.dirname(sitemapOutputPath);

  if (!fs.existsSync(sitemapOutputDir)) {
    fs.mkdirSync(sitemapOutputDir, { recursive: true });
  }

  fs.writeFileSync(sitemapOutputPath, sitemapXml);
  if (!quiet) console.log(`  -> Written sitemap to ${sitemapOutputPath}`);
}

// Clean the output folder, copy static files, then write the pages and the sitemap.
// Pages can overwrite static files, and the sitemap can overwrite both.
export function writeOutput(context, renderedPages, sitemapXml) {
  if (!context.quiet) console.log('Starting build process...');
  cleanOutputDir(context);
  copyStaticFiles(context);
  for (const page of renderedPages) {
    writeRenderedPage(context, page);
  }
  writeSitemapFile(context, sitemapXml);
}
