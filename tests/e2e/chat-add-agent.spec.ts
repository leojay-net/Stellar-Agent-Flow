import { expect, test } from "@playwright/test";

test("chat can add an agent to the canvas", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                reply: "Adding Stellar Asset Pricer to your canvas now.",
                action: "add_agent",
                agentId: "stellar-asset-pricer",
                model: "gemini-3.1-flash-lite-preview",
            }),
        });
    });

    await page.goto("/");

    await page.getByRole("button", { name: /chat/i }).click();
    await page.getByPlaceholder("Tell your agents what to do…").fill("add stellar asset pricer");
    await page.keyboard.press("Enter");

    await expect(page.getByText("Adding Stellar Asset Pricer to your canvas now.")).toBeVisible();
    await expect(page.getByTestId("canvas-node-stellar-asset-pricer")).toBeVisible();
});
