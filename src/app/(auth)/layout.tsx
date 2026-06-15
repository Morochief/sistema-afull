import type React from "react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh w-full grid place-items-center bg-slate-50 dark:bg-slate-950 p-4 overflow-hidden">
      {/* Decorative gradient orbs for depth */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.55 0.18 260), transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-32 h-[28rem] w-[28rem] rounded-full opacity-15 blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.6 0.14 200), transparent 70%)" }}
        aria-hidden="true"
      />

      {children}
    </div>
  )
}
