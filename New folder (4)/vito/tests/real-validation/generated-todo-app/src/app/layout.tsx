import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';

const interFont = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Todo App',
  description: 'A simple todo application',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={interFont.className}>
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
