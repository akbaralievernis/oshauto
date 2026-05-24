import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OshAuto — Транспорт города Ош",
  description:
    "Современный сервис мониторинга городского транспорта Оша: маршруты, остановки, движение автобусов в реальном времени.",
  applicationName: "OshAuto",
  authors: [{ name: "OshAuto" }],
  keywords: [
    "Ош",
    "Кыргызстан",
    "автобус",
    "маршрутки",
    "транспорт",
    "карта",
    "маршруты"
  ]
};

export const viewport: Viewport = {
  themeColor: "#0d0d12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
