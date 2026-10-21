/**
 * The order components are defined in when a page holds server-rendered
 * markup: parents before the components they render.
 *
 * Server-rendered hosts are already in the document when the bundle runs, so
 * each one upgrades the moment its element is defined. A child defined before
 * its parent renders once with no props (the parent hasn't assigned them
 * yet), which can't match the server's markup. Defined after its parent, it
 * finds the props the parent's hydrating patch assigned to the not yet
 * upgraded element, and its first render matches.
 *
 * Without server markup the order stays the default one (categories, then
 * components, alphabetically), so apps that don't prerender see no change.
 */

// Tags a view template renders. Keys are `tag#id.class attrs...`; control
// keys (`$if`, `$elif`, `$else`, `$for`, `$partial`) only nest.
export const collectTemplateTags = (template, tags = new Set()) => {
  if (Array.isArray(template)) {
    template.forEach((item) => collectTemplateTags(item, tags));
    return tags;
  }
  if (!template || typeof template !== "object") {
    return tags;
  }
  for (const [key, value] of Object.entries(template)) {
    const trimmedKey = key.trim();
    if (!trimmedKey.startsWith("$")) {
      const tag = trimmedKey.split(/[\s#.]/)[0].toLowerCase();
      if (tag && !tag.includes("$")) {
        tags.add(tag);
      }
    }
    collectTemplateTags(value, tags);
  }
  return tags;
};

/**
 * @param {Array<{ id: string, elementName: string, tags: Iterable<string> }>} entries
 *   in default order
 * @returns {string[]} ids, every parent before the components it renders;
 *   components in a cycle keep their default order after the rest
 */
export const orderParentsFirst = (entries) => {
  const indexByElement = new Map();
  entries.forEach((entry, index) => {
    if (entry.elementName) {
      indexByElement.set(String(entry.elementName).toLowerCase(), index);
    }
  });

  const children = entries.map(() => new Set());
  const parentCounts = entries.map(() => 0);
  entries.forEach((entry, parentIndex) => {
    for (const tag of entry.tags || []) {
      const childIndex = indexByElement.get(String(tag).toLowerCase());
      if (childIndex === undefined || childIndex === parentIndex) continue;
      if (children[parentIndex].has(childIndex)) continue;
      children[parentIndex].add(childIndex);
      parentCounts[childIndex] += 1;
    }
  });

  const ordered = [];
  const placed = new Set();
  let progressed = true;
  while (progressed) {
    progressed = false;
    // Always take the first ready entry in default order, so the result is
    // deterministic and close to the default order.
    for (let index = 0; index < entries.length; index += 1) {
      if (placed.has(index) || parentCounts[index] !== 0) continue;
      placed.add(index);
      ordered.push(entries[index].id);
      for (const childIndex of children[index]) {
        parentCounts[childIndex] -= 1;
      }
      progressed = true;
      break;
    }
  }

  entries.forEach((entry, index) => {
    if (!placed.has(index)) {
      ordered.push(entry.id);
    }
  });
  return ordered;
};
