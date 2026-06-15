import type React from "react"
import "../globals.css"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-muted/40 p-4">
      {children}
    </div>
  )
}
