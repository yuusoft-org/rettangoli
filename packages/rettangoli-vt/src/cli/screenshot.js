import generate from "./generate.js";

export default async function screenshot(options = {}) {
  await generate({
    ...options,
    captureScreenshots: true,
  });
}
