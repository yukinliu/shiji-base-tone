import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: '识己 · 底色｜你的自我观察卡',
  description: '用简化出生结构与三项现实选择，生成一张可以在日常中验证的自我观察卡。',
  openGraph: {
    title: '识己 · 底色',
    description: '先看见底色，再展开地图。生成一张可以在日常中验证的自我观察卡。',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: '识己 · 底色' }],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '识己 · 底色',
    description: '先看见底色，再展开地图。',
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
