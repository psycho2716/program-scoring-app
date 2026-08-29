import bcrypt from "bcrypt";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool } from "../db/pool";
import { deleteUploadIfExists } from "../middleware/upload";
import { Candidate, Category, JudgeAccount } from "../types";
import { assertSetupAllowed, getEventSettings } from "./settingsService";
import { recalculateTabulation } from "./tabulationService";

interface CandidateRow extends RowDataPacket {
  id: number;
  candidate_number: number;
  name: string;
  department: string;
  talent_details: string | null;
  photo_url: string | null;
}

interface JudgeRow extends RowDataPacket {
  id: number;
  username: string;
  judge_number: number;
}

interface CategoryRow extends RowDataPacket {
  id: number;
  category_name: string;
  weight: number;
  max_score: number;
  display_order: number;
}

function mapCandidate(row: CandidateRow): Candidate {
  return {
    id: row.id,
    candidateNumber: row.candidate_number,
    name: row.name,
    department: row.department,
    talentDetails: row.talent_details,
    photoUrl: row.photo_url,
  };
}

const CANDIDATE_SELECT =
  "SELECT id, candidate_number, name, department, talent_details, photo_url FROM candidates";

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    categoryName: row.category_name,
    weight: Number(row.weight),
    maxScore: row.max_score,
    displayOrder: row.display_order,
  };
}

function mapJudge(row: JudgeRow): JudgeAccount {
  return {
    id: row.id,
    username: row.username,
    judgeNumber: row.judge_number,
  };
}

export async function syncScoreGrid(): Promise<void> {
  await pool.query(
    `INSERT IGNORE INTO scores (judge_id, candidate_id, category_id, raw_score, is_submitted)
     SELECT j.id, c.id, cat.id, NULL, FALSE
     FROM users j
     CROSS JOIN candidates c
     CROSS JOIN categories cat
     WHERE j.role = 'judge'`
  );
}

export async function listCandidates(): Promise<Candidate[]> {
  const [rows] = await pool.query<CandidateRow[]>(
    `${CANDIDATE_SELECT} ORDER BY candidate_number`
  );
  return rows.map(mapCandidate);
}

