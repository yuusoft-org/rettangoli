
import config from './config.js'
import configureView from './view.js';
import configureButton from './button.js'
import configureText from './text.js';
import configureImage from './image.js';

window.onload = () => {
  let vscode;
  try {
    vscode = acquireVsCodeApi(); // Acquire the VS Code API
  } catch (error) {
    //
  }
  const editor = grapesjs.init(config)
  configureView(editor);
  configureButton(editor);
  configureText(editor);
  configureImage(editor);

  // Define command
  // ...
  editor.Commands.add('show-traits', {
    getTraitsEl(editor) {
      const row = editor.getContainer().closest('.editor-row');
      return row.querySelector('.traits-container');
    },
    run(editor, sender) {
      this.getTraitsEl(editor).style.display = '';
    },
    stop(editor, sender) {
      this.getTraitsEl(editor).style.display = 'none';
    },
  });

  editor.Commands.add('show-blocks', {
    getRowEl(editor) { return editor.getContainer().closest('.editor-row'); },
    getStyleEl(row) { return row.querySelector('.blocks-container') },
  
    run(editor, sender) {
      const smEl = this.getStyleEl(this.getRowEl(editor));
      smEl.style.display = '';
    },
    stop(editor, sender) {
      const smEl = this.getStyleEl(this.getRowEl(editor));
      smEl.style.display = 'none';
    },
  });

  editor.Commands.add('save-body', {
    run: async function(editor, sender) {
        sender && sender.set('active');
        const html = editor.getHtml();

        // Regular expression to match the opening and closing body tags and capture the content in between
        const bodyRegex = /<body[^>]*>((.|[\n\r])*)<\/body>/im;
        const match = bodyRegex.exec(html);

        // If a body tag is found, use the content inside it; otherwise, use the entire HTML content
        const bodyContent = match ? match[1] : html;
        const formattedContent = await prettier.format(bodyContent, { 
          parser: "html",
          plugins: [prettierPlugins.html],
          htmlWhitespaceSensitivity: 'ignore'
      });

        try {

          const message = {
              command: 'saveContent',
              content: formattedContent // Assuming getBodyContent() is your function to get content
          };
  
          vscode.postMessage(message);
        } catch (error) {
          console.log(formattedContent)
          console.error(error);
        }

    }
});

  setTimeout(() => {
    const doc = editor.Canvas.getDocument()
    doc.body.children[1].style = "display: flex; flex: 1;"
    
    const head = doc.head;
    head.insertAdjacentHTML('beforeend', `<style>
        html {
          height: 100%;
          margin: 0;
        }
  
        body {
          height: 100%;
          margin: 0;
          font-family: Roboto, -apple-system, "Helvetica Neue", sans-serif;
        }
  
        :root {
          --color-primary: #000;
          --color-primary-hover: color-mix(in srgb, var(--color-primary) 85%, white 15%);
          --color-primary-active: color-mix(in srgb, var(--color-primary) 80%, white 20%);
  
          --color-on-primary: #fff;
          --color-primary-container: #555;
          --color-on-primary-container: #fff;
          --color-secondary: #ccc;
          --color-secondary-hover: color-mix(in srgb, var(--color-secondary) 85%, white 15%);
          --color-secondary-active: color-mix(in srgb, var(--color-secondary) 80%, white 20%);
  
          --color-on-secondary: #fff;
          --color-secondary-container: #ddd;
          --color-on-secondary-container: #fff;
          --color-error: #ff5555;
          --color-error-hover: color-mix(in srgb, var(--color-error) 85%, white 15%);
          --color-error-active: color-mix(in srgb, var(--color-error) 80%, white 20%);
  
          --color-on-error: #fff;
          --color-error-container: #ff9c9c;
          --color-on-error-container: #fff;
          --color-surface: #fff;
          --color-surface-container-low: #ccc;
          --color-surface-container: #ccc;
          --color-surface-container-high: #ccc;
          --color-on-surface: #000;
          --color-on-surface-variant: #555;
          --color-outline: #ccc;
          --color-outline-variant: #aaa;
          --color-inverse-surface: #000;
          --color-inverse-on-surface: #fff;
          --color-inverse-primary: #000;
  
          --spacing-xs: 2px;
          --spacing-s: 4px;
          --spacing-m: 8px;
          --spacing-l: 16px;
          --spacing-xl: 32px;
  
          --font-size-xs: 12px;
          --font-size-s: 14px;
          --font-size-m: 16px;
          --font-size-l: 22px;
          --font-size-xl: 28px;
          --font-size-xxl: 45px;
  
          --typography-display-m-font-size: var(--font-size-xxl);
          --typography-display-m-font-weight: 400;
          --typography-display-m-line-height: 52px;
          --typography-display-m-letter-spacing: normal;
  
          --typography-headline-m-font-size: var(--font-size-xl);
          --typography-headline-m-font-weight: 400;
          --typography-headline-m-line-height: 36px;
          --typography-headline-m-letter-spacing: normal;
  
          --typography-title-l-font-size: var(--font-size-l);
          --typography-title-l-font-weight: 400;
          --typography-title-l-line-height: 28px;
          --typography-title-l-letter-spacing: normal;
  
          --typography-title-m-font-size: var(--font-size-m);
          --typography-title-m-font-weight: 500;
          --typography-title-m-line-height: 36px;
          --typography-title-m-letter-spacing: 0.15px;
  
          --typography-title-s-font-size: var(--font-size-s);
          --typography-title-s-font-weight: 500;
          --typography-title-s-line-height: 20px;
          --typography-title-s-letter-spacing: 0.1px;
  
          --typography-body-l-font-size: var(--font-size-m);
          --typography-body-l-font-weight: 400;
          --typography-body-l-line-height: 24px;
          --typography-body-l-letter-spacing: 0.5px;
  
          --typography-body-m-font-size: var(--font-size-s);
          --typography-body-m-font-weight: 400;
          --typography-body-m-line-height: 20px;
          --typography-body-m-letter-spacing: 0.25px;
  
          --typography-body-s-font-size: var(--font-size-xs);
          --typography-body-s-font-weight: 400;
          --typography-body-s-line-height: 16px;
          --typography-body-s-letter-spacing: 0.4px;
  
          --typography-label-l-font-size: var(--font-size-s);
          --typography-label-l-font-weight: 500;
          --typography-label-l-line-height: 20px;
          --typography-label-l-letter-spacing: 0.1px;
  
          --typography-label-m-font-size: var(--font-size-xs);
          --typography-label-m-font-weight: 500;
          --typography-label-m-line-height: 16px;
          --typography-label-m-letter-spacing: 0.5px;
        }
    </style>`)
  })

  setTimeout(() => {
    function fromBase64(base64) {
      // Decode from Base64, then decode URI component for UTF-8 support
      return decodeURIComponent(Array.from(atob(base64)).map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));
    }
    editor.setComponents(window.initialContent ? fromBase64(window.initialContent) : "");
  })
};
