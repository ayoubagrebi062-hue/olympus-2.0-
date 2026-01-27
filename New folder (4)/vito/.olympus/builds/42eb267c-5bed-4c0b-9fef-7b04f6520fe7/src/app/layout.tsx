// Root Layout
'use client';

import { ReactNode } from 'react';
import { Navigation } from '@/components/ui/Navigation';
import { UserMenu } from '@/components/ui/UserMenu';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>OLYMPUS 2.0</title>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-background text-text-primary">
        <Navigation />
        <main>{children}</main>
        <UserMenu />
      </body>
    </html>
  );
}