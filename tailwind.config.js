/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  prefix: "",
  theme: {
    container: {
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'var(--font-outfit)', 'system-ui', 'sans-serif'],
        outfit: ['var(--font-outfit)', 'sans-serif'],
        rounded: ['Nunito', 'Inter', 'system-ui', 'sans-serif'], // Pet-friendly rounded font
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Enhanced pet-centric color palette
        petg: {
          purple: "#8844ee",
          yellow: "#ffdd22",
          white: "#ffffff",
        },
        // New pet-themed colors
        pet: {
          primary: "hsl(var(--pet-primary))", // Soft teal
          accent: "hsl(var(--pet-accent))", // Warm coral
          success: "hsl(var(--pet-success))", // Gentle green
          warning: "hsl(var(--pet-warning))", // Warm amber
          surface: "hsl(var(--pet-surface))", // Off-white surface
          'surface-elevated': "hsl(var(--pet-surface-elevated))", // Pure white for cards
        },
        // Extended warm color palette
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // Matches our pet-primary
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        coral: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444', // Base coral
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Enhanced pet-friendly radius values
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      spacing: {
        // Enhanced spacing for comfortable mobile layouts
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      boxShadow: {
        // Pet-themed soft shadows
        'pet-sm': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'pet': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'pet-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'pet-xl': '0 12px 32px rgba(0, 0, 0, 0.16)',
        // Teal glow for primary elements
        'teal-glow': '0 4px 16px rgba(20, 184, 166, 0.25)',
        'teal-glow-lg': '0 8px 24px rgba(20, 184, 166, 0.3)',
        // Coral glow for accent elements
        'coral-glow': '0 4px 16px rgba(255, 120, 90, 0.25)',
        'coral-glow-lg': '0 8px 24px rgba(255, 120, 90, 0.3)',
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Pet-themed animations
        'bounce-gentle': 'bounce-gentle 2s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        // Pet-themed keyframes
        'bounce-gentle': {
          '0%, 100%': {
            transform: 'translateY(-5%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
      lineHeight: {
        // Enhanced line heights for readability
        'relaxed': '1.75',
        'loose': '2',
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
} 