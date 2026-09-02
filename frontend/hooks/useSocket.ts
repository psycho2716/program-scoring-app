"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getSocketOptions } from "@/lib/api";
import {
  ScoreProgressPayload,
  ScoreSubmittedPayload,
  StateUpdatePayload,
} from "@/types";

interface UseSocketOptions {
  token: string | null;
  enabled?: boolean;
  onStateUpdate?: (payload: StateUpdatePayload) => void;
  onScoreProgress?: (payload: ScoreProgressPayload) => void;
  onScoreSubmitted?: (payload: ScoreSubmittedPayload) => void;
  onJudgeWaiting?: (message: string) => void;
}

export function useSocket({
  token,
  enabled = true,
  onStateUpdate,
  onScoreProgress,
  onScoreSubmitted,
  onJudgeWaiting,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !token) return;

    const { url, path } = getSocketOptions();
    const socket = io(url, {
      ...(path ? { path } : {}),
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("state:update", (payload: StateUpdatePayload) => {
      onStateUpdate?.(payload);
    });

    socket.on("score:progress", (payload: ScoreProgressPayload) => {
      onScoreProgress?.(payload);
    });

    socket.on("score:submitted", (payload: ScoreSubmittedPayload) => {
      onScoreSubmitted?.(payload);
    });

    socket.on("judge:waiting", (payload: { message: string }) => {
      onJudgeWaiting?.(payload.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    token,
    enabled,
    onStateUpdate,
    onScoreProgress,
    onScoreSubmitted,
    onJudgeWaiting,
  ]);

  return socketRef;
}
