import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Голоса под Москвой",
  description: "Пульт ведущего напольной ролевой игры о московском метро.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Голоса под Москвой — пульт ведущего",
    description: "Интерактивный граф метро, колесо испытаний и протокол возвращения.",
    images: [{ url: "/social-preview.png", width: 1731, height: 909, alt: "Игровая карта метро на столе ведущего" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
