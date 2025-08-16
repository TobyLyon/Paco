module.exports = {
  '*.{js,ts,jsx,tsx}': [
    'eslint --fix',
    'prettier --write',
  ],
  '*.{json,css,html}': [
    'prettier --write',
  ],
  '**/*.{js,ts}': [
    'npm run validate:money', // Ensure no dangerous money arithmetic
  ],
};
