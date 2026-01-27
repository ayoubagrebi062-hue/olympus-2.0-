import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // React hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Turn off noisy rules
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "no-useless-escape": "off",
      "no-control-regex": "off",
      "no-case-declarations": "off",
      "no-async-promise-executor": "off",
      "prefer-const": "off",
      "no-empty": "off",
      "require-yield": "off",

      // Keep important rules as warnings
      "@typescript-eslint/ban-ts-comment": "warn",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "coverage/**",
      ".olympus/**",
      ".olympus-cache/**",
      ".pixel-cache/**",
      "**/*.d.ts",
      "src/_disabled/**",
    ],
  }
);
