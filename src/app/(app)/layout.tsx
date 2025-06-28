import '@mantine/core/styles.css'
import { mantineHtmlProps } from '@mantine/core'
import './css/app.scss'
import { ThemeProvider } from './providers/Theme'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
