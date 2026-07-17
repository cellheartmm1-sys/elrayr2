import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "الرايق ERP | نظام إدارة المقاولات الكهروميكانيكية",
  description: "نظام متكامل لإدارة مشاريع الرايق للمقاولات الكهروميكانيكية - إدارة المشاريع، المشتريات، الموارد البشرية، والمالية",
  keywords: "مقاولات، كهروميكانيكية، شبكات حريق، ERP، إدارة مشاريع",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.setAttribute('data-theme', theme);
              })();
            `,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
