import { Router, Request, Response } from "express";
import { authRequired, requireRole } from "../middleware/auth";
import { exportResultsBuffer, getExportFilename } from "../services/excelExport";
import { getAllCategories } from "../services/stateService";
import {
  getSubmissionMatrix,
  getTabulation,
  getWinnerInfo,
  recalculateTabulation,
} from "../services/tabulationService";

const router = Router();

router.get(
  "/",
  authRequired,
  requireRole("admin", "judge"),
  async (_req: Request, res: Response) => {
    try {
      const data = await getTabulation();
      const categories = await getAllCategories();
      res.json({ success: true, data: { rows: data, categories } });
    } catch (error) {
      console.error("Tabulation error:", error);
      res.status(500).json({ success: false, error: "Failed to get tabulation" });
    }
  }
);

router.get(
  "/winner",
  authRequired,
  requireRole("admin", "judge"),
  async (_req: Request, res: Response) => {
    try {
      const data = await getWinnerInfo();
      res.json({ success: true, data });
    } catch (error) {
      console.error("Winner error:", error);
      res.status(500).json({ success: false, error: "Failed to get winner" });
    }
  }
);

router.get("/matrix", authRequired, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const categoryId = Number(req.query.categoryId);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      res.status(400).json({ success: false, error: "categoryId query param is required" });
      return;
    }

    const data = await getSubmissionMatrix(categoryId);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Matrix error:", error);
    res.status(500).json({ success: false, error: "Failed to get submission matrix" });
  }
});

router.post(
  "/recalculate",
  authRequired,
  requireRole("admin"),
  async (_req: Request, res: Response) => {
    try {
      await recalculateTabulation();
      const data = await getTabulation();
      res.json({ success: true, data });
    } catch (error) {
      console.error("Recalculate error:", error);
      res.status(500).json({ success: false, error: "Failed to recalculate tabulation" });
    }
  }
);

router.get(
  "/export",
  authRequired,
  requireRole("admin"),
  async (_req: Request, res: Response) => {
    try {
      const buffer = await exportResultsBuffer();
      const settings = await import("../services/settingsService").then((m) => m.getEventSettings());
      const filename = getExportFilename(settings.pageantName);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ success: false, error: "Failed to export results" });
    }
  }
);

export default router;
