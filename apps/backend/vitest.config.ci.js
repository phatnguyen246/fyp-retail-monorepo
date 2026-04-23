import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["src/**/*.{spec,test}.js"],
        exclude: [
            "tests/pact/**",
        ],
        reporters: ["default", "junit", "json"],
        outputFile: {
            junit: "test-results/vitest-junit.xml",
            json: "test-results/vitest-report.json",
        },
    },
});
