import type { Metadata } from 'next';
import '@/index.css';

export const metadata: Metadata = {
  title: 'Mitigar IA',
  description: 'An intelligent GitHub repository analyzer, security auditor, and Mitigar autonomous agent engine with spatiotemporal plugin architecture, real-time reasoning traces, and surgical remediation.',
  openGraph: {
    title: 'Mitigar IA',
    description: 'An intelligent GitHub repository analyzer, security auditor, and Mitigar autonomous agent engine with spatiotemporal plugin architecture, real-time reasoning traces, and surgical remediation.',
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#0b0c10] text-gray-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
