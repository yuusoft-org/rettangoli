import path from "path";

export function extractParts(filePath) {
  const dir = path.dirname(filePath);
  const filename = path.basename(filePath, ".webp");
  const lastHyphenIndex = filename.lastIndexOf("-");

  if (lastHyphenIndex > -1) {
    const suffix = filename.substring(lastHyphenIndex + 1);
    if (/^\d+$/.test(suffix)) {
      const number = parseInt(suffix, 10);
      const name = path.join(dir, filename.substring(0, lastHyphenIndex));
      return { name, number };
    }
  }

  return { name: path.join(dir, filename), number: -1 };
}

export function sortPaths(a, b) {
  const partsA = extractParts(a);
  const partsB = extractParts(b);

  if (partsA.name < partsB.name) return -1;
  if (partsA.name > partsB.name) return 1;

  return partsA.number - partsB.number;
}

export function buildAllRelativePaths(candidateRelativePaths, referenceRelativePaths) {
  const allPaths = [
    ...new Set([...candidateRelativePaths, ...referenceRelativePaths]),
  ];
  allPaths.sort(sortPaths);
  return allPaths;
}

export function toMismatchingItems(results, siteOutputPath) {
  return results
    .filter(
      (result) =>
        !result.equal || result.onlyInCandidate || result.onlyInReference,
    )
    .map((result) => {
      return {
        candidatePath: result.candidatePath
          ? path.relative(siteOutputPath, result.candidatePath)
          : null,
        referencePath: result.referencePath
          ? path.relative(siteOutputPath, result.referencePath)
          : null,
        equal: result.equal,
        similarity: result.similarity,
        diffPixels: result.diffPixels,
        onlyInCandidate: result.onlyInCandidate,
        onlyInReference: result.onlyInReference,
      };
    });
}

export function buildJsonReport({ total, mismatchingItems, timestamp = new Date().toISOString() }) {
  return {
    timestamp,
    total,
    mismatched: mismatchingItems.length,
    items: mismatchingItems.map((item) => ({
      path: item.candidatePath || item.referencePath,
      candidatePath: item.candidatePath,
      referencePath: item.referencePath,
      equal: item.equal,
      similarity: item.similarity,
      onlyInCandidate: item.onlyInCandidate,
      onlyInReference: item.onlyInReference,
    })),
  };
}
