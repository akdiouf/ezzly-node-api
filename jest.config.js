module.exports = {
  clearMocks: true,
  verbose: true,
  globals: {},
  transform: {
    "^.+\\.ts?$": [
      "ts-jest",
      {
        diagnostics: {
          warnOnly: true,
        },
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  rootDir: "./tests",
  collectCoverage: true,
  clearMocks: true,
  // coverageDirectory: "coverage",
};
