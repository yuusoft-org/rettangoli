const toSortedUnique = (items = []) => {
  return [...new Set(items.filter(Boolean))].sort((left, right) => String(left).localeCompare(String(right)));
};

const componentKeyFromNodeId = (nodeId = "") => {
  const separatorIndex = String(nodeId).indexOf("::");
  if (separatorIndex < 0) {
    return "";
  }
  return nodeId.slice(0, separatorIndex);
};

export const buildSemanticDependencyGraph = ({ compilerIr } = {}) => {
  const structural = compilerIr?.structural || {};
  const semantic = compilerIr?.semantic || {};
  const typedContract = compilerIr?.typedContract || {};

  const components = Array.isArray(structural.components) ? [...structural.components] : [];
  const dependencies = Array.isArray(structural.dependencies) ? [...structural.dependencies] : [];
  const semanticEdges = Array.isArray(semantic.edges) ? [...semantic.edges] : [];
  const typedComponents = Array.isArray(typedContract.components) ? [...typedContract.components] : [];

  const nodes = [];
  const edges = [];
  const fileToComponent = new Map();
  const componentToFiles = new Map();

  components.forEach((component) => {
    const componentKey = String(component?.componentKey || "");
    if (!componentKey) {
      return;
    }
    nodes.push({
      id: componentKey,
      kind: "component",
    });

    const files = Array.isArray(component?.files) ? component.files : [];
    files.forEach((file) => {
      const filePath = String(file?.filePath || "");
      if (!filePath) {
        return;
      }
      nodes.push({
        id: filePath,
        kind: "file",
        componentKey,
      });
      edges.push({
        kind: "structural-file",
        from: componentKey,
        to: filePath,
      });
      fileToComponent.set(filePath, componentKey);
      const existingFiles = componentToFiles.get(componentKey) || [];
      existingFiles.push(filePath);
      componentToFiles.set(componentKey, existingFiles);
    });
  });

  dependencies.forEach((dependency) => {
    const fromComponentKey = String(dependency?.fromComponentKey || "");
    const toComponentKey = String(dependency?.toComponentKey || "");
    if (!fromComponentKey || !toComponentKey || fromComponentKey === toComponentKey) {
      return;
    }
    edges.push({
      kind: String(dependency?.kind || "component-dependency"),
      from: fromComponentKey,
      to: toComponentKey,
      tagName: dependency?.tagName,
    });
  });

  semanticEdges.forEach((edge) => {
    const fromComponentKey = componentKeyFromNodeId(String(edge?.from || ""));
    const toComponentKey = componentKeyFromNodeId(String(edge?.to || ""));
    if (!fromComponentKey || !toComponentKey || fromComponentKey === toComponentKey) {
      return;
    }
    edges.push({
      kind: "semantic-ref-root",
      from: fromComponentKey,
      to: toComponentKey,
    });
  });

  typedComponents.forEach((typedComponent) => {
    const componentKey = String(typedComponent?.componentKey || "");
    if (!componentKey) {
      return;
    }
    const requiredProps = Array.isArray(typedComponent?.props?.requiredNames)
      ? typedComponent.props.requiredNames
      : [];
    if (requiredProps.length > 0) {
      nodes.push({
        id: `${componentKey}::typed-contract`,
        kind: "typed-contract",
        componentKey,
        requiredPropCount: requiredProps.length,
      });
    }
  });

  const normalizedNodes = [...new Map(nodes.map((node) => [node.id, node])).values()]
    .sort((left, right) => String(left.id).localeCompare(String(right.id)));
  const normalizedEdges = edges
    .sort((left, right) => (
      String(left.kind).localeCompare(String(right.kind))
      || String(left.from).localeCompare(String(right.from))
      || String(left.to).localeCompare(String(right.to))
    ));

  const componentDependencies = new Map();
  normalizedEdges.forEach((edge) => {
    if (edge.from === edge.to) {
      return;
    }
    const fromKind = normalizedNodes.find((node) => node.id === edge.from)?.kind;
    const toKind = normalizedNodes.find((node) => node.id === edge.to)?.kind;
    if (fromKind !== "component" || toKind !== "component") {
      return;
    }
    const existing = componentDependencies.get(edge.from) || [];
    existing.push(edge.to);
    componentDependencies.set(edge.from, existing);
  });
  componentDependencies.forEach((value, key) => {
    componentDependencies.set(key, toSortedUnique(value));
  });

  return {
    nodes: normalizedNodes,
    edges: normalizedEdges,
    fileToComponent,
    componentToFiles,
    componentDependencies,
  };
};
