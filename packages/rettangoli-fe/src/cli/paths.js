import path from "node:path";

// True when `candidate` is `parent` or inside it. A child whose name starts
// with "..", such as "..cache", is inside.
export const isPathInside = (parent, candidate) => {
  const relativePath = path.relative(parent, candidate);
  return (
    relativePath === "" ||
    (relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath))
  );
};
