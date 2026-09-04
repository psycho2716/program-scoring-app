import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { env } from "../config/env";
import { verifyToken } from "../middleware/auth";
import { AuthUser } from "../types";

export interface AppSocketServer {
  io: Server;
  broadcastStateUpdate: (payload: {
    activeCategoryId: number | null;
    isScoringOpen: boolean;
    resultsRevealed: boolean;
    categoryName: string | null;
  }) => void;
  broadcastScoreProgress: (payload: {
    judgeId: number;
    judgeNumber: number;
    candidateId: number;
    categoryId: number;
    rawScore: number;
  }) => void;
  broadcastScoreSubmitted: (payload: {
    judgeId: number;
    judgeNumber: number;
    categoryId: number;
  }) => void;
  notifyJudgeWaiting: (judgeId: number, message: string) => void;
}

interface AuthenticatedSocket extends Socket {
  user?: AuthUser;
}

export function initSocket(httpServer: HttpServer): AppSocketServer {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1") || /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) {
          callback(null, true);
          return;
        }
        if (origin === env.frontendUrl) {
          callback(null, true);
          return;
        }
        callback(null, true);
      },
      credentials: true,
    },
  });

  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error("Authentication required"));
      return;
    }

    const user = verifyToken(token);
    if (!user) {
      next(new Error("Invalid token"));
      return;
    }

    socket.user = user;
    next();
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const user = socket.user;
    if (!user) return;

    if (user.role === "judge") {
      socket.join("judges");
      socket.join(`judge:${user.id}`);
    }

    if (user.role === "admin") {
      socket.join("admin");
    }
  });

  return {
    io,
    broadcastStateUpdate: (payload) => {
      io.to("judges").emit("state:update", payload);
      io.to("admin").emit("state:update", payload);
    },
    broadcastScoreProgress: (payload) => {
      io.to("admin").emit("score:progress", payload);
    },
    broadcastScoreSubmitted: (payload) => {
      io.to("admin").emit("score:submitted", payload);
    },
    notifyJudgeWaiting: (judgeId, message) => {
      io.to(`judge:${judgeId}`).emit("judge:waiting", { message });
    },
  };
}
