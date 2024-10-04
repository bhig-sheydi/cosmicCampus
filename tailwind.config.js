/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      boxShadow: {
        'purple-500': '0 1px 2px rgba(236, 72, 153, 0.3)', // pink-500 shadow color
      },
      keyframes: {
        rotate3d: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
        shadowRotate: {
          '0%': { transform: 'translateX(-50%) scaleX(1)' },
          '25%': { transform: 'translateX(-40%) scaleX(0.8)' },
          '50%': { transform: 'translateX(-50%) scaleX(0.6)' },
          '75%': { transform: 'translateX(-60%) scaleX(0.8)' },
          '100%': { transform: 'translateX(-50%) scaleX(1)' },
        },
      },
      animation: {
        'rotate-3d': 'rotate3d 8s linear infinite',
        'shadow-rotate': 'shadowRotate 8s linear infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
