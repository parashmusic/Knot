"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { ChatWindow } from "@/components/chat-window"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { NetworkIndicator } from "@/components/network-indicator"
import { socketClient } from "@/lib/socket"

type User = { id: number; username: string; phoneNumber: string }

export type ConversationItem = {
  userId: number
  username: string
  lastMessage: string | null
  lastMessageTime: string | null
  unreadCount: number
}

type OnlineUser = { id: number; username: string; is_online: 1; last_login: string }

type Props = {
  user: User
  token: string
  onLogout: () => void
}

export function ChatShell({ user, token, onLogout }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mode, setMode] = useState<"broadcast" | "dm">("broadcast")
  const [activeUserId, setActiveUserId] = useState<number | null>(null)

  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])

  // Initialize socket client
  useEffect(() => {
    const s = socketClient(token)
    // Request initial data
    s.emit("get-recent-conversations")
    s.emit("get-online-users")

    s.on("recent-conversations", (list: any[]) => {
      setConversations(list)
    })
    s.on("online-users-list", (list: any[]) => {
      setOnlineUsers(list)
    })
    s.on("user-list-update", () => {
      s.emit("get-online-users")
    })
    s.on("user-joined", () => s.emit("get-online-users"))
    s.on("user-left", () => s.emit("get-online-users"))

    return () => {
      s.off("recent-conversations")
      s.off("online-users-list")
    }
  }, [token])

  const initials = user.username.slice(0, 2).toUpperCase()

  return (
    <div className="flex h-dvh w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[320px] shrink-0 border-r border-border bg-secondary/20">
        <Sidebar
          me={user}
          conversations={conversations}
          onlineUsers={onlineUsers}
          activeMode={mode}
          onModeChange={setMode}
          activeUserId={activeUserId}
          onSelectUser={(id) => {
            setMode("dm")
            setActiveUserId(id)
          }}
          onSelectBroadcast={() => {
            setMode("broadcast")
            setActiveUserId(null)
          }}
        />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed inset-x-0 top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="flex items-center gap-3 px-3 py-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Open sidebar">
                Menu
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[90vw] sm:w-[360px]">
              <Sidebar
                me={user}
                conversations={conversations}
                onlineUsers={onlineUsers}
                activeMode={mode}
                onModeChange={(m) => {
                  setMode(m)
                  setMobileOpen(false)
                }}
                activeUserId={activeUserId}
                onSelectUser={(id) => {
                  setMode("dm")
                  setActiveUserId(id)
                  setMobileOpen(false)
                }}
                onSelectBroadcast={() => {
                  setMode("broadcast")
                  setActiveUserId(null)
                  setMobileOpen(false)
                }}
              />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <Avatar className="size-7">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm leading-tight">{user.username}</span>
              <NetworkIndicator />
            </div>
          </div>
          <div className="ml-auto">
            <Button size="sm" variant="outline" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <section className="flex-1 flex flex-col md:pl-0 md:pt-0 pt-12">
        <header className="hidden md:flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{user.username}</span>
              <NetworkIndicator />
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </header>

        <ChatWindow me={user} mode={mode} peerUserId={activeUserId} />
      </section>
    </div>
  )
}
