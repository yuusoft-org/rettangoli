import { afterEach, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { renderVNodeToString } from "../../src/tui/renderer.js";
import { __resetKittyImageCacheForTests } from "../../src/primitives/image.js";

const ONE_PIXEL_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+R9kAAAAASUVORK5CYII=";
const ONE_PIXEL_JPEG_BASE64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAoHBwgHBgoICAoKCgkLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoKCg0NDh0QEh0rJSsrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrK//wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAgEAACAQMFAQAAAAAAAAAAAAABAgMABAUREiExQVFh/8QAFAEBAAAAAAAAAAAAAAAAAAAAAv/EABYRAQEBAAAAAAAAAAAAAAAAAAABEf/aAAwDAQACEQMRAD8An7Q0wYq2Pq2pGz3LFmCnHcCnKkydxWq5dW3J2nY2YVw3tJQf/Z";

const renderImageVNode = (attrs = {}, key = "img-node") => {
  return renderVNodeToString({
    vNode: {
      sel: "rtgl-image",
      data: {
        attrs,
        key,
      },
      children: [],
    },
  });
};

describe("rtgl-image primitive", () => {
  afterEach(() => {
    delete process.env.RETTANGOLI_TUI_FORCE_KITTY;
    delete process.env.RETTANGOLI_TUI_DISABLE_KITTY;
    __resetKittyImageCacheForTests();
  });

  it("renders kitty transfer command first, then placement command", () => {
    process.env.RETTANGOLI_TUI_FORCE_KITTY = "1";

    const first = renderImageVNode({
      data: ONE_PIXEL_PNG_BASE64,
      w: 2,
      h: 1,
    });
    const second = renderImageVNode(
      {
        data: ONE_PIXEL_PNG_BASE64,
        w: 2,
        h: 1,
      },
      "img-node-2",
    );

    expect(first).toContain("\u001b_Ga=T");
    expect(first).toContain("f=100");
    expect(first).toContain("c=2,r=1");
    expect(second).toContain("\u001b_Ga=p");
    expect(second).not.toContain("\u001b_Ga=T");
  });

  it("falls back to alt text when kitty support is disabled", () => {
    process.env.RETTANGOLI_TUI_DISABLE_KITTY = "1";

    const output = renderImageVNode({
      data: ONE_PIXEL_PNG_BASE64,
      alt: "image unavailable",
    });

    expect(output).toBe("image unavailable");
    expect(output).not.toContain("\u001b_G");
  });

  it("auto-enables kitty image output for ghostty", () => {
    const originalTermProgram = process.env.TERM_PROGRAM;
    try {
      process.env.TERM_PROGRAM = "ghostty";

      const output = renderImageVNode({
        data: ONE_PIXEL_PNG_BASE64,
        alt: "auto fallback",
      });

      expect(output).toContain("\u001b_G");
      expect(output).not.toBe("auto fallback");
    } finally {
      if (originalTermProgram === undefined) {
        delete process.env.TERM_PROGRAM;
      } else {
        process.env.TERM_PROGRAM = originalTermProgram;
      }
    }
  });

  it("falls back to alt text when src points to a git lfs pointer file", () => {
    process.env.RETTANGOLI_TUI_FORCE_KITTY = "1";

    const fixturePath = path.join(
      os.tmpdir(),
      "rettangoli-tui-image-lfs-pointer.txt",
    );
    writeFileSync(
      fixturePath,
      [
        "version https://git-lfs.github.com/spec/v1",
        "oid sha256:deadbeef",
        "size 123",
        "",
      ].join("\n"),
      "utf8",
    );

    const output = renderImageVNode({
      src: fixturePath,
      alt: "lfs image unavailable",
    });

    expect(output).toBe("lfs image unavailable");
    expect(output).not.toContain("\u001b_G");
  });

  it("falls back for non-png inline image data", () => {
    process.env.RETTANGOLI_TUI_FORCE_KITTY = "1";

    const output = renderImageVNode({
      data: ONE_PIXEL_JPEG_BASE64,
      alt: "png only",
    });

    expect(output).toBe("png only");
    expect(output).not.toContain("\u001b_G");
  });
});
