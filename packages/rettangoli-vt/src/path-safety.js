import path from "node:path";

// True when `target` is `parent` or below it. Names that merely start with ".." (such as
// "..cache") are inside; same semantics as rettangoli-sites' isPathInside.
export function isPathInside(parent, target) {
  const relativePath = path.relative(parent, target);
  return relativePath === "" || (
    relativePath !== ".." &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
}
