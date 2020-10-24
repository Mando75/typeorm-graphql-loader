module.exports = {
  env: {
    node: true
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    sourceType: "module"
  },
  plugins: ["@typescript-eslint", "prettier"],
  rules: {
    "prettier/prettier": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/indent": "off",
    "@typescript-eslint/member-delimiter-style": [
      "off",
      {
        multiline: {
          delimiter: "none",
          requireLast: true
        },
        singleline: {
          delimiter: "semi",
          requireLast: false
        }
      }
    ],
    "@typescript-eslint/member-ordering": [
      "error",
      {
        default: [
          "public-static-field",
          "protected-static-field",
          "private-static-field",
          "public-instance-field",
          "protected-instance-field",
          "private-instance-field",
          "public-constructor",
          "protected-constructor",
          "private-constructor",
          "public-static-method",
          "protected-static-method",
          "private-static-method",
          "public-instance-method",
          "protected-instance-method",
          "private-instance-method"
        ]
      }
    ],
    "@typescript-eslint/quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: true }],
    "@typescript-eslint/semi": ["error", "always"],
    "@typescript-eslint/type-annotation-spacing": "off",
    "arrow-parens": ["off", "as-needed"],
    "comma-dangle": "off",
    "eol-last": "off",
    "linebreak-style": "off",
    "max-len": "off",
    "new-parens": "off",
    "newline-per-chained-call": "off",
    "no-console": "off",
    "no-extra-semi": "off",
    "no-irregular-whitespace": "off",
    "no-multiple-empty-lines": "off",
    "no-trailing-spaces": "off",
    "object-curly-spacing": ["error", "always"],
    "prefer-const": ["error"],
    "quote-props": "off",
    "space-before-function-paren": "off",
    "space-in-parens": ["off", "never"],
  }
};
