import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkEmailFormat, signUpEmailSchema } from "./email";

describe("checkEmailFormat", () => {
  it("accepts ordinary addresses", () => {
    for (const email of [
      "dan@gmail.com",
      "first.last+acca@example-mail.co.uk",
      "  Mixed.Case@Outlook.com  ",
      "o'neill@btinternet.com",
    ]) {
      assert.deepEqual(checkEmailFormat(email), { ok: true }, email);
    }
  });

  it("rejects malformed addresses", () => {
    for (const email of [
      "",
      "dan",
      "dan@",
      "@gmail.com",
      "dan@gmail",
      "dan@@gmail.com",
      "dan@gmail..com",
      ".dan@gmail.com",
      "dan.@gmail.com",
      "dan..x@gmail.com",
      "dan smith@gmail.com",
      "dan@-gmail.com",
      "dan@gmail.c",
      "dan@gmail.123",
      "dan@192.168.0.1",
      `${"a".repeat(65)}@gmail.com`,
    ]) {
      assert.equal(checkEmailFormat(email).ok, false, email);
    }
  });

  it("rejects reserved domains that can never receive mail", () => {
    for (const email of ["a@example.com", "a@foo.test", "a@foo.invalid", "a@box.localhost"]) {
      assert.equal(checkEmailFormat(email).ok, false, email);
    }
  });

  it("suggests the intended domain for common typos", () => {
    assert.deepEqual(checkEmailFormat("dan@gmail.con"), {
      ok: false,
      message: "Did you mean dan@gmail.com?",
    });
    assert.deepEqual(checkEmailFormat("Dan@Hotmial.com"), {
      ok: false,
      message: "Did you mean dan@hotmail.com?",
    });
  });
});

describe("signUpEmailSchema", () => {
  it("normalises to trimmed lower case", () => {
    assert.equal(signUpEmailSchema.parse("  Dan@Gmail.COM "), "dan@gmail.com");
  });

  it("surfaces the specific message", () => {
    const result = signUpEmailSchema.safeParse("dan@gmail.con");
    assert.equal(result.success, false);
    assert.equal(result.error?.issues[0]?.message, "Did you mean dan@gmail.com?");
  });
});
