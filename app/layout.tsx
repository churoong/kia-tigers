import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "기아 타이거즈 오늘 어땠어? 🐯",
  description:
    "KIA 타이거즈 최근 경기·시리즈·최근 10경기를 유머러스하게 분석해주는 팬 심심풀이 웹앱. 베스트/워스트 선수는 덤.",
};

export const viewport: Viewport = {
  themeColor: "#EA0029",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
