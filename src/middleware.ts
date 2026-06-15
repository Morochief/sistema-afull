import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "./lib/auth"

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value

  // Rutas que requieren autenticación
  const protectedRoutes = ["/", "/registro", "/proyectos", "/clientes", "/insumos", "/colaboradores"]
  const isProtectedRoute = protectedRoutes.includes(request.nextUrl.pathname)

  if (isProtectedRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    const payload = await verifyToken(token)
    if (!payload) {
      // Token inválido o expirado
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  // Redirigir de /login al dashboard si ya está autenticado
  if (request.nextUrl.pathname === "/login" && token) {
    const payload = await verifyToken(token)
    if (payload) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/registro", "/login", "/proyectos", "/clientes", "/insumos", "/colaboradores"],
}
