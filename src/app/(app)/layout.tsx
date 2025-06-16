import { AuthProvider } from './providers/Auth'
import '@mantine/core/styles.css'
import { mantineHtmlProps } from '@mantine/core'
import './css/app.scss'
import { ThemeProvider } from './providers/Theme'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <body>
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
