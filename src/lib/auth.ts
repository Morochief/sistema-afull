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

export function withAuth<Arg, Ret>(
  action: (arg: Arg, session: UserPayload) => Promise<Ret>
) {
  return async (arg: Arg): Promise<Ret> => {
    const session = await getSession()
    if (!session) {
      throw new Error("No autenticado")
    }
    return action(arg, session)
  }
}
