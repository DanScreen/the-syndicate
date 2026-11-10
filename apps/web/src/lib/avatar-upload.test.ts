import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { AVATAR_SIZE, greyscaleAvatar, normaliseAvatar } from "./avatar-upload";

describe("normaliseAvatar", () => {
  it("crops any image to a small square WebP", async () => {
    const wide = await sharp({
      create: { width: 1200, height: 600, channels: 3, background: "#38bdf8" },
    })
      .jpeg()
      .toBuffer();
    const out = await normaliseAvatar(wide);
    assert.ok(out);
    const meta = await sharp(out).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, AVATAR_SIZE);
    assert.equal(meta.height, AVATAR_SIZE);
  });

  it("strips EXIF metadata such as GPS position", async () => {
    const withExif = await sharp({
      create: { width: 400, height: 400, channels: 3, background: "#ffffff" },
    })
      .jpeg()
      .withExif({ IFD0: { Copyright: "secret location" } })
      .toBuffer();
    assert.ok((await sharp(withExif).metadata()).exif);
    const out = await normaliseAvatar(withExif);
    assert.ok(out);
    assert.equal((await sharp(out).metadata()).exif, undefined);
  });

  it("refuses formats other than ordinary photos, such as SVG", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
    assert.equal(await normaliseAvatar(svg), null);
  });

  it("rejects files that are not images", async () => {
    assert.equal(await normaliseAvatar(Buffer.from("definitely not a picture")), null);
  });
});

describe("greyscaleAvatar", () => {
  it("returns a same-size WebP with no colour", async () => {
    const colour = await normaliseAvatar(
      await sharp({
        create: { width: 300, height: 300, channels: 3, background: "#f59e0b" },
      })
        .png()
        .toBuffer()
    );
    assert.ok(colour);
    const out = await greyscaleAvatar(colour);
    const meta = await sharp(out).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, AVATAR_SIZE);
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 3) {
      assert.ok(Math.abs(data[i] - data[i + 1]) <= 2 && Math.abs(data[i + 1] - data[i + 2]) <= 2);
    }
  });
});
