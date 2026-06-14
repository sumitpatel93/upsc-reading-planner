// Meta Pixel event helpers
export function trackEvent(event: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', event, params)
  }
}

// Standard events to use:
// trackEvent('CompleteRegistration') — when user logs in first time
// trackEvent('Lead') — when user uploads first PDF
// trackEvent('Purchase', { value: 49, currency: 'INR' }) — when payment succeeds
// trackEvent('ViewContent', { content_name: 'PDF Reader' }) — when user opens PDF reader
