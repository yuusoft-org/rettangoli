import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { load as loadYaml, loadAll } from "js-yaml";
import { render, parse } from "jempl";

import {
  extractCategoryAndComponent,
  getAllFiles,
  flattenArrays,
} from "../common.js";
import { dirname } from "node:path";

/**
 * [
      {
        "rtgl-view#root d=v ah=c av=c w=f": [
          {
            "rtgl-view#app w=550 h=100vh ah=c": [
              {
                "rtgl-view#header ah=c ph=lg pv=xl w=f": [
                  {
                    "rtgl-text s=h1 ta=c c=fg": "Hello"
                  },
                  {
                    "rtgl-view d=h av=c mt=xl w=f": [
                      {
                        "rtgl-svg#toggle-all mr=sm svg=tick c=fg wh=48": null
                      },
                      {
                        "input#todo-input style=\"height: 48px; width: 100%; flex: 1;\" ph=xl w=f placeholder=\"Placeholder\"": null
                      }
                    ]
                  }
                ]
              },
              {
                "rtgl-view#main ah=c w=f": [
                  {
                    "rtgl-view#todo-list w=f": [
                      [
                        {
                          "rtgl-view#todo w=f g=xl d=h av=c pv=md ph=lg bwb=xs": [
                            {
                              "rtgl-view flex=1 d=h av=c": [
                                [
                                  {
                                    "rtgl-view#todo- bgc=fg w=16 h=16": null
                                  },
                                  {
                                    "rtgl-text c=er-fg ml=md": "Todo 1"
                                  }
                                ],
                                {
                                  "rtgl-view flex=1": null
                                },
                                {
                                  "rtgl-svg#delete- svg=cross c=fg wh=16": null
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "rtgl-view#todo w=f g=xl d=h av=c pv=md ph=lg bwb=xs": [
                            {
                              "rtgl-view flex=1 d=h av=c": [
                                [
                                  {
                                    "rtgl-svg#todo- svg=tick c=fg wh=16": null
                                  },
                                  {
                                    "rtgl-text c=su-fg ml=md": [
                                      {
                                        "del": "Todo 2"
                                      }
                                    ]
                                  }
                                ],
                                {
                                  "rtgl-view flex=1": null
                                },
                                {
                                  "rtgl-svg#delete- svg=cross c=fg wh=16": null
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    ]
                  }
                ]
              },
              {
                "rtgl-view#footer d=h p=md c=mu-fg av=c mt=xl": [
                  {
                    "rtgl-text": "1  left"
                  },
                  {
                    "rtgl-view w=8": null
                  },
                  {
                    "rtgl-button#filter-all s=sm v=lk": "All"
                  },
                  {
                    "rtgl-button#filter-active s=sm v=lk": "Active"
                  },
                  {
                    "rtgl-button#filter-completed s=sm v=lk": "Completed"
                  },
                  {
                    "rtgl-button#clear-completed s=sm v=lk": "Clear completed (1)"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
]
 */
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

const examples = () => {
  const examplesDir = "./example";

  const allFiles = getAllFiles([examplesDir]);

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
        const renderedView = flattenArrays(render({ ast, data: viewData }));
        const html = yamlToHtml(renderedView);
        output.push({
          category,
          component,
          index,
          html,
        });
      }
    });

  // console.log(JSON.stringify(output, null, 2));

  for (const { category, component, index, html } of output) {
    const fileName = `./viz/specs/${category}/${component}-${index}.html`;
    mkdirSync(dirname(fileName), { recursive: true });
    const addfrontMatter = (content) => {
      return `---\ntitle: ${component}-${index}\n---\n\n${content}`;
    };
    writeFileSync(fileName, addfrontMatter(html));
  }
};

export default examples;

examples();
