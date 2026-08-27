import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://yukinliu.github.io/shiji-base-tone/'),
  title: '识己 · 底色｜刘迷糊丨自我探索',
  description: '填写出生时空与三项现实选择，制作一张可以在日常中验证的识己底色卡片。认识自己，从看见开始。',
  openGraph: {
    title: '识己 · 底色｜刘迷糊丨自我探索',
    description: '认识自己，从看见开始。制作一张属于你的识己底色。',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: '识己 · 底色' }],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '识己 · 底色｜刘迷糊丨自我探索',
    description: '认识自己，从看见开始。',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
