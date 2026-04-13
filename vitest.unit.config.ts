import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        environment: "node",
        globals: true,
        include: ["src/**/*.unit.test.ts"],
        setupFiles: ["./tests/setup/vitest.setup.ts"],
        clearMocks: true,
        restoreMocks: true,
        mockReset: true,
    },
});
