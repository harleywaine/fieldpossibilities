import './globals.css';
import type { Metadata } from 'next';
import { Roboto, IBM_Plex_Mono } from 'next/font/google';

// Roboto is Field's own typeface (light for headings, as on fieldinternational.com).
// IBM Plex Mono is load-bearing: part numbers, references and figures read as data.
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Field AI Opportunity Lab',
  description:
    'Follow one enquiry through Field, from the customer’s request to the factory, ' +
    'built on Field International’s own published catalogue.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${roboto.variable} ${plexMono.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
