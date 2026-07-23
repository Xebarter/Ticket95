import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ticket95 Verifier',
  description: 'Door ticket check-in',
  appleWebApp: {
    capable: true,
    title: 'Ticket95 Verifier',
    statusBarStyle: 'black-translucent',
  },
}

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#0a0e1a] text-white antialiased">{children}</div>
  )
}
