import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '블로그 스크랩 도구',
  description: '네이버 블로그 포스트를 스크랩하는 도구',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
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
      <body className={`${inter.className} h-screen flex flex-col`}>
        <header className="bg-blue-600 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <Link href="/" className="flex items-center">
                  <h1 className="text-xl font-bold">블로그 스크랩 도구</h1>
                </Link>
              </div>
              <nav className="flex space-x-4">
                <Link href="/scrap" className="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                  스크랩
                </Link>
                <Link href="/gpt" className="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                  GPT
                </Link>
                <Link href="/post" className="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                  POST
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="flex-1 flex overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
} 