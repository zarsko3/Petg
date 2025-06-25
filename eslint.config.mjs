import { dirname } from "path";
import { fileURLToPath } from "url";
import nextPlugin from '@next/eslint-plugin-next';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  {
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      '@next/next': nextPlugin,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...typescriptPlugin.configs.recommended.rules,
    },
  },
];
