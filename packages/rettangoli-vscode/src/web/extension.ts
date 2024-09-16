import * as vscode from "vscode";

function toBase64(str: string) {
  // Encode the string into UTF-8 and then to Base64
  // @ts-ignore
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
}

function extractContentFromHtmlCommentTags(inputString: string) {
  const regex = /<!--rtgl-start-->([\s\S]*?)<!--rtgl-end-->/;
  const match = inputString.match(regex);
  console.warn('match', match)
  return match ? match[1].trim() : null;
}

function replaceContentWithHtmlCommentTags(
  originalString: string,
  newContent: string
) {
  const regex = /<!--rtgl-start-->([\s\S]*?)<!--rtgl-end-->/;
  return originalString.replace(
    regex,
    `<!--rtgl-start-->\n${newContent}\n<!--rtgl-end-->`
  );
}

function extractContentAfterLastDivider(inputString: string) {
  const lastDividerIndex = inputString.lastIndexOf("---");
  if (lastDividerIndex === -1) {
    return inputString;
  }
  return inputString.substring(lastDividerIndex + 3).trim();
}

function mergeInputs(input1: string, input2: string) {
  const lastDividerIndex = input1.lastIndexOf("---");
  if (lastDividerIndex === -1) {
    return input2;
  }
  // Extract everything before the last occurrence of '---' in input1
  const beforeDivider = input1.substring(0, lastDividerIndex + 3);
  // Concatenate with input2
  return beforeDivider + "\n" + input2.trim();
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "extension.openRettangoliVsCode",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const currentDocument = editor.document;
        const content = currentDocument.getText();

        const panel = vscode.window.createWebviewPanel(
          "rettangoliVsCode",
          "Rettangoli Editor VsCode",
          vscode.ViewColumn.One,
          {
            // Enable scripts in the webview
            enableScripts: true,
          }
        );

        // Pass the extensionUri and the content to the function
        panel.webview.html = await getWebviewContent(
          panel,
          context.extensionUri,
          content
        );

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
          (message) => {
            switch (message.command) {
              case "saveContent":
                saveContent(editor, message.content);
                return;
            }
          },
          undefined,
          context.subscriptions
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

async function getWebviewContent(
  panel: vscode.WebviewPanel,
  extensionUri: vscode.Uri,
  fileContent: string
): Promise<string> {
  // Define the paths for the CSS and JS files
  const rettangoliEditorStylesUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "rettangoli-editor.css")
  );
  const rettangoliUiWcScriptUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "rettangoli-ui.min.js")
  );
  const rettangoliEditorScriptUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "rettangoli-editor.js")
  );

  // Define the path for the HTML template file
  const htmlTemplateUri = vscode.Uri.joinPath(
    extensionUri,
    "media",
    "index.html"
  );

  // Read the HTML template content using vscode.workspace.fs
  const htmlTemplateData = await vscode.workspace.fs.readFile(htmlTemplateUri);
  let htmlContent = new TextDecoder("utf-8").decode(htmlTemplateData);
  console.log('fileContent', fileContent);

  let content =
    extractContentFromHtmlCommentTags(fileContent) ||
    extractContentAfterLastDivider(fileContent);
  console.log('content', content)

  // Replace placeholders in the HTML template with actual URIs and file content
  htmlContent = htmlContent.replace(
    /\$\{rettangoliEditorStylesUri\}/g,
    rettangoliEditorStylesUri.toString()
  );
  htmlContent = htmlContent.replace(
    /\$\{rettangoliUiWcScriptUri\}/g,
    rettangoliUiWcScriptUri.toString()
  );
  htmlContent = htmlContent.replace(
    /\$\{rettangoliEditorScriptUri\}/g,
    rettangoliEditorScriptUri.toString()
  );
  htmlContent = htmlContent.replace(/\$\{content\}/g, toBase64(content));
  htmlContent = htmlContent.replace(
    /\$\{cspSource\}/g,
    panel.webview.cspSource
  );

  return htmlContent;
}

async function saveContent(editor: vscode.TextEditor, content: string) {
  try {
    if (editor) {
      const document = editor.document;

      const edit = new vscode.WorkspaceEdit();

      const documentText = document.getText();

      let newContent = extractContentFromHtmlCommentTags(documentText)
        ? replaceContentWithHtmlCommentTags(documentText, content)
        : mergeInputs(documentText, content);

      edit.replace(
        document.uri,
        new vscode.Range(0, 0, document.lineCount, 0),
        newContent
      );
      return vscode.workspace.applyEdit(edit);
    } else {
      vscode.window.showInformationMessage("No active editor found");
    }
  } catch (error) {
    console.warn(error);
  }
}

export function deactivate() {}
