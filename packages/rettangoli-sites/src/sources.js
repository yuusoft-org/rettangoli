import path from 'path';
import yaml from 'js-yaml';

export function parseYamlWithContext(content, contextLabel) {
  try {
    return yaml.load(content, { schema: yaml.JSON_SCHEMA });
  } catch (error) {
    throw new Error(`${contextLabel}: Invalid YAML: ${error.message}`);
  }
}

// "directory", "file" or null. Symbolic links are followed; a broken one throws.
export function resolveDirentKind(fs, itemPath, item) {
  if (item.isDirectory()) {
    return 'directory';
  }

  if (item.isFile()) {
    return 'file';
  }

  if (typeof item.isSymbolicLink === 'function' && item.isSymbolicLink()) {
    let stats;
    try {
      stats = fs.statSync(itemPath);
    } catch (error) {
      throw new Error(`Broken symbolic link at "${itemPath}": ${error.message}`);
    }

    if (stats.isDirectory()) {
      return 'directory';
    }

    if (stats.isFile()) {
      return 'file';
    }
  }

  return null;
}

function isSchemaSidecarFile(fileName) {
  return fileName.endsWith('.schema.yaml') || fileName.endsWith('.schema.yml');
}

function isYamlFile(fileName) {
  return fileName.endsWith('.yaml') || fileName.endsWith('.yml');
}

// Read every .yaml/.yml file under dir (schema sidecars excepted) into tree, keyed by its
// path without the extension ("nav/main"). A later file with the same key replaces an earlier one.
export function readYamlTree(fs, dir, labelPrefix, tree = {}) {
  function readDir(currentDir, basePath) {
    // Checked per folder: skip a folder that vanished or cannot be searched since its parent was listed.
    if (!fs.existsSync(currentDir)) return;

    for (const item of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const itemPath = path.join(currentDir, item.name);
      const itemKind = resolveDirentKind(fs, itemPath, item);

      if (itemKind === 'directory') {
        readDir(itemPath, basePath ? `${basePath}/${item.name}` : item.name);
      } else if (itemKind === 'file' && isYamlFile(item.name) && !isSchemaSidecarFile(item.name)) {
        const fileContent = fs.readFileSync(itemPath, 'utf8');
        const nameWithoutExt = path.basename(item.name, path.extname(item.name));
        const key = basePath ? `${basePath}/${nameWithoutExt}` : nameWithoutExt;
        tree[key] = parseYamlWithContext(fileContent, `${labelPrefix} "${itemPath}"`);
      }
    }
  }

  readDir(dir, '');
  return tree;
}

// Read the top-level .yaml/.yml/.json files of dataDir into data, keyed by file name.
// A .json and a YAML file for the same key are rejected before any file is parsed.
export function readDataDir(fs, dataDir, data = {}) {
  if (!fs.existsSync(dataDir)) {
    return data;
  }

  const files = fs.readdirSync(dataDir);
  const yamlFilePaths = new Map();
  const jsonFilePaths = new Map();
  files.forEach(file => {
    const nameWithoutExt = path.basename(file, path.extname(file));
    if (isYamlFile(file)) {
      yamlFilePaths.set(nameWithoutExt, path.join(dataDir, file));
    } else if (file.endsWith('.json')) {
      jsonFilePaths.set(nameWithoutExt, path.join(dataDir, file));
    }
  });

  for (const [nameWithoutExt, jsonFilePath] of jsonFilePaths) {
    if (yamlFilePaths.has(nameWithoutExt)) {
      throw new Error(`Conflicting data files "${jsonFilePath}" and "${yamlFilePaths.get(nameWithoutExt)}": both define global data key "${nameWithoutExt}". Keep only one of them.`);
    }
  }

  files.forEach(file => {
    const filePath = path.join(dataDir, file);
    const nameWithoutExt = path.basename(file, path.extname(file));
    if (isYamlFile(file)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      data[nameWithoutExt] = parseYamlWithContext(fileContent, `data file "${filePath}"`);
    } else if (file.endsWith('.json')) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      try {
        data[nameWithoutExt] = JSON.parse(fileContent);
      } catch (error) {
        throw new Error(`data file "${filePath}": Invalid JSON: ${error.message}`);
      }
    }
  });

  return data;
}
