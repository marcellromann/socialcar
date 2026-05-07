import './globals.css';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

export const metadata = {
  title: 'SocialCar — Marketplace automotivo',
  description: 'Compre e venda carros usados com facilidade na SocialCar.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`dark ${barlow.variable} ${barlowCondensed.variable}`}>
      <body className="min-h-screen flex flex-col bg-page text-white antialiased font-sans">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
