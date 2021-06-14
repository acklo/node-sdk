import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node",
  verbose: true,
  roots: ["<rootDir>/src/"],
  // Turn on coverage explicitly by passing --coverage when running jest.
  collectCoverage: false,
  coverageDirectory: "<rootDir>/coverage",
  coveragePathIgnorePatterns: ["<rootDir>/src/quicktype/*"],
  setupFiles: ["<rootDir>/src/test/setupJest.ts"],
};
export default config;
