/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // ── KERNEL / CARGILL BRAND TOKENS ──
      colors: {
        // Base surfaces
        kernel: {
          bg:       '#080A06', // page background
          surface:  '#0F120C', // card / panel background
          surface2: '#161A12', // elevated surface
          border:   '#1E2618', // default border
          border2:  '#263020', // stronger border
        },

        // Cargill green — primary brand, merchant layer, trust signals
        green: {
          50:  '#F0F7E6',
          100: '#D8EDBC',
          200: '#BADE8E',
          300: '#9CCE60',
          400: '#7AC43A', // primary interactive green
          500: '#5A9424', // brand green
          600: '#3A6E14', // dark green
          700: '#2A5010',
          800: '#1A3A08',
          900: '#0A1A04',
          950: '#060E02',
        },

        // Grain gold / amber — originator layer, Sales pod, alerts
        amber: {
          50:  '#FFF8E6',
          100: '#FEECC0',
          200: '#FDD98A',
          300: '#FCC054',
          400: '#E8A030', // primary amber
          500: '#C47A18', // brand amber
          600: '#9A5A0E',
          700: '#724008',
          800: '#4A2804',
          900: '#281402',
        },

        // Sky blue — merchant pod accent, data visualization
        sky: {
          400: '#4A9AC8',
          500: '#2A6A9A',
          600: '#1A4A6E',
          700: '#0E2A40',
        },

        // Intelligence purple — ML layer, Platform DB, Kernel Signal
        violet: {
          400: '#8B7FE4',
          500: '#6B5FC4',
          600: '#4B3FA4',
          700: '#2B1F74',
          800: '#1B1044',
          900: '#0E0A18',
        },

        // Neutral text scale
        stone: {
          50:  '#EDF0E5',
          100: '#D8DDD0',
          200: '#B8C0A8',
          300: '#98A080',
          400: '#7A8468',
          500: '#5A6450',
          600: '#4A5440',
          700: '#3A4430',
          800: '#2A3422',
          900: '#1A2214',
          950: '#0E1208',
        },

        // Status colors
        status: {
          live:    '#7AC43A',
          build:   '#E8A030',
          future:  '#8B7FE4',
          warning: '#E85030',
          neutral: '#5A6450',
        },
      },

      // ── TYPOGRAPHY ──
      fontFamily: {
        display: ['Barlow Condensed', 'sans-serif'],  // headers, labels, pod names
        body:    ['IBM Plex Sans', 'sans-serif'],      // body copy, descriptions
        mono:    ['IBM Plex Mono', 'monospace'],       // data values, prices, codes
        sans:    ['IBM Plex Sans', 'sans-serif'],      // default
      },

      fontSize: {
        // Data display sizes — prices, positions, big numbers
        'data-xl':  ['48px', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'data-lg':  ['32px', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '600' }],
        'data-md':  ['24px', { lineHeight: '1.2', fontWeight: '600' }],
        'data-sm':  ['16px', { lineHeight: '1.3', fontWeight: '500' }],

        // Display / header sizes
        'display-lg': ['28px', { lineHeight: '1.1', letterSpacing: '0.02em', fontWeight: '700' }],
        'display-md': ['20px', { lineHeight: '1.2', letterSpacing: '0.03em', fontWeight: '700' }],
        'display-sm': ['14px', { lineHeight: '1.3', letterSpacing: '0.05em', fontWeight: '700' }],

        // Label sizes
        'label-lg': ['12px', { lineHeight: '1.4', letterSpacing: '0.08em', fontWeight: '600' }],
        'label-md': ['10px', { lineHeight: '1.4', letterSpacing: '0.1em',  fontWeight: '500' }],
        'label-sm': ['9px',  { lineHeight: '1.4', letterSpacing: '0.12em', fontWeight: '500' }],
      },

      // ── SPACING ──
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
      },

      // ── BORDERS ──
      borderRadius: {
        'card': '8px',
        'panel': '12px',
        'badge': '4px',
      },

      // ── SHADOWS ──
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'panel':   '0 4px 12px rgba(0,0,0,0.5)',
        'glow-green':  '0 0 12px rgba(90,148,36,0.25)',
        'glow-amber':  '0 0 12px rgba(196,122,24,0.25)',
        'glow-violet': '0 0 12px rgba(107,95,196,0.25)',
      },

      // ── ANIMATIONS ──
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.2s ease-in-out',
        'slide-in':   'slideIn 0.2s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },

  plugins: [],
}
