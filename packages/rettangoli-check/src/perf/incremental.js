import path from "node:path";

const COMPONENT_SEGMENTS_BY_SUFFIX = [
  [".view.yaml", ["structural", "template", "semantic"]],
  [".schema.yaml", ["structural", "typed-contract", "semantic"]],
  [".handlers.js", ["structural", "typed-contract", "semantic"]],
  [".store.js", ["structural", "typed-contract", "semantic"]],
  [".methods.js", ["structural", "typed-contract", "semantic"]],
  [".constants.yaml", ["structural", "typed-contract"]],
];

const segmentsForFilePath = (filePath = "") => {
  const normalized = String(filePath);
  const matched = COMPONENT_SEGMENTS_BY_SUFFIX.find(([suffix]) => normalized.endsWith(suffix));
  if (!matched) {
    return ["structural", "semantic"];
  }
  return [...matched[1]];
};

export const computeAffectedGraphSegments = ({ changedFiles = [] } = {}) => {
  const segmentSet = new Set();
  changedFiles.forEach((filePath) => {
    segmentsForFilePath(filePath).forEach((segment) => segmentSet.add(segment));
  });
  if (segmentSet.size === 0) {
    segmentSet.add("structural");
  }
  return [...segmentSet].sort((left, right) => left.localeCompare(right));
};

export const computeAffectedComponents = ({
  graph,
  changedFiles = [],
} = {}) => {
  const changedPaths = changedFiles
    .map((filePath) => path.resolve(String(filePath || "")))
    .filter(Boolean);
  const seeds = new Set();

  changedPaths.forEach((filePath) => {
    const componentKey = graph?.fileToComponent?.get(filePath);
    if (componentKey) {
      seeds.add(componentKey);
    }
  });

  const reverseDeps = new Map();
  const directDeps = graph?.componentDependencies || new Map();
  directDeps.forEach((targets, source) => {
    (targets || []).forEach((target) => {
      const existing = reverseDeps.get(target) || [];
      existing.push(source);
      reverseDeps.set(target, existing);
    });
  });

  const affected = new Set([...seeds]);
  const queue = [...seeds];

  while (queue.length > 0) {
    const current = queue.shift();
    const dependents = reverseDeps.get(current) || [];
    dependents.forEach((dependent) => {
      if (affected.has(dependent)) {
        return;
      }
      affected.add(dependent);
      queue.push(dependent);
    });
  }

  const affectedComponents = [...affected].sort((left, right) => left.localeCompare(right));
  const affectedFiles = [];
  affectedComponents.forEach((componentKey) => {
    const files = graph?.componentToFiles?.get(componentKey) || [];
    files.forEach((filePath) => affectedFiles.push(filePath));
  });

  return {
    changedFiles: changedPaths,
    affectedComponents,
    affectedFiles: [...new Set(affectedFiles)].sort((left, right) => left.localeCompare(right)),
    affectedSegments: computeAffectedGraphSegments({ changedFiles: changedPaths }),
  };
};
