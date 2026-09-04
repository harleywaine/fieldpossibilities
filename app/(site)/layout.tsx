import { Header } from '@/components/layout/Header.tsx';
import { Footer } from '@/components/layout/Footer.tsx';

/** The deep platform keeps full chrome; the tour renders its own. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
