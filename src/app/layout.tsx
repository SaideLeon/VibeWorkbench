import type { Metadata } from 'next';
import '@/index.css';

export const metadata: Metadata = {
  title: 'Mitigar IA - Security Auditor & Remediation',
  description: 'Auditoria de segurança, análise profunda de código e geração de blueprints (.patch) para projetos GitHub.',
  icons: {
    icon: [
      { url: '/api/icon', type: 'image/png' },
      { url: '/logo.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    shortcut: '/api/icon',
    apple: [
      { url: '/api/icon', sizes: '180x180', type: 'image/png' },
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/api/icon" type="image/png" />
        <link rel="apple-touch-icon" href="/api/icon" />
      </head>
      <body>{children}</body>
    </html>
  );
}
