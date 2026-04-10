import { expect, test } from "@playwright/test";

test("startup advances past first action and renders live session frame", async ({
  page,
}) => {
  let nextStepCalls = 0;

  await page.route("**/api/session", async (route) => {
    const method = route.request().method();
    if (method === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    if (method !== "POST") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        sessionId: "session-123",
        sessionUrl:
          "https://www.browserbase.com/devtools-fullscreen/inspector.html?session=session-123",
        contextId: "ctx-123",
      }),
    });
  });

  await page.route("**/api/agent", async (route) => {
    const request = route.request();
    const payload = request.postDataJSON() as {
      action: "START" | "GET_NEXT_STEP" | "EXECUTE_STEP";
    };

    if (payload.action === "START") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          result: {
            text: "Navigating to https://example.com",
            reasoning: "Start from an accessible page",
            tool: "GOTO",
            instruction: "https://example.com",
          },
          steps: [],
          done: false,
        }),
      });
      return;
    }

    if (payload.action === "EXECUTE_STEP") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          done: false,
        }),
      });
      return;
    }

    nextStepCalls += 1;
    if (nextStepCalls === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          result: {
            text: "Click Search",
            reasoning: "Run the first interaction",
            tool: "ACT",
            instruction: "Click Search",
          },
          done: false,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        result: {
          text: "Task complete",
          reasoning: "Goal reached",
          tool: "CLOSE",
          instruction: "close",
        },
        done: true,
      }),
    });
  });

  await page.goto("/");
  await page.locator('input[name="message"]').fill("Find Browserbase");
  await page.getByRole("button", { name: "Run" }).click();

  await expect(page.locator('iframe[title="Browser Session"]')).toHaveAttribute(
    "src",
    /devtools-internal-compiled\/index\.html/
  );
  await expect(page.getByText("Step 1")).toBeVisible();
  await expect(page.getByText("Step 2")).toBeVisible();
  await expect(
    page.getByText("The agent has completed the task")
  ).toBeVisible();
});
