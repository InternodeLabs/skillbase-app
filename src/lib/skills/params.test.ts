import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseSkillFileSegment,
  skillBrowsePath,
  skillSharePath,
  vanitySkillPath,
} from "./params.ts";

describe("vanity skill paths", () => {
  it("builds /{username}/{slug}.md", () => {
    assert.equal(
      vanitySkillPath("Sean", "Summarize-Feedback.md"),
      "/sean/summarize-feedback.md",
    );
  });

  it("parses a .md file segment into a slug", () => {
    assert.equal(
      parseSkillFileSegment("summarize-feedback.md"),
      "summarize-feedback",
    );
    assert.equal(
      parseSkillFileSegment("SUMMARIZE-FEEDBACK.MD"),
      "summarize-feedback",
    );
    assert.equal(parseSkillFileSegment("no-extension"), null);
    assert.equal(parseSkillFileSegment(".md"), null);
    assert.equal(parseSkillFileSegment(""), null);
  });

  it("prefers vanity paths for in-app browsing", () => {
    assert.equal(
      skillBrowsePath({
        skillId: "skill-1",
        slug: "ios-agent",
        ownerUsername: "sshadmand",
        versionNumber: 2,
        latestVersionNumber: 3,
      }),
      "/sshadmand/ios-agent.md?v=2",
    );
  });

  it("falls back to UUID when username/slug are missing", () => {
    assert.equal(skillBrowsePath({ skillId: "skill-1" }), "/skills/skill-1");
  });

  it("forwards extra query params on the canonical share path", () => {
    assert.equal(
      skillSharePath("skill-1", {
        versionNumber: 2,
        raw: true,
        extra: { edit: "1", email: "a@b.com" },
      }),
      "/skills/skill-1?v=2&raw=1&edit=1&email=a%40b.com",
    );
  });
});
