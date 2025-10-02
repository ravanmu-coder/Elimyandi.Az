/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#1E88FF',
          purple: '#7C3AED',
          'blue-light': '#4A9EFF',
          'purple-light': '#9F67FF',
          'blue-dark': '#0D6EFD',
          'purple-dark': '#5B21B6',
        },
        card: {
          bg: '#0B1220',
          'bg-light': '#1A2332',
          'bg-dark': '#0A0F1A',
        },
        muted: {
          text: '#9FB3D4',
          'text-light': '#B8C7E0',
          'text-dark': '#7A8BA8',
        },
        accent: {
          primary: '#1E88FF',
          secondary: '#7C3AED',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
        }
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #1E88FF 0%, #7C3AED 100%)',
        'brand-gradient-hover': 'linear-gradient(135deg, #0D6EFD 0%, #5B21B6 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(11, 18, 32, 0.95) 0%, rgba(26, 35, 50, 0.9) 100%)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
};
