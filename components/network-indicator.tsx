"use client"

import { useEffect, useState } from "react"
import { socketClient } from "@/lib/socket"
import { cn } from "@/lib/utils"

type Stats = {
  latency: number
  jitter: number
  connectionQuality: "measuring" | "excellent" | "good" | "fair" | "poor"
}

export function NetworkIndicator() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const s = socketClient()
    const interval = setInterval(() => {
      s.emit("ping", Date.now())
      s.emit("get-network-stats")
    }, 3000)

    const onPong = (p: any) => {
      setStats((prev) => ({
        latency: Math.round(p.averageLatency ?? p.latency ?? 0),
        jitter: Math.round(p.jitter ?? 0),
        connectionQuality: (p.connectionQuality ?? "measuring") as any,
      }))
    }
    const onStats = (st: any) => {
      setStats({
        latency: Math.round(st.latency ?? 0),
        jitter: Math.round(st.jitter ?? 0),
        connectionQuality: (st.connectionQuality ?? "measuring") as any,
      })
    }

    s.on("pong", onPong)
    s.on("network-stats", onStats)

    return () => {
      clearInterval(interval)
      s.off("pong", onPong)
      s.off("network-stats", onStats)
    }
  }, [])

  const color =
    stats?.connectionQuality === "excellent"
      ? "text-green-400"
      : stats?.connectionQuality === "good"
        ? "text-emerald-400"
        : stats?.connectionQuality === "fair"
          ? "text-yellow-400"
          : stats?.connectionQuality === "poor"
            ? "text-red-400"
            : "text-muted-foreground"

  return (
    <div className={cn("text-[10px] leading-none", color)}>
      {stats ? `net: ${stats.connectionQuality} (${stats.latency}ms • j${stats.jitter})` : "net: measuring"}
    </div>
  )
}
