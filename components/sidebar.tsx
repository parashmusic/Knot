"use client"

import { useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { ConversationItem } from "./chat-shell"

type Props = {
  me: { id: number; username: string }
  conversations: ConversationItem[]
  onlineUsers: { id: number; username: string }[]
  activeMode: "broadcast" | "dm"
  onModeChange: (m: "broadcast" | "dm") => void
  activeUserId: number | null
  onSelectUser: (id: number) => void
  onSelectBroadcast: () => void
}

export function Sidebar({
  me,
  conversations,
  onlineUsers,
  activeMode,
  onModeChange,
  activeUserId,
  onSelectUser,
  onSelectBroadcast,
}: Props) {
  const peers = useMemo(() => onlineUsers.filter((u) => u.id !== me.id), [onlineUsers, me.id])

  return (
    <div className="flex h-full w-full flex-col">
      <div className="p-4">
        <div className="flex gap-2">
          <Button
            variant={activeMode === "broadcast" ? "default" : "secondary"}
            className="flex-1"
            onClick={() => {
              onModeChange("broadcast")
              onSelectBroadcast()
            }}
          >
            Broadcast
          </Button>
          <Button
            variant={activeMode === "dm" ? "default" : "secondary"}
            className="flex-1"
            onClick={() => onModeChange("dm")}
          >
            Private
          </Button>
        </div>
        <div className="mt-3">
          <Input placeholder="Search people..." />
        </div>
      </div>
      <Separator />
      {activeMode === "broadcast" ? (
        <div className="p-4">
          <div className="text-sm text-muted-foreground">
            Global room visible to everyone online. Great for announcements.
          </div>
          <Button className="mt-3 w-full" onClick={onSelectBroadcast}>
            Enter Broadcast
          </Button>
        </div>
      ) : (
        <>
          <div className="px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">Recent</div>
          <ScrollArea className="px-2">
            <div className="space-y-1 pb-2">
              {conversations.map((c) => (
                <button
                  key={c.userId}
                  onClick={() => onSelectUser(c.userId)}
                  className={`w-full rounded-md p-3 text-left hover:bg-secondary/40 ${activeUserId === c.userId ? "bg-secondary/50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{c.username}</div>
                    {c.unreadCount > 0 && <Badge variant="secondary">{c.unreadCount}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{c.lastMessage ?? "No messages yet"}</div>
                </button>
              ))}
            </div>
          </ScrollArea>
          <div className="px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">Online</div>
          <ScrollArea className="px-2">
            <div className="space-y-1 pb-2">
              {peers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => onSelectUser(u.id)}
                  className={`w-full rounded-md p-3 text-left hover:bg-secondary/40 ${activeUserId === u.id ? "bg-secondary/50" : ""}`}
                >
                  <div className="font-medium">{u.username}</div>
                  <div className="text-xs text-muted-foreground">Online</div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  )
}
