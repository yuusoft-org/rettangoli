# Rettangoli Sites Collections Implementation Plan

## Overview
Implement Eleventy-like collections functionality in `packages/rettangoli-sites` to make frontmatter data from markdown and YAML files available through a `collections` variable in templates.

## Current State Analysis

### Existing Infrastructure
1. **Frontmatter Parsing**: Already implemented in `createSiteBuilder.js` (lines 81-103)
   - Extracts frontmatter between `---` delimiters
   - Parses YAML frontmatter using js-yaml
   - Stores in `frontmatter` object

2. **File Processing**: Supports both `.md` and `.yaml` files
   - Markdown files processed with MarkdownIt
   - YAML files processed as page content
   - Recursive directory traversal implemented

3. **Data Flow**: 
   - Global data from `data/` directory
   - Frontmatter data per page
   - Merged into `pageData` for template rendering

## Requirements

### Core Features
1. **Tag-based Collections**
   - Support single tag: `tags: post`
   - Support array of tags: `tags: [post, featured]`
   - Each tag creates a collection accessible as `collections.tagname`

2. **Collection Item Structure**
   Each item in a collection must include:
   - `data`: All frontmatter data
   - `url`: The generated URL path of the page

3. **Template Access**
   Collections available in templates for iteration:
   ```yaml
   $for post in collections.post:
     ${post.data.title}
     ${post.url}
   ```

## Implementation Architecture

### 1. Collections Builder Phase
- **When**: During build process, after frontmatter extraction
- **Where**: New function in `createSiteBuilder.js`
- **What**: 
  - Collect all pages with their frontmatter
  - Group by tags into collections object
  - Store page metadata (URL, data)

### 2. Data Structure
```javascript
collections = {
  post: [
    {
      data: { /* all frontmatter */ },
      url: '/blog/post-1.html'
    }
  ],
  featured: [ /* items tagged 'featured' */ ]
}
```

### 3. Integration Points
- **Global Data**: Add `collections` to the global context alongside existing `globalData`
- **Template Rendering**: Make collections available in `parseAndRender` calls
- **URL Generation**: Calculate URLs based on file paths relative to `pages/` directory

## Technical Considerations

### 1. Build Order Dependencies
- **Challenge**: Need all pages processed before collections are complete
- **Solution**: Two-pass approach:
  1. First pass: Scan all files, extract metadata, build collections
  2. Second pass: Render pages with complete collections available

### 2. URL Calculation
- **Challenge**: Need to know final URL before rendering
- **Solution**: Calculate URL from file path during scanning phase
  - `/pages/blog/post.md` → `/blog/post.html`
  - `/pages/index.yaml` → `/index.html`

### 3. Memory Efficiency
- **Challenge**: Large sites may have many files
- **Solution**: Store minimal data in collections (frontmatter + URL only)
- **Risk**: Very large sites might need pagination or lazy loading (out of scope)

### 4. Tag Normalization
- **Challenge**: Consistent tag handling
- **Solution**: 
  - Convert single tags to array internally
  - Trim whitespace from tags
  - Case-sensitive tag names

## Implementation Steps

1. **Create Collections Scanner**
   - Function to traverse pages directory
   - Extract frontmatter and calculate URLs
   - Build collections object

2. **Modify Build Process**
   - Add collections scanning before page rendering
   - Pass collections to all template renders

3. **Update Template Context**
   - Include collections in template data
   - Ensure availability in partials and includes

4. **Testing**
   - Create test fixtures with tagged content
   - Verify collections accessibility in templates
   - Test edge cases (no tags, empty tags, multiple tags)

## Risks and Mitigations

### 1. Performance Impact
- **Risk**: Two-pass approach may slow builds
- **Mitigation**: Only scan metadata in first pass, minimal processing

### 2. Circular Dependencies
- **Risk**: Templates might reference collections that include themselves
- **Mitigation**: This is expected behavior, similar to Eleventy

### 3. Missing Tags
- **Risk**: Pages without tags won't appear in any collection
- **Mitigation**: Document this behavior, consider `collections.all` in future

### 4. Large Collections
- **Risk**: Templates iterating over large collections may be slow
- **Mitigation**: Document performance considerations, suggest pagination

## Future Considerations (Out of Scope)

1. **Custom Collections**: Programmatic collection creation
2. **Collection Sorting**: Default sort orders
3. **Collection Filtering**: Built-in filter functions
4. **Pagination**: Automatic pagination for large collections
5. **collections.all**: Special collection containing all pages

## Decision Points

1. **Tag Format**: Support both string and array formats ✓
2. **Case Sensitivity**: Tags are case-sensitive ✓
3. **Empty Collections**: Don't create collections for non-existent tags ✓
4. **URL Format**: Use relative URLs starting with `/` ✓
5. **Data Storage**: Store full frontmatter in `data` property ✓

## Success Criteria

1. Templates can iterate over collections using `$for` syntax
2. Each collection item has `data` and `url` properties
3. Both single tags and tag arrays work correctly
4. No significant performance degradation for typical sites
5. Clear error messages for invalid tag formats