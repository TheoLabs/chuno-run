import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * 공용 ESLint flat config. 각 앱의 eslint.config.js에서 import 해 사용한다.
 */
export default tseslint.config(
  { ignores: ["dist/**", "build/**", "node_modules/**", ".turbo/**"] },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
);