export async function createCandidate(input: {
  candidateNumber: number;
  name: string;
  department: string;
  talentDetails?: string | null;
  photoUrl?: string | null;
}): Promise<Candidate> {
  await assertSetupAllowed();

  const talentDetails = input.talentDetails?.trim() || null;

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO candidates (candidate_number, name, department, talent_details, photo_url)
     VALUES (:candidateNumber, :name, :department, :talentDetails, :photoUrl)`,
    {
      candidateNumber: input.candidateNumber,
      name: input.name.trim(),
      department: input.department.trim(),
      talentDetails,
      photoUrl: input.photoUrl ?? null,
    }
  );

  await syncScoreGrid();
  await recalculateTabulation();

  const [rows] = await pool.query<CandidateRow[]>(`${CANDIDATE_SELECT} WHERE id = :id`, {
    id: result.insertId,
  });

  return mapCandidate(rows[0]);
}

export async function updateCandidate(
  id: number,
  input: Partial<{
    candidateNumber: number | string;
    name: string;
    department: string;
    talentDetails: string | null;
    photoUrl: string | null;
  }>
): Promise<Candidate> {
  await assertSetupAllowed();

  const [rows] = await pool.query<CandidateRow[]>(
    "SELECT id FROM candidates WHERE id = :id",
    { id }
  );
  if (!rows[0]) throw new Error("Candidate not found");

  let candidateNumber: number | null = null;
  if (input.candidateNumber !== undefined && input.candidateNumber !== null) {
    candidateNumber = Number(input.candidateNumber);
    if (!Number.isInteger(candidateNumber) || candidateNumber < 1) {
      throw new Error("Candidate number must be a positive whole number");
    }
  }

  const talentDetails =
    input.talentDetails === undefined
      ? null
      : input.talentDetails?.trim() || null;
  const clearTalent = input.talentDetails !== undefined;

  await pool.query(
    `UPDATE candidates
     SET candidate_number = COALESCE(:candidateNumber, candidate_number),
         name = COALESCE(:name, name),
         department = COALESCE(:department, department),
         talent_details = CASE WHEN :clearTalent THEN :talentDetails ELSE talent_details END,
         photo_url = COALESCE(:photoUrl, photo_url)
     WHERE id = :id`,
    {
      id,
      candidateNumber,
      name: input.name?.trim() ?? null,
      department: input.department?.trim() ?? null,
      clearTalent: clearTalent ? 1 : 0,
      talentDetails,
      photoUrl: input.photoUrl ?? null,
    }
  );

  await recalculateTabulation();

  const [updated] = await pool.query<CandidateRow[]>(`${CANDIDATE_SELECT} WHERE id = :id`, {
    id,
  });

  return mapCandidate(updated[0]);
}

export async function deleteCandidate(id: number): Promise<void> {
  await assertSetupAllowed();

  const [rows] = await pool.query<CandidateRow[]>(
    "SELECT photo_url FROM candidates WHERE id = :id",
    { id }
  );
  deleteUploadIfExists(rows[0]?.photo_url);

  // Explicit cleanup in case DB foreign keys are missing.
  await pool.query("DELETE FROM scores WHERE candidate_id = :id", { id });
  await pool.query("DELETE FROM candidate_results WHERE candidate_id = :id", { id });
  await pool.query("DELETE FROM candidates WHERE id = :id", { id });
  await recalculateTabulation();
}

export async function setCandidatePhoto(id: number, photoUrl: string): Promise<Candidate> {
  await assertSetupAllowed();

  const [rows] = await pool.query<CandidateRow[]>(`${CANDIDATE_SELECT} WHERE id = :id`, { id });
  if (!rows[0]) throw new Error("Candidate not found");

  deleteUploadIfExists(rows[0].photo_url);

  await pool.query("UPDATE candidates SET photo_url = :photoUrl WHERE id = :id", {
    id,
    photoUrl,
  });

  const [updated] = await pool.query<CandidateRow[]>(`${CANDIDATE_SELECT} WHERE id = :id`, {
    id,
  });

  return mapCandidate(updated[0]);
}

export async function listJudges(): Promise<JudgeAccount[]> {
  const [rows] = await pool.query<JudgeRow[]>(
    "SELECT id, username, judge_number FROM users WHERE role = 'judge' ORDER BY judge_number"
  );
  return rows.map(mapJudge);
}

export async function createJudge(input: {
  username: string;
  password: string;
  judgeNumber?: number;
}): Promise<JudgeAccount> {
  await assertSetupAllowed();

  let judgeNumber = input.judgeNumber;
  if (!judgeNumber) {
    const [maxRows] = await pool.query<RowDataPacket[]>(
      "SELECT COALESCE(MAX(judge_number), 0) + 1 AS next_num FROM users WHERE role = 'judge'"
    );
    judgeNumber = Number(maxRows[0]?.next_num ?? 1);
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO users (username, password_hash, role, judge_number)
     VALUES (:username, :passwordHash, 'judge', :judgeNumber)`,
    {
      username: input.username.trim(),
      passwordHash,
      judgeNumber,
    }
  );

  await syncScoreGrid();

  const [rows] = await pool.query<JudgeRow[]>(
    "SELECT id, username, judge_number FROM users WHERE id = :id",
    { id: result.insertId }
  );

  return mapJudge(rows[0]);
}

