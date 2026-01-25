import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Plana - Planos Alimentares Personalizados",
  description: "Plataforma de planos alimentares para emagrecimento saudável",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Plana",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Plana",
    title: "Plana - Planos Alimentares Personalizados",
    description: "Plataforma de planos alimentares para emagrecimento saudável",
  },
  twitter: {
    card: "summary",
    title: "Plana - Planos Alimentares Personalizados",
    description: "Plataforma de planos alimentares para emagrecimento saudável",
  },
}

export const viewport: Viewport = {
  themeColor: "#557432",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#557432" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={`${inter.className} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
