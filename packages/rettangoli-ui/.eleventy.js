
import esbuild from "esbuild";
import httpPlugin from "esbuild-plugin-http";

export default function (eleventyConfig) {
  eleventyConfig.addWatchTarget("src/**/*.js");
  eleventyConfig.addPassthroughCopy('pages/**/*.css');
  eleventyConfig.addPassthroughCopy('pages/**/*.svg');
  eleventyConfig.addPassthroughCopy('pages/**/*.png');
  eleventyConfig.addPassthroughCopy('pages/**/*.jpg');
  eleventyConfig.addPassthroughCopy('pages/**/*.ogg');
  eleventyConfig.addPassthroughCopy('pages/**/*.mp3');
  eleventyConfig.addPassthroughCopy('pages/**/*.mp4');
  eleventyConfig.on("afterBuild", () => {
    return esbuild.build({
      plugins: [httpPlugin],
      entryPoints: ["./src/entry-ui.js"],
      bundle: true,
      // splitting: true,  // Enable code splitting
      minify: true,
      // sourcemap: true,
      // outfile: "_site/scripts/main.js",
      outdir: "_site/scripts",
      // format: "esm",
      format: "iife",
    });
  });

  return {
    dir: {
      input: "pages",
    },
  };
};
