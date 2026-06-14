'use client'
import { SessionProvider } from 'next-auth/react'
import Script from 'next/script'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>UPSC Mains Reading Planner — Calculate Your Study Time</title>
        <meta name="description" content="Free UPSC Mains reading time calculator. Add your books, set your reading speed and get a realistic day-by-day study plan for GS Paper 1, 2, 3, 4, Essay and Optional subjects like PSIR." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {/* Google Ads Tag */}
        <Script async src="https://www.googletagmanager.com/gtag/js?id=AW-938923771" strategy="afterInteractive" />
        <Script id="google-ads-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-938923771');
          `}
        </Script>

        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '558836874150407');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img height="1" width="1" style={{display:'none'}}
            src="https://www.facebook.com/tr?id=558836874150407&ev=PageView&noscript=1" alt="" />
        </noscript>

        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
