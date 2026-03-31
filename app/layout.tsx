import { Geist, Geist_Mono } from "next/font/google"
import { SessionProvider } from "next-auth/react"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ToasterProvider } from "@/components/toaster"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body>
        <SessionProvider>
          <ThemeProvider>
            {children}
            <ToasterProvider />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
