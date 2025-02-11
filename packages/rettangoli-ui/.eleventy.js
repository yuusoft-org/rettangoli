
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
      entryPoints: ["./src/entry-iife-ui.js"],
      bundle: true,
      // splitting: true,  // Enable code splitting
      minify: false,
      // sourcemap: true,
      // outfile: "_site/scripts/main.js",
      outdir: "_site/scripts",
      // format: "esm",
      format: "iife",
    });
  });
  eleventyConfig.on("afterBuild", () => {
    return esbuild.build({
      // plugins: [httpPlugin],
      entryPoints: ["./src/entry-esm.js"],
      bundle: true,
      // splitting: true,  // Enable code splitting
      minify: false,
      // sourcemap: true,
      // outfile: "_site/scripts/main.js",
      outdir: "_site/scripts",
      // format: "esm",
      format: "esm",
    });
  });

  return {
    dir: {
      input: "pages",
    },
  };
};
