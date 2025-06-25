import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { ToastProvider } from '@/components/toast-provider'

export const metadata: Metadata = {
  title: 'Sign Up - PETg',
  description: 'Create your PETg account',
}

export default function SignUpLayout({
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