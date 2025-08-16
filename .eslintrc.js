module.exports = {
  env: {
    node: true,
    es2022: true,
    browser: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    // 🚨 HARD BANS: Never use float APIs for money
    'no-restricted-globals': ['error',
      { name: 'Number', message: 'Do not use Number() for money. Use toWei()/fromWei().' },
      { name: 'parseFloat', message: 'Do not use parseFloat() for money. Use parseEther()/parseUnits().' },
    ],
    'no-restricted-syntax': [
      'error',
      { selector: "CallExpression[callee.name='Number'] > *", message: 'No Number() on money. Use toWei()/fromWei().' },
      { selector: "CallExpression[callee.name='parseFloat']", message: 'No parseFloat() on money. Use parseEther()/parseUnits().' },
      { selector: "BinaryExpression[operator='*'] Identifier[name=/amount|balance|wei/i] Literal[value=/1e/]",
        message: 'No manual * 1e18. Use toWei()/fromWei().' },
      { selector: "BinaryExpression[operator='/'] Identifier[name=/amount|balance|wei/i] Literal[value=/1e/]",
        message: 'No / 1e18. Use formatUnits().' },
      {
        selector: 'CallExpression[callee.name="Number"][arguments.0.type="Identifier"]',
        message: 'Use BigInt for money calculations, not Number()',
      },
      {
        selector: 'CallExpression[callee.name="parseInt"][arguments.1.type!="Literal"][arguments.1.value!=10]',
        message: 'Always specify radix 10 for parseInt(), or use BigInt for money',
      },
      {
        selector: 'BinaryExpression[operator="+"][left.type="Identifier"][right.type="Identifier"]',
        message: 'Use explicit BigInt arithmetic for money calculations',
      },
      {
        selector: 'BinaryExpression[operator="-"][left.type="Identifier"][right.type="Identifier"]', 
        message: 'Use explicit BigInt arithmetic for money calculations',
      },
      {
        selector: 'BinaryExpression[operator="*"][left.type="Identifier"][right.type="Identifier"]',
        message: 'Use explicit BigInt arithmetic for money calculations',
      },
      {
        selector: 'BinaryExpression[operator="/"][left.type="Identifier"][right.type="Identifier"]',
        message: 'Use explicit BigInt arithmetic for money calculations',
      },
    ],
    
    // Code quality
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'off', // Allow console.log for server logging
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Import organization
    'sort-imports': ['error', { 
      ignoreCase: true,
      ignoreDeclarationSort: true,
    }],
    
    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js', '**/tests/**/*.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-unused-expressions': 'off',
      },
    },
  ],
};
