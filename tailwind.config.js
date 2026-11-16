/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand — 🔴 ROJO EPN. Es el color de ACCIÓN (botones, estados críticos),
        // no el color de fondo: la estructura la sostiene el azul de `surface`.
        // Tomado del cuartel superior del escudo y de "SPORT" en el logo.
        brand: {
          50:  '#fef2f3',
          100: '#fde0e2',
          200: '#fbc0c4',
          300: '#f58087',
          400: '#f04a52',
          500: '#DA1F26',  // Rojo EPN
          600: '#c0181f',
          700: '#9e1219',
          800: '#7d0e13',
          900: '#5c0b0e',
          950: '#330608',
        },
        accent: {
          DEFAULT: '#D4A017',  // dorado del escudo (engranaje y cinta)
          light:   '#E9C46A',
          dark:    '#A87C0F',
        },
        // 🟢 Verde de "confirmado / disponible". Se oscureció para el tema
        // claro: el #19C37D original brillaba sobre negro pero sobre blanco
        // quedaba casi ilegible.
        pitch: {
          DEFAULT: '#0E9F6E',
          hover:   '#0B8459',
          soft:    '#34d399',
        },
        // 🟡 Dorado politécnico. `DEFAULT` es el tono legible como TEXTO sobre
        // blanco; `soft` es el amarillo de los círculos del sitio de la EPN,
        // pensado para FONDOS con texto oscuro encima.
        gold: {
          DEFAULT: '#A87C0F',
          soft:    '#F0B323',
        },
        // Acentos por categoría, oscurecidos para leerse sobre blanco.
        cat: {
          blue:   '#1D6FD1',
          violet: '#6D4AC4',
          teal:   '#0E8F95',
        },
        // Surface — ⚪ TEMA CLARO, como el sitio institucional de la EPN.
        // ⚠️ LEER ESTO ANTES DE TOCAR LA ESCALA. Está INVERTIDA respecto de lo
        // normal en Tailwind: los números ALTOS (800-950) son los FONDOS (casi
        // blancos) y los BAJOS (200-500) son los TEXTOS (oscuros). Se hizo así
        // para no reescribir 1041 usos de clases: la app venía de un tema oscuro
        // donde `bg-surface-900` era el fondo y `text-surface-400` el texto gris.
        // Cambiando qué COLOR hay en cada peldaño, todas esas clases siguen
        // significando lo mismo (fondo / texto secundario) pero en claro.
        surface: {
          50:  '#0A1220',  // (casi sin uso)
          100: '#0F1B2E',
          200: '#1E293B',  // texto fuerte
          300: '#334155',  // texto de cuerpo
          400: '#5B6A7D',  // texto secundario
          500: '#7B8899',  // íconos apagados
          600: '#CBD5E1',  // bordes marcados
          700: '#E4E9F0',  // bordes suaves / botón secundario
          800: '#FFFFFF',  // Tarjetas
          850: '#F7F9FC',  // Fondo secundario (hover, franjas)
          900: '#FFFFFF',  // Fondo principal / barras
          950: '#F1F4F8',  // Fondo de página del admin
        },
        // Texto principal: el azul casi negro del sitio de la Poli.
        // Reemplaza a `text-white`, que en tema claro sería invisible.
        ink: {
          DEFAULT: '#17202A',
          soft:    '#334155',
        },
        // Color de los bordes. Antes se usaba `border-white/5`, que sobre
        // fondo blanco no se ve.
        line: '#E2E8F0'
      },
      fontFamily: {
        // Manrope para toda la UI; Montserrat ExtraBold para titulares.
        // Anton (de La Fija) se cambió por Montserrat: menos "marca comercial",
        // más institucional-deportivo, y acompaña mejor al logo de PoliSport.
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Manrope', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        // Malla sutil roja en el fondo
        'hero-mesh': 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(30,62,114,0.10), transparent)',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%)',
      },
      animation: {
        'fade-in':     'fadeIn 0.4s ease-out',
        'slide-up':    'slideUp 0.5s ease-out',
        'slide-in':    'slideIn 0.35s ease-out',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer':     'shimmer 1.5s infinite',
        'glow':        'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },             to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(-20px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        shimmer: { '100%': { backgroundPosition: '-200% 0' } },
        // Brillo adaptado a color rojo
        glow:    { from: { boxShadow: '0 0 10px rgba(218,31,38,0.3)' }, to: { boxShadow: '0 0 25px rgba(218,31,38,0.6)' } },
      },
      boxShadow: {
        // En tema claro las sombras negras al 60% se ven sucias: van suaves y
        // azuladas, como las tarjetas del sitio de la EPN.
        'glow-sm':  '0 2px 8px rgba(218,31,38,0.20)',
        'glow-md':  '0 4px 14px rgba(218,31,38,0.28)',
        'glow-lg':  '0 8px 28px rgba(218,31,38,0.32)',
        'card':     '0 1px 3px rgba(16,32,64,0.08), 0 4px 16px rgba(16,32,64,0.06)',
        'card-hover': '0 4px 10px rgba(16,32,64,0.10), 0 12px 32px rgba(16,32,64,0.10)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}