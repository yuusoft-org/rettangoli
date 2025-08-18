import { createSiteBuilder } from '../src/createSiteBuilder.js';
import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs';
import * as url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

describe('Collections', () => {
  it('should create collections from tags in frontmatter', () => {
    const rootDir = path.join(__dirname, 'fixtures/fixture-collections/in');
    const outputDir = path.join(rootDir, '_site');
    
    // Clean output directory if it exists
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
    
    // Build the site
    const builder = createSiteBuilder({ fs, rootDir });
    builder();
    
    // Check that collections-list.html was generated with correct content
    const collectionsListPath = path.join(outputDir, 'collections-list.html');
    expect(fs.existsSync(collectionsListPath)).to.be.true;
    
    const content = fs.readFileSync(collectionsListPath, 'utf8');
    
    // Check that post collection is rendered
    expect(content).to.include('Post Collection');
    expect(content).to.include('First Blog Post');
    expect(content).to.include('Second Blog Post');
    expect(content).to.include('href="/post-1.html"');
    expect(content).to.include('href="/post-2.html"');
    
    // Check that featured collection is rendered
    expect(content).to.include('Featured Collection');
    // Only the second post should be in featured
    expect(content.match(/Featured Collection[\s\S]*?Second Blog Post/)).to.not.be.null;
    
    // Check that individual files were generated
    expect(fs.existsSync(path.join(outputDir, 'post-1.html'))).to.be.true;
    expect(fs.existsSync(path.join(outputDir, 'post-2.html'))).to.be.true;
    expect(fs.existsSync(path.join(outputDir, 'about.html'))).to.be.true;
  });
  
  it('should handle single tags and array tags correctly', () => {
    const rootDir = path.join(__dirname, 'fixtures/fixture-collections/in');
    const outputDir = path.join(rootDir, '_site');
    
    // The test fixture has:
    // - post-1.md with tags: post (single tag)
    // - post-2.md with tags: [post, featured] (array of tags)
    // Both should appear in collections.post
    const collectionsListPath = path.join(outputDir, 'collections-list.html');
    const content = fs.readFileSync(collectionsListPath, 'utf8');
    
    // Count occurrences of links in post collection section
    const postSection = content.match(/Post Collection[\s\S]*?Featured Collection/)?.[0] || '';
    const post1Links = (postSection.match(/href="\/post-1\.html"/g) || []).length;
    const post2Links = (postSection.match(/href="\/post-2\.html"/g) || []).length;
    
    expect(post1Links).to.equal(1);
    expect(post2Links).to.equal(1);
  });
});