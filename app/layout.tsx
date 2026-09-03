import './globals.css';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header.tsx';
import { Footer } from '@/components/layout/Footer.tsx';

export const metadata: Metadata = {
  title: 'Field Tooling Intelligence',
  description: 'Find the right tooling, faster. An intelligent interface to the Field International tooling catalogue.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
