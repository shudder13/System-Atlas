import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

// Correctness-focused lint: typescript-eslint recommended plus the react-hooks
// rules. exhaustive-deps is an error on purpose -- the stale-closure bug class
// it catches (a memoized callback reading a stale value) is invisible in review
// and was found in the wild here before this config existed.
export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "architecture/", ".claude/", "*.config.js"] },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/exhaustive-deps": "error"
    }
  },
  {
    rules: {
      // The pack loaders/normalizers legitimately traffic in unknown shapes;
      // unused vars are already a compile error via noUnusedLocals.
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "error"
    }
  }
);
