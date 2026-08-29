module.exports = {
  root: true,
  env: {
    commonjs: true,
    es2021: true,
    node: true,
    browser: true,
  },
  extends: ["eslint:recommended", "prettier"],
  parserOptions: {
    ecmaVersion: "latest",
  },
  rules: {
    "no-empty": "off",
  },
};
