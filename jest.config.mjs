const swc = [
  "@swc/jest",
  {
    jsc: {
      parser: { syntax: "typescript", tsx: true },
      transform: { react: { runtime: "automatic" } },
      target: "es2022",
    },
    module: { type: "commonjs" },
  },
];

const base = {
  transform: { "^.+\\.(t|j)sx?$": swc },
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "mjs", "cjs", "json"],
  // near-api-js and noble ship ESM; let swc transpile them for Jest.
  // Bun keeps packages under node_modules/.bun/<name@ver>/node_modules/.
  transformIgnorePatterns: [
    "/node_modules/(?!(\\.bun/[^/]+/node_modules/)?(near-api-js|@noble|@scure|borsh|@modelcontextprotocol)/)",
  ],
};

/** @type {import('jest').Config} */
export default {
  projects: [
    { ...base, displayName: "core", roots: ["<rootDir>/packages/core"] },
    { ...base, displayName: "agent", roots: ["<rootDir>/packages/agent"] },
    { ...base, displayName: "mcp", roots: ["<rootDir>/packages/mcp"] },
    {
      ...base,
      displayName: "web",
      roots: ["<rootDir>/apps/web"],
      testPathIgnorePatterns: ["/e2e/", "/dist/", "/.vinext/"],
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/apps/web/$1" },
    },
  ],
};
