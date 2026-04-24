import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'SahakarHelp - AI‑Powered Tools for Cooperative Societies',
  description: 'Boost productivity with 100+ PDF, CSC, and financial tools. Free plan available. Upgrade to Pro for unlimited usage, priority support, and advanced features.',
  keywords: 'cooperative society tools, PDF tools, CSC tools, financial calculators, GST invoice, AI tools, SahakarHelp, Pro subscription',
  authors: [{ name: 'SahakarHelp Team' }],
  creator: 'SahakarHelp',
  publisher: 'SahakarHelp',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://sahakarhelp.com',
    title: 'SahakarHelp - AI‑Powered Tools for Cooperative Societies',
    description: 'Boost productivity with 100+ PDF, CSC, and financial tools. Free plan available. Upgrade to Pro for unlimited usage.',
    siteName: 'SahakarHelp',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SahakarHelp Platform Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SahakarHelp - AI‑Powered Tools for Cooperative Societies',
    description: 'Boost productivity with 100+ PDF, CSC, and financial tools.',
    images: ['/og-image.png'],
    creator: '@sahakarhelp',
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'yandex-verification-code',
    yahoo: 'yahoo-verification-code',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <footer className="bg-gray-800 text-white p-4 mt-8">
          <div className="container mx-auto text-center">
            <p>© 2024 SahakarHelp. All rights reserved.</p>
            <p className="text-sm text-gray-400 mt-2">
              Frontend deployed on Vercel • Backend deployed on Railway
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}