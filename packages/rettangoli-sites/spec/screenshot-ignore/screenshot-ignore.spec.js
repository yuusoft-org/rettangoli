import { describe, it, expect } from 'vitest';
import { minimatch } from 'minimatch';

describe('Screenshot ignore patterns', () => {
  const testPattern = (pattern, paths, expected) => {
    const results = paths.map(path => 
      minimatch(path, pattern, { matchBase: true, dot: true })
    );
    expect(results).toEqual(expected);
  };

  it('should ignore entire folders with /**', () => {
    const pattern = 'admin/**';
    const paths = [
      'admin/index.md',
      'admin/users.md',
      'admin/settings/general.md',
      'public/index.md',
      'blog/admin/post.md'
    ];
    const expected = [true, true, true, false, false];
    
    testPattern(pattern, paths, expected);
  });

  it('should ignore files starting with underscore using **/_*', () => {
    const pattern = '**/_*';
    const paths = [
      '_private.md',
      'docs/_internal.md',
      'blog/_draft.md',
      'public/index.md',
      'admin/users.md'
    ];
    const expected = [true, true, true, false, false];
    
    testPattern(pattern, paths, expected);
  });

  it('should ignore test folders anywhere using **/test/**', () => {
    const pattern = '**/test/**';
    const paths = [
      'test/unit.md',
      'docs/test/example.md',
      'src/components/test/mock.md',
      'docs/testing.md',
      'test.md'
    ];
    const expected = [true, true, true, false, false];
    
    testPattern(pattern, paths, expected);
  });

  it('should ignore specific files by name', () => {
    const pattern = 'private.md';
    const paths = [
      'private.md',
      'docs/private.md',
      'private-docs.md',
      'public.md'
    ];
    const expected = [true, true, false, false];
    
    testPattern(pattern, paths, expected);
  });

  it('should ignore files with specific patterns like *.draft.md', () => {
    const pattern = '*.draft.md';
    const paths = [
      'post.draft.md',
      'article.draft.md',
      'blog/new.draft.md',
      'draft.md',
      'post.md'
    ];
    const expected = [true, true, true, false, false];
    
    testPattern(pattern, paths, expected);
  });

  it('should handle multiple patterns correctly', () => {
    const patterns = ['admin/**', '**/_*', '*.draft.md'];
    
    const shouldIgnore = (path) => {
      return patterns.some(pattern => 
        minimatch(path, pattern, { matchBase: true, dot: true })
      );
    };

    expect(shouldIgnore('admin/users.md')).toBe(true);
    expect(shouldIgnore('_private.md')).toBe(true);
    expect(shouldIgnore('post.draft.md')).toBe(true);
    expect(shouldIgnore('public/index.md')).toBe(false);
    expect(shouldIgnore('blog/post.md')).toBe(false);
  });

  it('should handle dot files when dot option is true', () => {
    const pattern = '**/.*';
    const paths = [
      '.hidden.md',
      'docs/.private.md',
      'normal.md'
    ];
    const expected = [true, true, false];
    
    testPattern(pattern, paths, expected);
  });

  it('should match basename with matchBase option', () => {
    const pattern = 'README.md';
    const paths = [
      'README.md',
      'docs/README.md',
      'src/components/README.md',
      'readme.md'
    ];
    // With matchBase: true, it matches README.md in any directory
    const expected = [true, true, true, false];
    
    testPattern(pattern, paths, expected);
  });
});