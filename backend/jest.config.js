/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        // Override tsconfig for tests: allow tests dir and include jest types
        rootDir: '.',
        types: ['jest', 'node'],
      },
      diagnostics: {
        // Ignore TS errors about rootDir since tests live outside src/
        ignoreDiagnostics: [6059, 6307],
      },
    }],
  },
};
