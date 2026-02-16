import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import security from 'eslint-plugin-security';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}', '!dist/**', '!node_modules/**', '!coverage/**'],
    ignores: ['*.test.ts', '*.spec.ts', '**/__tests__/**/*'],
    languageOptions: {
      ecmaVersion: 12,
      sourceType: 'module',
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module'
      }
    },
    settings: {
      'import/resolver': 'node'
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'security': security,
      'import': importPlugin
    },
    rules: {
      indent: [
        'error',
        2
      ],
      'linebreak-style': [
        'error',
        'unix'
      ],
      quotes: [
        'error',
        'single'
      ],
      semi: [
        'error',
        'always'
      ],
      'no-console': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-shadow': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'no-useless-constructor': 'off',
      '@typescript-eslint/no-useless-constructor': 'error',
      'max-len': [
        'warn',
        {
          code: 120
        }
      ],
      'max-lines-per-function': [
        'warn',
        {
          max: 50,
          skipBlankLines: true,
          skipComments: true
        }
      ],
      'complexity': [
        'warn',
        {
          max: 10
        }
      ],
      'max-depth': [
        'warn',
        {
          max: 4
        }
      ],
      'max-params': [
        'warn',
        {
          max: 5
        }
      ],
      'no-duplicate-imports': 'error',
      'prefer-arrow-callback': 'error',
      'func-style': 'off',
      'no-empty-function': 'warn',
      'require-await': 'error',
      'no-return-await': 'error',
      'prefer-const': 'error',
      'no-implicit-coercion': 'error',
      'prefer-destructuring': [
        'error',
        {
          VariableDeclarator: {
            array: false,
            object: true
          },
          AssignmentExpression: {
            array: true,
            object: true
          }
        }
      ]
    }
  }
];
