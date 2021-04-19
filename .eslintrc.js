module.exports = {
  extends: ['plugin:@dazn/eslint-plugin-atlantis-evo/strict'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json', './tsconfig.test.json'],
    tsconfigRootDir: __dirname,
  },
  rules: {
    'import/no-extraneous-dependencies': 'off', // disabling to avoid types as deps
  },
};
