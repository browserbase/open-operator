import { describe, expect, it } from "vitest";
import {
  buildBrowserSettings,
  buildSessionCreateParams,
  getClosestRegion,
} from "../../app/api/session/route";

describe("session creation regression coverage", () => {
  it("always enables advanced stealth and persistent context", () => {
    expect(buildBrowserSettings("ctx-1")).toEqual({
      advancedStealth: true,
      context: {
        id: "ctx-1",
        persist: true,
      },
    });
  });

  it("builds session params with required defaults", () => {
    expect(
      buildSessionCreateParams({
        projectId: "proj-1",
        timezone: "America/New_York",
        contextId: "ctx-1",
      })
    ).toEqual({
      projectId: "proj-1",
      browserSettings: {
        advancedStealth: true,
        context: {
          id: "ctx-1",
          persist: true,
        },
      },
      keepAlive: true,
      region: "us-east-1",
    });
  });

  it("falls back to us-west-2 for invalid timezones", () => {
    expect(getClosestRegion("not/a-timezone")).toBe("us-west-2");
  });
});
