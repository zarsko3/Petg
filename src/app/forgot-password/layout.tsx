import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { ToastProvider } from '@/components/toast-provider'

export const metadata: Metadata = {
  title: 'Reset Password - PETg',
  description: 'Reset your PETg account password',
}

export default function ForgotPasswordLayout({
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