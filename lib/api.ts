const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

type RegisterReq = { username: string; phoneNumber: string; password: string }
type LoginReq = { username: string; password: string }

export async function registerUser(body: RegisterReq) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e?.error || "Registration failed")
  }
  return res.json()
}

export async function loginUser(body: LoginReq) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e?.error || "Login failed")
  }
  return res.json()
}
