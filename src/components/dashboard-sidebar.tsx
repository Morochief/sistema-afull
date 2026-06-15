"use client"

import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Receipt,
  Boxes,
  UserCog,
  Settings,
  LifeBuoy,
  Layers,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { logout } from "@/app/actions/auth"
import { toast } from "sonner"
import { useTransition } from "react"

const navMain = [
  { label: "Panel", icon: LayoutDashboard, href: "/" },
  { label: "Proyectos", icon: FolderKanban, href: "/proyectos" },
  { label: "Clientes", icon: Users, href: "/clientes" },
  { label: "Registrar Horas/Insumos", icon: Receipt, href: "/registro" },
  { label: "Insumos", icon: Boxes, href: "/insumos" },
  { label: "Colaboradores", icon: UserCog, href: "/colaboradores" },
]

const navSecondary = [
  { label: "Configuración", icon: Settings, href: "#" },
  { label: "Soporte", icon: LifeBuoy, href: "#" },
]

export function DashboardSidebar({
  open = true,
  onClose,
  userName = "Colaborador",
}: {
  open?: boolean
  onClose?: () => void
  userName?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await logout()
      toast.success("Sesión cerrada correctamente")
      router.push("/login")
    })
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }

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
            <div
              key={item.label}
              title="Próximamente"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/40 cursor-not-allowed select-none transition-colors"
            >
              <item.icon className="size-4.5 shrink-0" />
              <span>{item.label}</span>
              <span className="text-[10px] bg-sidebar-accent/50 text-sidebar-foreground/60 px-1.5 py-0.5 rounded font-mono scale-90">Próximamente</span>
            </div>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="border-t border-sidebar-border p-4 flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground">
              {getInitials(userName)}
            </div>
            <div className="min-w-0 leading-tight flex-1">
              <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
                {userName}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                Colaborador
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={isPending}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            <LogOut className="size-4.5 shrink-0" />
            {isPending ? "Saliendo..." : "Cerrar sesión"}
          </button>
        </div>
      </aside>
    </>
  )
}
