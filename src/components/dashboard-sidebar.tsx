"use client"

import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Receipt,
  Boxes,
  BarChart3,
  Settings,
  LifeBuoy,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navMain = [
  { label: "Panel", icon: LayoutDashboard, href: "/" },
  { label: "Proyectos", icon: FolderKanban, href: "/proyectos" },
  { label: "Clientes", icon: Users, href: "/clientes" },
  { label: "Registrar Horas/Insumos", icon: Receipt, href: "/registro" },
  { label: "Insumos", icon: Boxes, href: "/insumos" },
  { label: "Colaboradores", icon: Users, href: "/colaboradores" },
]

const navSecondary = [
  { label: "Configuración", icon: Settings, href: "#" },
  { label: "Soporte", icon: LifeBuoy, href: "#" },
]

export function DashboardSidebar({
  open = true,
  onClose,
}: {
  open?: boolean
  onClose?: () => void
} = {}) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-6">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Layers className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-sidebar-accent-foreground">
              Costcontrol
            </p>
            <p className="text-xs text-sidebar-foreground/60">Gestión de costos</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/40">
            General
          </p>
          {navMain.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4.5 shrink-0" />
                {item.label}
              </Link>
            )
          })}

          <p className="px-3 pb-2 pt-5 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/40">
            Sistema
          </p>
          {navSecondary.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <item.icon className="size-4.5 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground">
              MR
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
                María Reyes
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                Administradora
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
