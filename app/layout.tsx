import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '블로그 스크랩 도구',
  description: '네이버 블로그 글을 스크랩하는 도구입니다.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
        <meta httpEquiv="Content-Security-Policy" content="frame-ancestors 'self';" />
        <style>{`
          .blog-content img {
            max-width: 100%;
            height: auto;
          }
          .error-content {
            padding: 1rem;
            border: 1px solid #f56565;
            background-color: #fff5f5;
            border-radius: 0.375rem;
            margin: 1rem 0;
          }
        `}</style>
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
} 