import { isolateInsideOfContainer, scopedPreflightStyles } from 'tailwindcss-scoped-preflight';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  prefix: 'aooth-',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        // ----GENERAL----
        White: '#FFFFFF',
        Dark: '#1A1D1F',
        'Dark-Two': '#272B30',
        'Dark-Three': '#1E1E1E',
        Primary: '#0C59DD',
        Warning: '#D85D5D',
        Success: '#4CB782',
        // ----ADDITIONAL----
        'Grey-One': '#6B6F76',
        'Grey-Two': '#C7C9D4',
        'Grey-Three': '#E2E3E8',
        'Grey-Four': '#E9EAF0',
        'Grey-Five': '#FBFBFE',
        'Grey-Six': '#7F7F7F',
        Background: '#F3F5F7',
        'Light-Blue': '#61B3FF',
        'Purple-Dark': '#094DC2',
        'Warning-Dark': '#BA4747',
        'Primary-Light': '#85ACEE',
      },
      fontSize: {
        'title-1-bold': ['24px', { lineHeight: '36px', fontWeight: '700' }],
        'title-2-bold': ['20px', { lineHeight: '28px', fontWeight: '700' }],
        'title-1-medium': ['24px', { lineHeight: '36px', fontWeight: '500' }],
        'title-2-medium': ['20px', { lineHeight: '28px', fontWeight: '500' }],
        'title-3-medium': ['16px', { lineHeight: '24px', fontWeight: '500' }],
        'body-1-bold': ['14px', { lineHeight: '20px', fontWeight: '700' }],
        'body-1-semiBold': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'body-1-medium': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'body-2-bold': ['13px', { lineHeight: '18px', fontWeight: '700' }],
        'body-2-semiBold': ['13px', { lineHeight: '18px', fontWeight: '600' }],
        'body-2-medium': ['13px', { lineHeight: '18px', fontWeight: '500' }],
        'caption-1-semiBold': ['12px', { lineHeight: '18px', fontWeight: '600' }],
        'caption-1-medium': ['12px', { lineHeight: '18px', fontWeight: '500' }],
        'caption-1-bold': ['11px', { lineHeight: '18px', fontWeight: '700' }],
        'caption-2-medium': ['11px', { lineHeight: '18px', fontWeight: '500' }],
        code: ['13px', { lineHeight: '18px', fontWeight: '500' }],
      },
      gridTemplateColumns: {
        providers: 'repeat(auto-fit, minmax(49px, 1fr))',
      },
      boxShadow: {
        dark: '3px 5px 13px 0px rgba(26, 29, 31, 0.15), -3px 5px 13px 0px rgba(26, 29, 31, 0.15)',
      },
    },
  },
  plugins: [
    scopedPreflightStyles({
      isolationStrategy: isolateInsideOfContainer('#aooth-wrapper'),
    }),
  ],
};
