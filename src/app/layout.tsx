import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Footcandle Film Society - Members',
  description: 'Membership portal for Footcandle Film Society',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
