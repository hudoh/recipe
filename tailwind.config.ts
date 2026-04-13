import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FFF8F0',
        espresso: '#2C1810',
        caramel: '#D4A87A',
        sage: '#7A9E7E',
      },
    },
  },
  plugins: [],
};
export default config;