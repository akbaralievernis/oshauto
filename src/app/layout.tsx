import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OshAuto — Ош шаарынын транспорту",
  description:
    "Ош шаарынын транспортун көзөмөлдөө кызматы: маршруттар, аялдамалар, автобустардын кыймылы реалдуу убакытта.",
  applicationName: "OshAuto",
  keywords: ["Ош", "Кыргызстан", "автобус", "маршрутка", "транспорт", "карта", "маршрут"]
};

export const viewport: Viewport = {
  themeColor: "#0b0b12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('oshauto_theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ky" className="antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
