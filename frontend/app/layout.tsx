import type { Metadata } from "next";
import "./styles/design-system.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "선행지표 대시보드",
  description: "소비지출전망CSI·가처분소득·주류소비 선행지표",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
