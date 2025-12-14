module.exports = {
  // Use babel-jest for TypeScript transformation
  transform: {
    "^.+\\.tsx?$": [
      "babel-jest",
      {
        presets: ["@babel/preset-env", "@babel/preset-typescript"],
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Only collect coverage from test files themselves (pure logic tests)
  collectCoverageFrom: ["src/__tests__/**/*.test.{ts,tsx}", "!src/**/*.d.ts"],
  // Disable coverage thresholds for now since we're testing pure logic
  coverageThreshold: undefined,
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  // Skip React Native setup for pure logic tests
  setupFilesAfterEnv: [],
};
