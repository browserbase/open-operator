import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../app/api/session/route";

const mocks = vi.hoisted(() => ({
  contextsCreate: vi.fn(),
  sessionsCreate: vi.fn(),
  sessionsDebug: vi.fn(),
}));

vi.mock("@browserbasehq/sdk", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      contexts: {
        create: mocks.contextsCreate,
      },
      sessions: {
        create: mocks.sessionsCreate,
        debug: mocks.sessionsDebug,
      },
    })),
  };
});

describe("session API integration coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BROWSERBASE_API_KEY = "bb-key";
    process.env.BROWSERBASE_PROJECT_ID = "bb-proj";
    mocks.contextsCreate.mockResolvedValue({ id: "ctx-generated" });
    mocks.sessionsCreate.mockResolvedValue({ id: "session-1" });
    mocks.sessionsDebug.mockResolvedValue({
      debuggerFullscreenUrl:
        "https://www.browserbase.com/devtools-fullscreen/inspector.html?foo=bar",
    });
  });

  it("creates a context when one is not provided and keeps required settings", async () => {
    const response = await POST(
      new Request("http://localhost/api/session", {
        method: "POST",
        body: JSON.stringify({
          timezone: "America/New_York",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sessionId: "session-1",
      sessionUrl:
        "https://www.browserbase.com/devtools-fullscreen/inspector.html?foo=bar",
      contextId: "ctx-generated",
    });

    expect(mocks.contextsCreate).toHaveBeenCalledWith({ projectId: "bb-proj" });
    expect(mocks.sessionsCreate).toHaveBeenCalledWith({
      projectId: "bb-proj",
      browserSettings: {
        advancedStealth: true,
        context: {
          id: "ctx-generated",
          persist: true,
        },
      },
      keepAlive: true,
      region: "us-east-1",
    });
  });

  it("reuses an existing context id when provided", async () => {
    const response = await POST(
      new Request("http://localhost/api/session", {
        method: "POST",
        body: JSON.stringify({
          timezone: "America/Los_Angeles",
          contextId: "ctx-existing",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.contextsCreate).not.toHaveBeenCalled();
    expect(mocks.sessionsCreate).toHaveBeenCalledWith({
      projectId: "bb-proj",
      browserSettings: {
        advancedStealth: true,
        context: {
          id: "ctx-existing",
          persist: true,
        },
      },
      keepAlive: true,
      region: "us-west-2",
    });
  });
});
