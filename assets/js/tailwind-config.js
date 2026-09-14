// Shared Tailwind (Play CDN) theme. Load right after https://cdn.tailwindcss.com
tailwind.config = {
  theme: {
    extend: {
      colors: {
        main: '#09090B',
        sec: '#0F0F12',
        card: '#151518',
        elevated: '#1C1C20',
        pred: '#DC2626',
        bred: '#EF4444',
        dred: '#7F1D1D',
        sred: '#2A1012',
        ptext: '#FAFAFA',
        stext: '#A1A1AA',
        mtext: '#71717A',
        brder: '#27272A',
        brder2: '#3F3F46',
        rborder: 'rgba(220, 38, 38, 0.35)',
        success: '#22C55E',
        warn: '#F59E0B'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'ui-sans-serif', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      // Grows on large monitors; see --content-max in styles.css
      maxWidth: { content: 'var(--content-max)' },
      borderRadius: { btn: '10px', card: '16px' }
    }
  }
};
