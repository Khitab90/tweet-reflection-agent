import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import security from "eslint-plugin-security";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: { security },
    rules: {
      ...security.configs.recommended.rules,
      // False-positive prone on safe Record<string, T> lookups with closed string-literal unions
      "security/detect-object-injection": "off",
    },
  },
];

export default eslintConfig;
