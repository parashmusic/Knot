"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { registerUser, loginUser } from "@/lib/api"

type Props = {
  onAuthed: (token: string, user: { id: number; username: string; phoneNumber: string }) => void
}

export function AuthForm({ onAuthed }: Props) {
  const { toast } = useToast()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [loading, setLoading] = useState(false)

  const [username, setUsername] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")

  const submit = async () => {
    setLoading(true)
    try {
      if (mode === "register") {
        const { token, user } = await registerUser({ username, phoneNumber: phone, password })
        onAuthed(token, user)
      } else {
        const { token, user } = await loginUser({ username, password })
        onAuthed(token, user)
      }
    } catch (e: any) {
      toast({
        title: "Authentication failed",
        description: e?.message || "Please check your details and try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
      <TabsList className="grid grid-cols-2">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="register">Register</TabsTrigger>
      </TabsList>

      <TabsContent value="login" className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username or Phone</Label>
          <Input id="username" placeholder="e.g. alex" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button onClick={submit} className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </TabsContent>

      <TabsContent value="register" className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="r-username">Username</Label>
          <Input
            id="r-username"
            placeholder="e.g. alex"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" placeholder="+1 555 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="r-password">Password</Label>
          <Input
            id="r-password"
            type="password"
            placeholder="min 6 chars"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button onClick={submit} className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </TabsContent>
    </Tabs>
  )
}
