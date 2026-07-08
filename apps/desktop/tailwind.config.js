const path = require('path')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, 'src/**/*.{ts,tsx,html}')
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Host Grotesk Variable', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI', 'sans-serif']
      },
      colors: {
        bg: {
          base:    'hsl(var(--bg-base))',
          raised:  'hsl(var(--bg-raised))',
          overlay: 'hsl(var(--bg-overlay))',
          subtle:  'hsl(var(--bg-subtle))',
          input:   'hsl(var(--bg-input))'
        },
        border: {
          DEFAULT: 'hsl(var(--border))',
          strong:  'hsl(var(--border-strong))'
        },
        text: {
          primary:   'hsl(var(--text-primary))',
          secondary: 'hsl(var(--text-secondary))',
          tertiary:  'hsl(var(--text-tertiary))'
        },
        destructive: 'hsl(var(--destructive))',
        success:     'hsl(var(--success))',
        warning:     'hsl(var(--warning))'
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)'
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)'
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs:    ['11px', '16px'],
        sm:    ['12px', '18px'],
        base:  ['13px', '20px'],
        md:    ['14px', '20px'],
        lg:    ['16px', '24px'],
        xl:    ['18px', '28px']
      }
    }
  },
  plugins: []
}
