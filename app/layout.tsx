import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "向前 · 求职工作台",
    description: "岗位分析、简历定制、投递跟进与面试训练的一站式求职工作台。",
    openGraph: {
      title: "向前 · 求职工作台",
      description: "从岗位理解，到拿下 Offer。",
      images: [{ url: `${origin}/og.png`, width: 1731, height: 909, alt: "向前求职工作台" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "向前 · 求职工作台",
      description: "从岗位理解，到拿下 Offer。",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
