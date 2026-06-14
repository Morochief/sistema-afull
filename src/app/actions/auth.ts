"use server"

import { cookies } from "next/headers"
import { signToken } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function login(nombre: string) {
  try {
    // Buscar colaborador por nombre (insensitivo a mayúsculas)
    // En Prisma, podemos usar equals o buscar el primero que coincida
    const colaborador = await prisma.colaboradores.findFirst({
      where: {
        nombre: {
          equals: nombre,
          mode: "insensitive"
        },
        activo: true
      }
    })

    if (!colaborador) {
      return { error: "Colaborador no encontrado o inactivo" }
    }

    // Crear token con colaborador_id
    const token = await signToken({
      colaborador_id: colaborador.id,
      nombre: colaborador.nombre
    })

    // Guardar en cookie HTTP-Only
    const cookieStore = await cookies()
    cookieStore.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 // 24 horas
    })

    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    // TEMPORAL: Devolver el error real para diagnosticar el problema en Vercel
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete("auth_token")
}
