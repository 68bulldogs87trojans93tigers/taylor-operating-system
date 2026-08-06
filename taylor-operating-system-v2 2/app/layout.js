import './styles.css'

export const metadata = {
  title: 'Taylor Operating System',
  description: 'Shared executive operating system for Taylor businesses'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
