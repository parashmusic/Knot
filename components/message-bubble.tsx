"use client"

import { cn } from "@/lib/utils"

export type ChatMessage = {
  id: number
  from: number
  to: number
  text: string
  timestamp: string
  status: "sent" | "delivered" | "read"
  kind: "broadcast" | "dm"
}

export function MessageBubble({ message, meId }: { message: ChatMessage; meId: number }) {
  const isMine = message.from === meId
  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3 py-2 text-sm",
          isMine ? "bg-primary text-primary-foreground" : "bg-secondary/40",
        )}
        aria-label={isMine ? "My message" : "Peer message"}
      >
        <div className="whitespace-pre-wrap break-words">{message.text}</div>
        <div
          className={cn(
            "mt-1 text-[10px] opacity-70 flex items-center gap-2",
            isMine ? "text-primary-foreground" : "text-muted-foreground",
          )}
        >
          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
          {isMine && <span>{message.status}</span>}
        </div>
      </div>
    </div>
  )
}
