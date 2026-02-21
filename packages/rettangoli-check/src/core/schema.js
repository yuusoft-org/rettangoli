import { toCamelCase, toKebabCase } from "../utils/case.js";

const isObjectRecord = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const isCanonicalKey = (value) => {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
};

const toSortedObjectFromMap = (valueByKey) => {
  const result = {};
  if (!(valueByKey instanceof Map)) {
    return result;
  }

  [...valueByKey.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => {
      result[key] = value;
    });

  return result;
};

const collectCanonicalNameMap = (value) => {
  const byName = new Map();
  if (!isObjectRecord(value)) {
    return byName;
  }

  Object.keys(value).forEach((rawName) => {
    if (!isCanonicalKey(rawName)) {
      return;
    }
    if (byName.has(rawName)) {
      return;
    }
    byName.set(rawName, value[rawName]);
  });

  return byName;
};

const collectCanonicalStringListFromArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter(isCanonicalKey))].sort();
};

const collectCanonicalStringListFromObjectKeys = (value) => {
  if (!isObjectRecord(value)) {
    return [];
  }

  return [...new Set(Object.keys(value).filter(isCanonicalKey))].sort();
};

const createPropAliasMap = (propByName = new Map()) => {
  const aliasToCanonical = new Map();
  [...propByName.keys()]
    .sort((left, right) => left.localeCompare(right))
    .forEach((canonicalName) => {
      [canonicalName, toCamelCase(canonicalName), toKebabCase(canonicalName)].forEach((alias) => {
        if (!alias || aliasToCanonical.has(alias)) {
          return;
        }
        aliasToCanonical.set(alias, canonicalName);
      });
    });
  return aliasToCanonical;
};

export const normalizeSchemaYaml = (schemaYaml) => {
  const empty = {
    componentName: "",
    props: {
      names: [],
      requiredNames: [],
      byName: new Map(),
      aliasToCanonical: new Map(),
    },
    events: {
      names: [],
      byName: new Map(),
    },
    methods: {
      names: [],
      byName: new Map(),
    },
    canonicalSchema: {
      componentName: "",
      propsSchema: {
        type: "object",
        properties: {},
        required: [],
      },
      events: [],
      methods: {
        type: "object",
        properties: {},
      },
    },
  };

  if (!isObjectRecord(schemaYaml)) {
    return empty;
  }

  const componentName = typeof schemaYaml.componentName === "string"
    ? schemaYaml.componentName.trim()
    : "";
  const propByName = collectCanonicalNameMap(schemaYaml?.propsSchema?.properties);
  const propAliasToCanonical = createPropAliasMap(propByName);
  const requiredNames = collectCanonicalStringListFromArray(schemaYaml?.propsSchema?.required);
  const methodByName = collectCanonicalNameMap(schemaYaml?.methods?.properties);
  const eventByName = (() => {
    if (Array.isArray(schemaYaml?.events)) {
      const byName = new Map();
      collectCanonicalStringListFromArray(schemaYaml.events).forEach((eventName) => {
        byName.set(eventName, {});
      });
      return byName;
    }
    return collectCanonicalNameMap(schemaYaml?.events);
  })();
  const eventNames = [...eventByName.keys()].sort((left, right) => left.localeCompare(right));

  return {
    componentName,
    props: {
      names: [...propByName.keys()].sort((left, right) => left.localeCompare(right)),
      requiredNames,
      byName: propByName,
      aliasToCanonical: propAliasToCanonical,
    },
    events: {
      names: eventNames,
      byName: eventByName,
    },
    methods: {
      names: [...methodByName.keys()].sort((left, right) => left.localeCompare(right)),
      byName: methodByName,
    },
    canonicalSchema: {
      componentName,
      propsSchema: {
        type: "object",
        properties: toSortedObjectFromMap(propByName),
        required: requiredNames,
      },
      events: eventNames,
      methods: {
        type: "object",
        properties: toSortedObjectFromMap(methodByName),
      },
    },
  };
};
