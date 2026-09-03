import { Router, Request, Response } from "express";
import { authRequired, requireRole } from "../middleware/auth";
import { getAllCategories, getSystemState, updateSystemState } from "../services/stateService";
import { StateUpdatePayload } from "../types";

const router = Router();

let broadcastStateUpdate: ((payload: StateUpdatePayload) => void) | null = null;

export function setStateBroadcaster(fn: (payload: StateUpdatePayload) => void): void {
  broadcastStateUpdate = fn;
}

/** Push the current system state to all connected clients (admin + judges). */
export async function emitCurrentState(): Promise<void> {
  const state = await getSystemState();
  broadcastStateUpdate?.({
    activeCategoryId: state.activeCategoryId,
    isScoringOpen: state.isScoringOpen,
    categoryName: state.activeCategory?.categoryName ?? null,
  });
}

router.get("/", authRequired, async (_req: Request, res: Response) => {
  try {
    const state = await getSystemState();
    res.json({ success: true, data: state });
  } catch (error) {
    console.error("Get state error:", error);
    res.status(500).json({ success: false, error: "Failed to get system state" });
  }
});

router.get("/categories", authRequired, async (_req: Request, res: Response) => {
  try {
    const categories = await getAllCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ success: false, error: "Failed to get categories" });
  }
});

router.put("/", authRequired, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { activeCategoryId, isScoringOpen } = req.body as {
      activeCategoryId?: number | null;
      isScoringOpen?: boolean;
    };

    const current = await getSystemState();
    const newScoringOpen =
      isScoringOpen !== undefined ? isScoringOpen : current.isScoringOpen;

    let newCategoryId =
      activeCategoryId !== undefined ? activeCategoryId : current.activeCategoryId;

    // Category is locked while scoring remains open.
    if (
      current.isScoringOpen &&
      newScoringOpen &&
      activeCategoryId !== undefined &&
      activeCategoryId !== current.activeCategoryId
    ) {
      res.status(400).json({
        success: false,
        error: "Close scoring before changing the active category",
      });
      return;
    }

    if (current.isScoringOpen && newScoringOpen) {
      newCategoryId = current.activeCategoryId;
    }

    const state = await updateSystemState(newCategoryId ?? null, Boolean(newScoringOpen));

    const payload: StateUpdatePayload = {
      activeCategoryId: state.activeCategoryId,
      isScoringOpen: state.isScoringOpen,
      categoryName: state.activeCategory?.categoryName ?? null,
    };

    broadcastStateUpdate?.(payload);

    res.json({ success: true, data: state });
  } catch (error) {
    console.error("Update state error:", error);
    res.status(500).json({ success: false, error: "Failed to update system state" });
  }
});

export default router;
