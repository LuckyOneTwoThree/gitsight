import globals from "globals";

const eslintConfig = [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {},
  },
  {
    ignores: [
      "dist-electron/**",
      "dist-electron-output*/**",
      ".next/**",
      ".cache/**",
      "node_modules/**",
      "scripts/**",
      "pm/**",
    ],
  },
];

export default eslintConfig;
