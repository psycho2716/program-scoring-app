import { Router, Request, Response } from "express";
import { authRequired, requireRole } from "../middleware/auth";
import { getCrownResultsDisplay } from "../services/tabulationService";

const router = Router();

/** Public projector payload. Names stay hidden until the tabulator reveals results. */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const data = await getCrownResultsDisplay();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Public results error:", error);
    res.status(500).json({ success: false, error: "Failed to get results" });
  }
});

/** Tabulator preview — always includes top 4, plus whether the projector is live. */
router.get("/preview", authRequired, requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const data = await getCrownResultsDisplay({ includePlacements: true });
    res.json({ success: true, data });
  } catch (error) {
    console.error("Results preview error:", error);
    res.status(500).json({ success: false, error: "Failed to get results preview" });
  }
});

export default router;
