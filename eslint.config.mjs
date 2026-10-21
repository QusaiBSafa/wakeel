import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextVitals,
  { ignores: ['.next/**', '.next-build/**', 'screenshots/**', 'node_modules/**', 'public/**', 'drizzle/**', 'next-env.d.ts'] },
];

export default config;
