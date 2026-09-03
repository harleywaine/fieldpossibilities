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
  title: 'Field AI Opportunity Lab',
  description:
    'Explore what AI could do for Field. A working exploration of how AI could improve the way ' +
    'Field sells, operates and uses its collective knowledge.',
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
