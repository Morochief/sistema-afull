import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-key-for-dev"
)

export type UserPayload = {
  colaborador_id: string
  nombre: string
}

export async function signToken(payload: UserPayload) {
  const alg = "HS256"
  return new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as UserPayload
  } catch (error) {
    return null
  }
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value
  if (!token) return null
  return await verifyToken(token)
}

// Wrapper for Server Actions
export function withAuth<T extends (...args: any[]) => Promise<any>>(action: T) {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const session = await getSession()
    if (!session) {
      throw new Error("No autenticado")
    }
    // Inject session into the first parameter if it's an object, or we could just 
    // let the action call `getSession()` itself. For simplicity in Next.js Server Actions,
    // it's often easier to just call getSession() inside the action itself.
    // However, if we strictly want a wrapper:
    return action(...args, session) as ReturnType<T>
  }
}
