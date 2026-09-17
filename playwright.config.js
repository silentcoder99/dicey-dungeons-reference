// @ts-check
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: [["list"]],
  // No dev server: pages are static and opened directly via file://.
  use: {
    trace: "retain-on-failure",
  },
  expect: {
    toHaveScreenshot: {
      // Small tolerance for anti-aliasing noise between runs; still tight enough
      // to catch real layout/color/shape regressions.
      maxDiffPixelRatio: 0.02,
    },
  },
  projects: [
    {
      name: "functional",
      testMatch: /(page|unit)\.spec\.js/,
      use: { viewport: { width: 1000, height: 800 } },
    },
    {
      name: "visual-mobile",
      testMatch: /visual\.spec\.js/,
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "visual-desktop",
      testMatch: /visual\.spec\.js/,
      use: { viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 },
    },
  ],
});
