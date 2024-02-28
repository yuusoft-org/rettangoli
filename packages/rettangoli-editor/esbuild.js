const esbuild = require('esbuild');
const httpPlugin = require('esbuild-plugin-http');
const fs = require('fs');

esbuild.build({
  entryPoints: ['main.js'],
  bundle: true,
  outfile: './dist/rettangoli-editor.js',
  plugins: [httpPlugin]
}).catch(() => process.exit(1));

fs.copyFileSync('../rettangoli-ui-wc/dist/rettangoli-ui.min.js', './dist/rettangoli-ui.min.js');
