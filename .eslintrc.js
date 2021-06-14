module.exports = {
  root: true,
  env: {
    es2020: true,
    node: true,
  },
  plugins: ["jest"],
  extends: [
    "eslint:recommended",
    "plugin:jest/recommended",
    "plugin:prettier/recommended",
  ],
  rules: {
    eqeqeq: ["error"],
  },
  overrides: [
    {
      files: ["*.ts"],
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint"],
      extends: [
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
      ],
    },
  ],
};
