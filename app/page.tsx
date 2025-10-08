"use client"

import { useEffect, useState } from "react"
import { Toaster } from "@/components/ui/toaster"
import { Card } from "@/components/ui/card"
import { AuthForm } from "@/components/auth-form"
import { ChatShell } from "@/components/chat-shell"
import { cn } from "@/lib/utils"

type User = {
  id: number
  username: string
  phoneNumber: string
}

export default function Page() {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const t = localStorage.getItem("auth_token")
    const u = localStorage.getItem("auth_user")
    if (t && u) {
      setToken(t)
      try {
        setUser(JSON.parse(u))
      } catch {}
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_user")
    setToken(null)
    setUser(null)
  }

  return (
    <main className={cn("min-h-dvh bg-background text-foreground")}>
      {!token || !user ? (
        <section className="mx-auto w-full max-w-md p-4 sm:p-6">
          <Card className="bg-secondary/40 border-border p-6 sm:p-8 rounded-xl">
            <div className="mb-6 text-center">
              <h1 className="text-balance text-2xl sm:text-3xl font-semibold">Modern Chat</h1>
              <p className="text-muted-foreground mt-1 text-sm">Dark, elegant, mobile-first messaging</p>
            </div>
            <AuthForm
              onAuthed={(t, u) => {
                setToken(t)
                setUser(u)
                localStorage.setItem("auth_token", t)
                localStorage.setItem("auth_user", JSON.stringify(u))
              }}
            />
          </Card>
          <footer className="mt-6 text-center text-xs text-muted-foreground">
            Backend URL: {process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"}
          </footer>
        </section>
      ) : (
        <ChatShell user={user} token={token} onLogout={handleLogout} />
      )}
      <Toaster />
    </main>
  )
}
