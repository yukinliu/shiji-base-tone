import type { Metadata } from 'next';
import './globals.css';

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shenhua.mihuspace.com/';
const siteUrl = rawSiteUrl.endsWith('/') ? rawSiteUrl : `${rawSiteUrl}/`;
const ogUrl = new URL('og-v2.png', siteUrl).toString();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: '识己 · 神话原型｜刘迷糊丨自我探索',
  description: '你的生命故事里，住着哪位神话人物？约3分钟，生成你的神话原型与生命意象。',
  openGraph: {
    title: '你的生命故事里，住着哪位神话人物？',
    description: '约3分钟，生成你的神话原型与生命意象。',
    url: siteUrl,
    siteName: '刘迷糊丨自我探索',
    images: [{ url: ogUrl, width: 1731, height: 909, alt: '识己 · 神话原型' }],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '你的生命故事里，住着哪位神话人物？',
    description: '约3分钟，生成你的神话原型与生命意象。',
    images: [ogUrl],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
