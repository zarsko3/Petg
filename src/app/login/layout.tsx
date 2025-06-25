import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { ToastProvider } from '@/components/toast-provider'

export const metadata: Metadata = {
  title: 'Sign In - PETg',
  description: 'Sign in to your PETg dashboard',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="petg-theme"
    >
      <ToastProvider />
      {children}
    </ThemeProvider>
  )
} 