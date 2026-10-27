import type { Metadata, Viewport } from 'next'
import { Public_Sans } from 'next/font/google'
import { Toaster } from '@/components/Modal'
import './globals.css'

const font = Public_Sans({ subsets: ['latin'], weight: ['400', '500'], variable: '--font' })

export const metadata: Metadata = { title: 'Exclusive', description: 'Meaningful & intentional relationships are built here.' }
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('theme');if(t=='light'||t=='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}" }} />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
