module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  maxWorkers: 1,
  testTimeout: 30000,
  globals: {
    "ts-jest": {},
  },
  env: {
    NODE_ENV: "test",
  },
};
