/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#1B4332',
          light: '#2D6A4F',
          dark: '#0F2919',
        },
        cream: {
          DEFAULT: '#FDF8F0',
          dark: '#F5EDE0',
        },
        accent: {
          DEFAULT: '#E76F00',
          light: '#F4A261',
          dark: '#C45A00',
        },
        success: '#388E3C',
        error: '#D32F2F',
        'success-light': '#66BB6A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        touch: '64px',
      },
      minWidth: {
        touch: '64px',
      },
      keyframes: {
        'cart-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        'cart-slide': {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'cart-pop': 'cart-pop 0.35s ease-out',
        'cart-slide': 'cart-slide 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
