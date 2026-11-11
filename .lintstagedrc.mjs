export default {
  "*.{ts,tsx,mjs,js}": ["prettier --write", "eslint --max-warnings=0"],
  "*.{json,md,css,yml,yaml}": ["prettier --write"],
  "contracts/**/*.rs": () => "cargo fmt --manifest-path contracts/vault/Cargo.toml -- --check",
};
