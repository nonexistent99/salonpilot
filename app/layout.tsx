import React from "react"
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/components/auth-provider'
import { ThemeProvider } from '@/lib/theme-context'
import './globals.css'


export const metadata: Metadata = {
  title: 'SalonPilot | Crescimento para salões',
  description: 'Inteligência prática para salões de beleza',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#0a0f1c',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}

