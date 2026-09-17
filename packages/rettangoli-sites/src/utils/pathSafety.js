import path from 'node:path';

export function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

// Resolve existing ancestors too, so a new output below a symlink cannot
// bypass the same checks applied to an existing output directory.
export function resolveCanonicalPath(fs, target) {
  let existing = path.resolve(target);
  const suffix = [];
  while (true) {
    try {
      return path.join(fs.realpathSync(existing), ...suffix);
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
      const parent = path.dirname(existing);
      if (parent === existing) throw error;
      suffix.unshift(path.basename(existing));
      existing = parent;
    }
  }
}

export function assertSafeOutputPath(fs, source, output, label = output) {
  const sourcePath = path.resolve(source);
  const outputPath = path.resolve(output);
  const canonicalSource = resolveCanonicalPath(fs, sourcePath);
  const canonicalOutput = resolveCanonicalPath(fs, outputPath);
  if (
    isPathInside(outputPath, sourcePath) ||
    isPathInside(canonicalOutput, canonicalSource)
  ) {
    throw new Error(`Refusing to clean output path "${label}" because it contains rootDir (or resolves to rootDir or filesystem root).`);
  }
}
