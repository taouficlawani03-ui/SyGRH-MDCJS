import './globals.css'

export const metadata = {
  title: 'SyGRH — MDCJS',
  description: 'Système de Gestion des Ressources Humaines',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
