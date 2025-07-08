import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { load as loadYaml, loadAll } from "js-yaml";
import { render, parse } from "jempl";

import {
  extractCategoryAndComponent,
  flattenArrays,
} from "../common.js";
import { getAllFiles } from "../commonBuild.js";
import path, { dirname } from "node:path";

const yamlToHtml = (renderedView) => {
  const processNode = (node) => {
    if (typeof node === "string") {
      return node;
    }

    if (Array.isArray(node)) {
      return node.map(processNode).join("");
    }

    if (typeof node === "object" && node !== null) {
      return Object.entries(node)
        .map(([key, value]) => {
          // Parse the key to extract element info
          const [elementPart, ...attributeParts] = key.split(" ");
          const [tagName, idPart] = elementPart.split("#");

          // Use tag name as-is
          const actualTagName = tagName;

          // Build attributes
          const attributes = [];

          // Add id if present
          if (idPart) {
            attributes.push(`id="${idPart}"`);
          }

          // Parse other attributes from the key
          const attrString = attributeParts.join(" ");
          if (attrString) {
            // Handle quoted attributes with regex
            const quotedMatches = attrString.match(/(\w+)="([^"]+)"/g);
            if (quotedMatches) {
              quotedMatches.forEach(match => {
                attributes.push(match);
              });
            }

            // Handle shorthand attributes (key=value format without quotes)
            const shorthandRegex = /(\w+)=([^\s"]+)/g;
            let shorthandMatch;
            const quotedAttributeNames = new Set();
            
            // First, collect all quoted attribute names to avoid duplicates
            if (quotedMatches) {
              quotedMatches.forEach(match => {
                const matchResult = match.match(/(\w+)="[^"]+"/);
                if (matchResult) {
                  const [, attrName] = matchResult;
                  quotedAttributeNames.add(attrName);
                }
              });
            }
            
            // Then add shorthand attributes that aren't already quoted
            while ((shorthandMatch = shorthandRegex.exec(attrString)) !== null) {
              const [, attrName, attrValue] = shorthandMatch;
              if (!quotedAttributeNames.has(attrName)) {
                attributes.push(`${attrName}="${attrValue}"`);
              }
            }

            // Handle standalone attributes (attributes without values)
            const remainingAttrs = attrString
              .replace(/(\w+)="[^"]+"/g, '') // Remove quoted attributes
              .replace(/(\w+)=[^\s"]+/g, '') // Remove shorthand attributes
              .trim()
              .split(/\s+/)
              .filter(attr => attr.length > 0);
            
            remainingAttrs.forEach(attr => {
              if (attr && !attr.includes('=')) {
                attributes.push(attr);
              }
            });
          }

          const attrStr =
            attributes.length > 0 ? " " + attributes.join(" ") : "";

          // Handle self-closing elements
          if (value === null) {
            if (actualTagName === "input") {
              return `<${actualTagName}${attrStr} />`;
            }
            return `<${actualTagName}${attrStr}></${actualTagName}>`;
          }

          // Handle elements with content
          const content = processNode(value);
          return `<${actualTagName}${attrStr}>${content}</${actualTagName}>`;
        })
        .join("");
    }

    return "";
  };

  return processNode(renderedView);
};

const examples = (options = {}) => {
  const { dirs, outputDir } = options;

  const allFiles = getAllFiles(dirs);

  const output = [];

  const examplesFiles = allFiles
    .filter((filePath) => {
      return filePath.endsWith(".examples.yaml");
    })
    .map((filePath) => {
      const viewFilePath = filePath.replace(".examples.yaml", ".view.yaml");
      const { category, component, fileType } =
        extractCategoryAndComponent(filePath);
      const [config, ...examples] = loadAll(readFileSync(filePath, "utf8"));
      const { template } = loadYaml(readFileSync(viewFilePath, "utf8"));

      for (const [index, example] of examples.entries()) {
        const { name, viewData } = example;
        const ast = parse(template);
        const renderedView = flattenArrays(render(ast, viewData, {}));
        const html = yamlToHtml(renderedView);
        output.push({
          category,
          component,
          index,
          html,
          name,
        });
      }
    });

  for (const { category, component, index, html, name } of output) {
    const fileName = path.join(outputDir, category, component, `${name}.html`);
    mkdirSync(dirname(fileName), { recursive: true });
    const addfrontMatter = (content) => {
      return `---\ntitle: ${component}-${index}\n---\n\n${content}`;
    };
    writeFileSync(fileName, addfrontMatter(html));
  }
};

export default examples;
