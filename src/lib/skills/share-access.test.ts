import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PRIVATE_SHARE_CODE,
  buildSkillSharePath,
  matchesPrivateShareCode,
} from "./share-access.ts";

describe("private skill share links", () => {
  it("accepts only the configured share code", () => {
    assert.equal(matchesPrivateShareCode(PRIVATE_SHARE_CODE), true);
    assert.equal(matchesPrivateShareCode("wrong"), false);
    assert.equal(matchesPrivateShareCode(null), false);
  });

  it("appends the share code for private skills so Sync/agents can fetch them", () => {
    assert.equal(
      buildSkillSharePath({
        skillId: "9508edee-985b-4701-b475-38c7a66834b9",
        visibility: "private",
        selectedVersionNumber: 2,
      }),
      `/skills/9508edee-985b-4701-b475-38c7a66834b9?code=${PRIVATE_SHARE_CODE}`,
    );
  });

  it("keeps public share links code-free", () => {
    assert.equal(
      buildSkillSharePath({
        skillId: "skill-1",
        visibility: "public",
        selectedVersionNumber: 1,
        shareForAgent: true,
        shareLockedVersion: true,
      }),
      "/skills/skill-1?v=1&raw=1",
    );
  });

  it("stacks agent + pinned + private code query params", () => {
    assert.equal(
      buildSkillSharePath({
        skillId: "skill-1",
        visibility: "private",
        selectedVersionNumber: 3,
        shareForAgent: true,
        shareLockedVersion: true,
      }),
      `/skills/skill-1?v=3&raw=1&code=${PRIVATE_SHARE_CODE}`,
    );
  });
});
