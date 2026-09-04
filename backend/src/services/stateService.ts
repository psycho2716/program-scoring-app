import { RowDataPacket } from "mysql2";
import { pool } from "../db/pool";
import { Category, SystemState } from "../types";

interface CategoryRow extends RowDataPacket {
  id: number;
  category_name: string;
  weight: number;
  max_score: number;
  display_order: number;
}

interface StateRow extends RowDataPacket {
  active_category_id: number | null;
  is_scoring_open: boolean;
  results_revealed: boolean;
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    categoryName: row.category_name,
    weight: Number(row.weight),
    maxScore: row.max_score,
    displayOrder: row.display_order,
  };
}

export async function getAllCategories(): Promise<Category[]> {
  const [rows] = await pool.query<CategoryRow[]>(
    "SELECT id, category_name, weight, max_score, display_order FROM categories ORDER BY display_order"
  );
  return rows.map(mapCategory);
}

export async function getSystemState(): Promise<SystemState> {
  const [stateRows] = await pool.query<StateRow[]>(
    "SELECT active_category_id, is_scoring_open, results_revealed FROM system_state WHERE id = 1"
  );

  const state = stateRows[0];
  if (!state) {
    return {
      activeCategoryId: null,
      isScoringOpen: false,
      resultsRevealed: false,
      activeCategory: null,
    };
  }

  let activeCategory: Category | null = null;
  if (state.active_category_id) {
    const [catRows] = await pool.query<CategoryRow[]>(
      "SELECT id, category_name, weight, max_score, display_order FROM categories WHERE id = :id",
      { id: state.active_category_id }
    );
    if (catRows[0]) {
      activeCategory = mapCategory(catRows[0]);
    }
  }

  return {
    activeCategoryId: state.active_category_id,
    isScoringOpen: Boolean(state.is_scoring_open),
    resultsRevealed: Boolean(state.results_revealed),
    activeCategory,
  };
}

export async function updateSystemState(
  activeCategoryId: number | null,
  isScoringOpen: boolean
): Promise<SystemState> {
  await pool.query(
    "UPDATE system_state SET active_category_id = :activeCategoryId, is_scoring_open = :isScoringOpen WHERE id = 1",
    { activeCategoryId, isScoringOpen: isScoringOpen ? 1 : 0 }
  );

  return getSystemState();
}

export async function setResultsRevealed(revealed: boolean): Promise<SystemState> {
  await pool.query("UPDATE system_state SET results_revealed = :revealed WHERE id = 1", {
    revealed: revealed ? 1 : 0,
  });
  return getSystemState();
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const [rows] = await pool.query<CategoryRow[]>(
    "SELECT id, category_name, weight, max_score, display_order FROM categories WHERE id = :id",
    { id }
  );
  return rows[0] ? mapCategory(rows[0]) : null;
}
