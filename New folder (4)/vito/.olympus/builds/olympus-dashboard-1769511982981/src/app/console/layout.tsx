'use client';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card hidden md:block">
        <Sidebar />
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-full items-center justify-between">
            <Header />
          </div>
        </header>

        <main className="container py-6">
          {children}
        </main>
      </div>
    </div>
  );
}