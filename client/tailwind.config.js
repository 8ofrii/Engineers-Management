// Tailwind config sourced from website design.txt — Material Design 3 token
// palette + Cairo (Arabic) and Inter (Latin) fonts.
//
// Critical: `corePlugins.preflight = false` disables Tailwind's base reset.
// The existing app uses inline styles + custom utility classes; if we let
// Tailwind reset margins/padding/etc. globally we'd break every page that
// hasn't been migrated to the new design system yet. Once every page is
// on Tailwind, we can flip preflight back on.

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,jsx,ts,tsx}'
    ],
    darkMode: 'class',
    corePlugins: {
        preflight: false
    },
    theme: {
        extend: {
            colors: {
                'surface-container-highest': '#e0e3e5',
                'secondary-fixed-dim': '#bec6e0',
                'surface-bright': '#f7f9fb',
                'on-secondary-fixed-variant': '#3f465c',
                'on-error-container': '#93000a',
                'tertiary-container': '#5e6e85',
                'primary-fixed': '#dbe1ff',
                'on-surface': '#191c1e',
                'surface-tint': '#0053db',
                'inverse-on-surface': '#eff1f3',
                'on-primary-fixed': '#00174b',
                'inverse-primary': '#b4c5ff',
                'on-secondary-container': '#5c647a',
                'on-tertiary': '#ffffff',
                'on-surface-variant': '#434655',
                'on-primary': '#ffffff',
                'on-error': '#ffffff',
                'primary-fixed-dim': '#b4c5ff',
                'error-container': '#ffdad6',
                'secondary': '#565e74',
                'on-secondary-fixed': '#131b2e',
                'surface-variant': '#e0e3e5',
                'tertiary': '#46566c',
                'outline': '#737686',
                'outline-variant': '#c3c6d7',
                'tertiary-fixed-dim': '#b7c8e1',
                'surface-container-high': '#e6e8ea',
                'surface-container-low': '#f2f4f6',
                'primary-container': '#2563eb',
                'inverse-surface': '#2d3133',
                'tertiary-fixed': '#d3e4fe',
                'on-tertiary-fixed-variant': '#38485d',
                'surface-container-lowest': '#ffffff',
                'surface-dim': '#d8dadc',
                'surface': '#f7f9fb',
                'secondary-container': '#dae2fd',
                'on-secondary': '#ffffff',
                'secondary-fixed': '#dae2fd',
                'error': '#ba1a1a',
                'background': '#f7f9fb',
                'surface-container': '#eceef0',
                'on-primary-fixed-variant': '#003ea8',
                'on-primary-container': '#eeefff',
                'on-tertiary-container': '#e9f0ff',
                'on-background': '#191c1e',
                'on-tertiary-fixed': '#0b1c30',
                'primary': '#004ac6',
                // Hesaby Theme Colors
                'hesaby-navy': '#0B1B3D',
                'hesaby-navy-light': '#142a59',
                'hesaby-white': '#FFFFFF',
                'hesaby-gray': '#F4F6F8',
                'hesaby-teal': '#00F0B5',
                'hesaby-orange': '#FF5A36',
                'hesaby-dark': '#060f22'
            },
            borderRadius: {
                DEFAULT: '0.25rem',
                lg: '0.5rem',
                xl: '0.75rem',
                full: '9999px'
            },
            spacing: {
                'margin-mobile': '16px',
                'sm': '8px',
                'margin-desktop': '32px',
                'base': '8px',
                'gutter': '16px',
                'md': '16px',
                'xl': '32px',
                'lg': '24px',
                'xs': '4px'
            },
            fontFamily: {
                'arabic-body': ['Cairo', 'system-ui', 'sans-serif'],
                'body-lg': ['Inter', 'system-ui', 'sans-serif'],
                'body-sm': ['Inter', 'system-ui', 'sans-serif'],
                'body-md': ['Inter', 'system-ui', 'sans-serif'],
                'label-caps': ['Inter', 'system-ui', 'sans-serif'],
                'h1': ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
                'h2': ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
                'h3': ['Cairo', 'Inter', 'system-ui', 'sans-serif']
            },
            fontSize: {
                'arabic-body': ['14px', { lineHeight: '1.7', fontWeight: '400' }],
                'body-lg':     ['16px', { lineHeight: '1.6', fontWeight: '400' }],
                'body-sm':     ['13px', { lineHeight: '1.5', fontWeight: '400' }],
                'body-md':     ['14px', { lineHeight: '1.5', fontWeight: '400' }],
                'label-caps':  ['12px', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '600' }],
                'h1':          ['32px', { lineHeight: '1.2', fontWeight: '700' }],
                'h2':          ['24px', { lineHeight: '1.3', fontWeight: '600' }],
                'h3':          ['20px', { lineHeight: '1.4', fontWeight: '600' }]
            },
            keyframes: {
                'float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' }
                },
                'pulse-glow': {
                    '0%, 100%': { opacity: 0.8, filter: 'brightness(1)' },
                    '50%': { opacity: 1, filter: 'brightness(1.2)' }
                },
                'fade-in-up': {
                    '0%': { opacity: 0, transform: 'translateY(20px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' }
                },
                'gradient-x': {
                    '0%, 100%': {
                        'background-size': '200% 200%',
                        'background-position': 'left center'
                    },
                    '50%': {
                        'background-size': '200% 200%',
                        'background-position': 'right center'
                    }
                }
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
                'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
                'gradient-x': 'gradient-x 4s ease infinite'
            }
        }
    },
    plugins: []
};
