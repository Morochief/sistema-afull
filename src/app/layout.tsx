import type React from "react"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <title>Sistema aFull</title>
        <meta name="description" content="Gestión interna de proyectos, horas e insumos" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
