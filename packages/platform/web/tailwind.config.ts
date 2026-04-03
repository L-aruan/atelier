import type { Config } from 'tailwindcss';
const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../ui-kit/src/**/*.{ts,tsx}',
    '../../tools/*/src/**/*.{ts,tsx}',
    '../../engines/*/src/**/*.{ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
};
export default config;