export async function updateJudge(
  id: number,
  input: Partial<{ username: string; password: string; judgeNumber: number }>
): Promise<JudgeAccount> {
  await assertSetupAllowed();

  const updates: string[] = [];
  const params: Record<string, string | number> = { id };

  if (input.username) {
    updates.push("username = :username");
    params.username = input.username.trim();
  }

  if (input.judgeNumber) {
    updates.push("judge_number = :judgeNumber");
    params.judgeNumber = input.judgeNumber;
  }

  if (input.password) {
    updates.push("password_hash = :passwordHash");
    params.passwordHash = await bcrypt.hash(input.password, 10);
  }

  if (updates.length === 0) {
    throw new Error("No updates provided");
  }

  await pool.query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = :id AND role = 'judge'`,
    params
  );

  const [rows] = await pool.query<JudgeRow[]>(
    "SELECT id, username, judge_number FROM users WHERE id = :id AND role = 'judge'",
    { id }
  );

  if (!rows[0]) throw new Error("Judge not found");
  return mapJudge(rows[0]);
}

export async function deleteJudge(id: number): Promise<void> {
  await assertSetupAllowed();
  await pool.query("DELETE FROM users WHERE id = :id AND role = 'judge'", { id });
  await recalculateTabulation();
}

export async function listAdminCategories(): Promise<Category[]> {
  const [rows] = await pool.query<CategoryRow[]>(
    "SELECT id, category_name, weight, max_score, display_order FROM categories ORDER BY display_order"
  );
  return rows.map(mapCategory);
}

export async function replaceCategories(
  categories: Array<{
    categoryName: string;
    weight: number;
    displayOrder: number;
  }>
): Promise<Category[]> {
  await assertSetupAllowed();

  if (categories.length === 0) {
    throw new Error("At least one category is required");
  }

  const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    throw new Error("Category weights must total 100%");
  }

  const settings = await getEventSettings();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM candidate_results");
    await connection.query("DELETE FROM scores");
    await connection.query("DELETE FROM categories");
    await connection.query("UPDATE system_state SET active_category_id = NULL WHERE id = 1");

    for (const category of categories.sort((a, b) => a.displayOrder - b.displayOrder)) {
      await connection.query(
        `INSERT INTO categories (category_name, weight, max_score, display_order)
         VALUES (:categoryName, :weight, :maxScore, :displayOrder)`,
        {
          categoryName: category.categoryName.trim(),
          weight: category.weight,
          maxScore: settings.maxScore,
          displayOrder: category.displayOrder,
        }
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await syncScoreGrid();
  await recalculateTabulation();

  return listAdminCategories();
}

export async function createCategory(input: {
  categoryName: string;
  weight: number;
  displayOrder?: number;
}): Promise<Category[]> {
  await assertSetupAllowed();

  const settings = await getEventSettings();

  const categories = await listAdminCategories();
  const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0) + input.weight;
  if (totalWeight > 100.01) {
    throw new Error("Total category weight cannot exceed 100%");
  }

  const displayOrder =
    input.displayOrder ?? (categories.length > 0 ? Math.max(...categories.map((c) => c.displayOrder)) + 1 : 1);

  await pool.query(
    `INSERT INTO categories (category_name, weight, max_score, display_order)
     VALUES (:categoryName, :weight, :maxScore, :displayOrder)`,
    {
      categoryName: input.categoryName.trim(),
      weight: input.weight,
      maxScore: settings.maxScore,
      displayOrder,
    }
  );

  await syncScoreGrid();
  await recalculateTabulation();
  return listAdminCategories();
}

export async function updateCategory(
  id: number,
  input: Partial<{ categoryName: string; weight: number; displayOrder: number }>
): Promise<Category[]> {
  await assertSetupAllowed();

  const settings = await getEventSettings();

  const categories = await listAdminCategories();
  const current = categories.find((cat) => cat.id === id);
  if (!current) throw new Error("Category not found");

  const nextWeight = input.weight ?? current.weight;
  const totalWeight =
    categories.filter((cat) => cat.id !== id).reduce((sum, cat) => sum + cat.weight, 0) + nextWeight;

  if (Math.abs(totalWeight - 100) > 0.01 && input.weight !== undefined) {
    throw new Error("Category weights must total 100%");
  }

  await pool.query(
    `UPDATE categories
     SET category_name = COALESCE(:categoryName, category_name),
         weight = COALESCE(:weight, weight),
         max_score = :maxScore,
         display_order = COALESCE(:displayOrder, display_order)
     WHERE id = :id`,
    {
      id,
      categoryName: input.categoryName?.trim() ?? null,
      weight: input.weight ?? null,
      maxScore: settings.maxScore,
      displayOrder: input.displayOrder ?? null,
    }
  );

  await recalculateTabulation();
  return listAdminCategories();
}

export async function deleteCategory(id: number): Promise<Category[]> {
  await assertSetupAllowed();

  const categories = await listAdminCategories();
  if (categories.length <= 1) {
    throw new Error("At least one category must remain");
  }

  await pool.query("DELETE FROM categories WHERE id = :id", { id });
  await recalculateTabulation();
  return listAdminCategories();
}
