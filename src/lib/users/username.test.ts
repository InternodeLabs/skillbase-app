import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeUsername, validateUsername } from "./username.ts";

describe("validateUsername", () => {
  it("accepts github-style handles", () => {
    for (const value of ["sean", "sean-shadmand", "a1", "user123"]) {
      const result = validateUsername(value);
      assert.equal(result.ok, true);
      if (result.ok) assert.equal(result.username, value);
    }
  });

  it("normalizes case and trim", () => {
    assert.equal(normalizeUsername("  Sean  "), "sean");
    const result = validateUsername("  Sean-Dev  ");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.username, "sean-dev");
  });

  it("rejects invalid shapes", () => {
    for (const value of [
      "a",
      "-sean",
      "sean-",
      "sean--dev",
      "Sean Dev",
      "sean_dev",
      "skills",
      "api",
    ]) {
      const result = validateUsername(value);
      assert.equal(result.ok, false, `expected reject: ${value}`);
    }
  });
});
