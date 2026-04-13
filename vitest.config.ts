import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        environment: "node",
        globals: true,
        include: ["src/**/*.test.ts"],
        exclude: ["tests/e2e/**", "node_modules/**"],
        setupFiles: ["./tests/setup/vitest.setup.ts"],
        clearMocks: true,
        restoreMocks: true,
        mockReset: true,
        coverage: {
            provider: "v8",
            reporter: ["text", "lcov"],
            include: ["src/**/*.ts", "src/**/*.tsx"],
            exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"],
            thresholds: {
                lines: 20,
                statements: 20,
                functions: 15,
                branches: 12,
            },
        },
    },
});
