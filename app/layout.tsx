import { ThemeProvider } from '@/components/theme-provider'
import ClientLayout from '@/components/layout/client-layout'
import './globals.css'

export const metadata = {
  title: 'ICS CMS',
  description: 'ICS calendar management system',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-mobile.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-mobileview.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-mobile.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="ics-theme">
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}
