import './globals.css';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import BottomNav from '@/components/BottomNav';
import { AuthProvider } from '@/lib/auth';

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
  adjustFontFallback: false,
  preload: true,
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--font-barlow-condensed',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
  adjustFontFallback: false,
  preload: true,
});

export const metadata = {
  title: 'SocialCar — Compra e venda de carros',
  description: 'Marketplace mobile de carros usados com perfil inteligente do comprador.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#060801',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`dark ${barlow.variable} ${barlowCondensed.variable}`}>
      <body className="bg-page font-sans text-white antialiased">
        <AuthProvider>
          <div className="shell">
            {children}
            <BottomNav />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
