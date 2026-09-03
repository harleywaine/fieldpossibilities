import './globals.css';
import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import { Header } from '@/components/layout/Header.tsx';
import { Footer } from '@/components/layout/Footer.tsx';

// Field International sets its site in Roboto; matching it keeps the prototype
// visually continuous with their own pages.
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Field Tooling Intelligence',
  description: 'Find the right tooling, faster. An intelligent interface to the Field International tooling catalogue.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={roboto.variable}>
      <body className="min-h-screen antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
