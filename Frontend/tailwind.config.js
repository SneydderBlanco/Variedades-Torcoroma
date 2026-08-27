/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        torcoroma: {
          gold: '#ffd535',       // Amarillo oficial de la marca
          dark: '#111827',       // Negro profundo para textos/títulos/sidebar
          light: '#F9FAFB',      // Fondo general gris ultra claro limpio
          green: '#10B981',      // Semáforo: stock alto (verde)
          orange: '#F5C227',     // Semáforo: stock bajo (amarillo oro oficial)
          gray: '#E5E7EB',       // Semáforo: agotado (gris claro)
        }
      }
    },
  },
  plugins: [],
}
