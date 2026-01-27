import { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'OLYMPUS 2.0',
  description: 'AI code generation platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}