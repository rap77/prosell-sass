import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://prosellweb.com";

export const metadata: Metadata = {
  title: "ProSell SaaS",
  description: "Vehicle Market Analysis Platform",
  metadataBase: new URL(baseUrl),
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: baseUrl,
    title: "ProSell SaaS",
    description: "Vehicle Market Analysis Platform",
    siteName: "ProSell",
    images: [
      {
        url: "/logo-mark.png",
        width: 271,
        height: 294,
        alt: "ProSell Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ProSell SaaS",
    description: "Vehicle Market Analysis Platform",
    images: ["/logo-mark.png"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning data-scroll-behavior="smooth">
      {/* Anti-flash script: applies saved theme before first paint.
           Dark is ProSell default → always adds "dark" class.
           Light mode → removes "dark", adds data-theme="light". */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('prosell-theme');var h=document.documentElement;if(t==='light'){h.setAttribute('data-theme','light');}else{h.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}`,
          }}
        />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <ReactQueryProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </ReactQueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
