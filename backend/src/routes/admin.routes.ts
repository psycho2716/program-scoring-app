import { Router, Request, Response } from "express";
import { authRequired, requireRole } from "../middleware/auth";
import {
  createCandidate,
  createCategory,
  createJudge,
  deleteCandidate,
  deleteCategory,
  deleteJudge,
  listAdminCategories,
  listCandidates,
  listJudges,
  replaceCategories,
  setCandidatePhoto,
  updateCandidate,
  updateCategory,
  updateJudge,
} from "../services/adminService";
import { candidatePhotoUpload, toPublicUploadPath } from "../middleware/upload";
import { getEventSettings, updateEventSettings } from "../services/settingsService";

const router = Router();

router.get("/settings", async (_req: Request, res: Response) => {
  try {
    const data = await getEventSettings();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ success: false, error: "Failed to get event settings" });
  }
});

router.put("/settings", authRequired, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const data = await updateEventSettings(req.body);
    res.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update settings";
    res.status(400).json({ success: false, error: message });
  }
});

router.get("/candidates", authRequired, requireRole("admin"), async (_req, res) => {
  try {
    const data = await listCandidates();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to list candidates" });
  }
});

router.post("/candidates", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const data = await createCandidate(req.body);
    res.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create candidate";
    res.status(400).json({ success: false, error: message });
  }
});

router.put("/candidates/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const data = await updateCandidate(Number(req.params.id), req.body);
    res.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update candidate";
    res.status(400).json({ success: false, error: message });
  }
});

router.post(
  "/candidates/:id/photo",
  authRequired,
  requireRole("admin"),
  (req, res, next) => {
    candidatePhotoUpload.single("photo")(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        res.status(400).json({ success: false, error: message });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: "Photo file is required" });
        return;
      }

      const photoUrl = toPublicUploadPath(req.file.path);
      const data = await setCandidatePhoto(Number(req.params.id), photoUrl);
      res.json({ success: true, data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload photo";
      res.status(400).json({ success: false, error: message });
    }
  }
);

router.delete("/candidates/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    await deleteCandidate(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete candidate";
    res.status(400).json({ success: false, error: message });
  }
});

router.get("/judges", authRequired, requireRole("admin"), async (_req, res) => {
  try {
    const data = await listJudges();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to list judges" });
  }
});

router.post("/judges", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const data = await createJudge(req.body);
    res.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create judge";
    res.status(400).json({ success: false, error: message });
  }
});

router.put("/judges/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const data = await updateJudge(Number(req.params.id), req.body);
    res.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update judge";
    res.status(400).json({ success: false, error: message });
  }
});

router.delete("/judges/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    await deleteJudge(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete judge";
    res.status(400).json({ success: false, error: message });
  }
});

router.get("/categories", authRequired, requireRole("admin"), async (_req, res) => {
  try {
    const data = await listAdminCategories();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to list categories" });
  }
});

router.put("/categories", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const data = await replaceCategories(req.body.categories ?? []);
    res.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save categories";
    res.status(400).json({ success: false, error: message });
  }
});

router.post("/categories", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const data = await createCategory(req.body);
    res.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create category";
    res.status(400).json({ success: false, error: message });
  }
});

router.put("/categories/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const data = await updateCategory(Number(req.params.id), req.body);
    res.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update category";
    res.status(400).json({ success: false, error: message });
  }
});

router.delete("/categories/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const data = await deleteCategory(Number(req.params.id));
    res.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete category";
    res.status(400).json({ success: false, error: message });
  }
});

export default router;
