// app/layout.js
import './globals.css';

export const metadata = {
  title: 'Kyle.Reviews',
  description: 'Recommendations for movies, books, music, and more.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&family=JetBrains+Mono:wght@400&display=swap"
          rel="stylesheet"
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Kyle.Reviews RSS Feed"
          href="/api/rss"
        />
      </head>
      <body className="bg-paper text-ink font-body antialiased">{children}</body>
    </html>
  );
}
