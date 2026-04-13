import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 60_000,
    fullyParallel: false,
    retries: 0,
    reporter: "list",
    use: {
        baseURL: "http://127.0.0.1:3100",
    },
    webServer: {
        command:
            "NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npm run build && NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npm run start -- -p 3100",
        url: "http://127.0.0.1:3100",
        timeout: 240_000,
        reuseExistingServer: true,
    },
});
