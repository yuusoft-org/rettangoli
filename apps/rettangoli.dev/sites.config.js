import { createMarkdownItAsync } from "./markdownItAsync.js";
import { codeToHtml } from "shiki";

export const configureMarkdown = () => {
  const md = createMarkdownItAsync({
    async highlight(code, lang, attrs) {
      if (attrs.includes("codePreview")) {
        const formattedCode = await codeToHtml(code, {
          lang,
          theme: "slack-dark",
        });
        return `
        <rtgl-view w="f" bw="xs" br="md">
          <rtgl-view w="f" p="lg">
          ${code}
          </rtgl-view>
          <rtgl-view h="1" w="f" bgc="bo"></rtgl-view>
          <rtgl-view w="f" d="h">
          ${formattedCode}
          </rtgl-view>
        </rtgl-view>`
        ;
      }
      return await codeToHtml(code, { lang, theme: "slack-dark" });
    },
    warnOnSyncRender: true,
  });

  return md;
};


export default {
    mdRender: configureMarkdown(),
    functions: {
        escapeJson: (data)=>{
            return encodeURIComponent(JSON.stringify(data))
        }
    }
}