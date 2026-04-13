import { expect, test } from "@playwright/test";

test("inspector policy check shows loading and success", async ({ page }) => {
    await page.route("**/api/payments/policy", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 250));
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                success: true,
                result: {
                    mode: "x402",
                    source: "onchain",
                    cacheKey: "testnet:agentflow",
                },
            }),
        });
    });

    await page.goto("/");

    await page.getByTestId("registry-search-input").fill("Stellar Payment Gateway");
    await page.getByTestId("registry-agent-stellar-x402-gateway").click();
    await page.getByTestId("canvas-node-stellar-x402-gateway").click();

    await page.locator('label:has-text("Policy Contract ID")').locator("xpath=following-sibling::input[1]").fill("CDUMMYCONTRACTID123456789");

    await page.getByTestId("policy-check-button").click();
    await expect(page.getByTestId("policy-check-button")).toContainText("Checking...");

    await expect(page.getByTestId("policy-check-success")).toContainText("Mode: x402");
    await expect(page.getByTestId("policy-check-success")).toContainText("Source: onchain");
});
