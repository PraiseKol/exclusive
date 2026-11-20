import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Figtree } from 'next/font/google'
import { Toaster } from '@/components/Modal'
import './globals.css'
import './polish.css'
import './redesign.css'

const body = Figtree({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font' })
const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-d' })

export const metadata: Metadata = { title: 'Exclusive', description: 'Meaningful & intentional relationships are built here.' }
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`} suppressHydrationWarning>
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
