import { Router, Request, Response } from "express";
import { authRequired, requireRole } from "../middleware/auth";
import {
  getActiveScoresForJudge,
  isValidRawScore,
  saveScore,
  submitCategoryScores,
} from "../services/scoreService";
import { recalculateTabulation } from "../services/tabulationService";
import { getSystemState } from "../services/stateService";
import { getEventSettings } from "../services/settingsService";
import { ScoreProgressPayload, ScoreSubmittedPayload } from "../types";

const router = Router();

let broadcastScoreProgress: ((payload: ScoreProgressPayload) => void) | null = null;
let broadcastScoreSubmitted: ((payload: ScoreSubmittedPayload) => void) | null = null;
let broadcastJudgeWaiting: ((judgeId: number, message: string) => void) | null = null;

export function setScoreBroadcasters(handlers: {
  onProgress: (payload: ScoreProgressPayload) => void;
  onSubmitted: (payload: ScoreSubmittedPayload) => void;
  onJudgeWaiting: (judgeId: number, message: string) => void;
}): void {
  broadcastScoreProgress = handlers.onProgress;
  broadcastScoreSubmitted = handlers.onSubmitted;
  broadcastJudgeWaiting = handlers.onJudgeWaiting;
}

router.get("/active", authRequired, requireRole("judge"), async (req: Request, res: Response) => {
  try {
    const data = await getActiveScoresForJudge(req.user!.id);
    const state = await getSystemState();
    const settings = await getEventSettings();
    res.json({
      success: true,
      data: {
        ...data,
        state,
        settings,
      },
    });
  } catch (error) {
    console.error("Get active scores error:", error);
    res.status(500).json({ success: false, error: "Failed to get scores" });
  }
});

router.put(
  "/:candidateId",
  authRequired,
  requireRole("judge"),
  async (req: Request, res: Response) => {
    try {
      const candidateId = Number(req.params.candidateId);
      const { rawScore } = req.body as { rawScore?: number };

      if (!Number.isInteger(candidateId) || candidateId <= 0) {
        res.status(400).json({ success: false, error: "Invalid candidate ID" });
        return;
      }

      if (!(await isValidRawScore(rawScore))) {
        const settings = await import("../services/settingsService").then((m) => m.getEventSettings());
        res.status(400).json({
          success: false,
          error: `Score must be a whole or half point from ${settings.minScore} to ${settings.maxScore}`,
        });
        return;
      }

      const validatedScore = Number(rawScore);

      await saveScore(req.user!.id, candidateId, validatedScore);

      const state = await getSystemState();
      if (state.activeCategoryId) {
        broadcastScoreProgress?.({
          judgeId: req.user!.id,
          judgeNumber: req.user!.judgeNumber ?? 0,
          candidateId,
          categoryId: state.activeCategoryId,
          rawScore: validatedScore,
        });
      }

      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save score";
      res.status(400).json({ success: false, error: message });
    }
  }
);

router.post("/submit", authRequired, requireRole("judge"), async (req: Request, res: Response) => {
  try {
    const categoryId = await submitCategoryScores(req.user!.id);
    await recalculateTabulation();

    broadcastScoreSubmitted?.({
      judgeId: req.user!.id,
      judgeNumber: req.user!.judgeNumber ?? 0,
      categoryId,
    });

    broadcastJudgeWaiting?.(
      req.user!.id,
      "Waiting for the next category to begin..."
    );

    res.json({ success: true, data: { categoryId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit scores";
    res.status(400).json({ success: false, error: message });
  }
});

export default router;
