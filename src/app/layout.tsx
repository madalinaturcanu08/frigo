import type { Metadata, Viewport } from 'next';
import { Archivo_Black, Doto, Onest, Outfit, Rubik } from 'next/font/google';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { THEME_COOKIE, isTheme } from '@/lib/theme';
import './globals.css';

const outfit = Outfit({ variable: '--font-outfit', subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'] });
const archivo = Archivo_Black({ variable: '--font-archivo', subsets: ['latin', 'latin-ext'], weight: '400' });
// Archivo Black and Outfit have no Cyrillic: Rubik / Onest fill in the Russian glyphs.
const rubik = Rubik({ variable: '--font-rubik', subsets: ['cyrillic'], weight: '800' });
const onest = Onest({ variable: '--font-onest', subsets: ['cyrillic'], weight: ['400', '500', '600', '700'] });
const doto = Doto({ variable: '--font-doto', subsets: ['latin'], weight: ['700', '900'] });

export const metadata: Metadata = {
  title: 'Frigo',
  description: 'A free food-waste coach for your family fridge.',
  // the name under the icon when added to an iPhone home screen
  appleWebApp: { title: 'Frigo' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7f2' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1217' },
  ],
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale();
  const theme = (await cookies()).get(THEME_COOKIE)?.value;

  return (
    <html
      lang={locale}
      data-theme={isTheme(theme) ? theme : undefined}
      className={`${outfit.variable} ${archivo.variable} ${doto.variable} ${rubik.variable} ${onest.variable}`}
    >
      <body className="min-h-dvh">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
