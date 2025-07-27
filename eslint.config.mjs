import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.stylistic,
  tseslint.configs.strict,
  stylistic.configs.customize({
    semi: true,
    braceStyle: '1tbs',
    quoteProps: 'as-needed'
  }),
  {
    rules: {
      'no-console': 'error',
    },
  },
);
