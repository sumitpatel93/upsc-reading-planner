'use client'
import { SessionProvider } from 'next-auth/react'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>UPSC Mains Reading Planner</title>
        <meta name="description" content="Calculate your UPSC Mains reading time. Add books, set your speed, get a realistic study plan." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
