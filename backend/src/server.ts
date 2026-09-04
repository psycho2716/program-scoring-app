import http from "http";
import path from "path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { UPLOADS_ROOT } from "./middleware/upload";
import authRoutes from "./routes/auth.routes";
import stateRoutes, { setStateBroadcaster } from "./routes/state.routes";
import scoresRoutes, { setScoreBroadcasters } from "./routes/scores.routes";
import tabulationRoutes from "./routes/tabulation.routes";
import adminRoutes from "./routes/admin.routes";
import resultsRoutes from "./routes/results.routes";
import { getEventSettings } from "./services/settingsService";
import { initSocket } from "./socket/index";

const app = express();
const httpServer = http.createServer(app);

const socketServer = initSocket(httpServer);

setStateBroadcaster((payload) => {
  socketServer.broadcastStateUpdate(payload);
});

setScoreBroadcasters({
  onProgress: (payload) => socketServer.broadcastScoreProgress(payload),
  onSubmitted: (payload) => socketServer.broadcastScoreSubmitted(payload),
  onJudgeWaiting: (judgeId, message) => socketServer.notifyJudgeWaiting(judgeId, message),
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (
        origin.startsWith("http://localhost") ||
        origin.startsWith("http://127.0.0.1") ||
        /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
        origin === env.frontendUrl
      ) {
        callback(null, true);
        return;
      }
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(UPLOADS_ROOT));

app.get("/health", async (_req, res) => {
  const settings = await getEventSettings();
  res.json({ status: "ok", event: settings.pageantName });
});

app.use("/api/auth", authRoutes);
app.use("/api/state", stateRoutes);
app.use("/api/scores", scoresRoutes);
app.use("/api/tabulation", tabulationRoutes);
app.use("/api/results", resultsRoutes);
app.use("/api/admin", adminRoutes);

httpServer.listen(env.port, env.host, () => {
  console.log(`Backend running on http://${env.host}:${env.port}`);
});

export { app, httpServer, socketServer };
