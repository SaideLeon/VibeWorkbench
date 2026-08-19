import type { Metadata } from 'next';
import '@/index.css';

export const metadata: Metadata = {
  title: 'Vibe Workbench - Security Auditor & Remediation',
  description: 'Auditoria de segurança, análise profunda de código e geração de blueprints (.patch) para projetos GitHub.',
  icons: {
    icon: [
      { url: '/api/icon', type: 'image/jpeg' },
      { url: '/icon.jpg', type: 'image/jpeg' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    shortcut: '/api/icon',
    apple: [
      { url: '/api/icon', sizes: '180x180', type: 'image/jpeg' },
      { url: '/apple-touch-icon.jpg', sizes: '180x180', type: 'image/jpeg' }
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/api/icon" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/api/icon" />
      </head>
      <body>{children}</body>
    </html>
  );
}
