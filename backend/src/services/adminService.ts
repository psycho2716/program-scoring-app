import bcrypt from "bcrypt";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool } from "../db/pool";
import { deleteUploadIfExists } from "../middleware/upload";
import { Candidate, CandidateGender, Category, JudgeAccount } from "../types";
import { assertSetupAllowed, getEventSettings } from "./settingsService";
import { recalculateTabulation } from "./tabulationService";

interface CandidateRow extends RowDataPacket {
  id: number;
  candidate_number: number;
  gender: CandidateGender;
  name: string;
  department: string;
  talent_details: string | null;
  photo_url: string | null;
}

function parseGender(value: unknown): CandidateGender {
  if (value === "male" || value === "female") return value;
  throw new Error("Gender must be male or female");
}

interface JudgeRow extends RowDataPacket {
  id: number;
  username: string;
  display_name: string | null;
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
    gender: row.gender,
    name: row.name,
    department: row.department,
    talentDetails: row.talent_details,
    photoUrl: row.photo_url,
  };
}

const CANDIDATE_SELECT =
  "SELECT id, candidate_number, gender, name, department, talent_details, photo_url FROM candidates";

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
    displayName: row.display_name,
    judgeNumber: row.judge_number,
  };
}

const JUDGE_SELECT = "SELECT id, username, display_name, judge_number FROM users";

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
    `${CANDIDATE_SELECT} ORDER BY gender DESC, candidate_number`
  );
  return rows.map(mapCandidate);
}

export async function createCandidate(input: {
  candidateNumber: number;
  gender: CandidateGender;
  name: string;
  department: string;
  talentDetails?: string | null;
  photoUrl?: string | null;
}): Promise<Candidate> {
  await assertSetupAllowed();

  const gender = parseGender(input.gender);
  const talentDetails = input.talentDetails?.trim() || null;

  let result: ResultSetHeader;
  try {
    [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO candidates (candidate_number, gender, name, department, talent_details, photo_url)
       VALUES (:candidateNumber, :gender, :name, :department, :talentDetails, :photoUrl)`,
      {
        candidateNumber: input.candidateNumber,
        gender,
        name: input.name.trim(),
        department: input.department.trim(),
        talentDetails,
        photoUrl: input.photoUrl ?? null,
      }
    );
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      throw new Error("A candidate with this number already exists in this division");
    }
    throw error;
  }

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
    gender: CandidateGender;
    name: string;
    department: string;
    talentDetails: string | null;
    photoUrl: string | null;
  }>
): Promise<Candidate> {
  await assertSetupAllowed();

  const [rows] = await pool.query<CandidateRow[]>(`${CANDIDATE_SELECT} WHERE id = :id`, { id });
  if (!rows[0]) throw new Error("Candidate not found");

  const current = rows[0];

  let candidateNumber: number | null = null;
  if (input.candidateNumber !== undefined && input.candidateNumber !== null) {
    candidateNumber = Number(input.candidateNumber);
    if (!Number.isInteger(candidateNumber) || candidateNumber < 1) {
      throw new Error("Candidate number must be a positive whole number");
    }
  }

  const gender =
    input.gender === undefined ? null : parseGender(input.gender);

  const nextGender = gender ?? current.gender;
  const nextNumber = candidateNumber ?? current.candidate_number;

  const [conflicts] = await pool.query<CandidateRow[]>(
    `${CANDIDATE_SELECT}
     WHERE gender = :gender AND candidate_number = :candidateNumber AND id <> :id
     LIMIT 1`,
    { gender: nextGender, candidateNumber: nextNumber, id }
  );
  if (conflicts[0]) {
    const label = nextGender === "male" ? "Mr." : "Miss";
    throw new Error(
      `${label} #${nextNumber} is already used by ${conflicts[0].name}. Pick another number or division.`
    );
  }

  const talentDetails =
    input.talentDetails === undefined
      ? null
      : input.talentDetails?.trim() || null;
  const clearTalent = input.talentDetails !== undefined;

  try {
    await pool.query(
      `UPDATE candidates
       SET candidate_number = COALESCE(:candidateNumber, candidate_number),
           gender = COALESCE(:gender, gender),
           name = COALESCE(:name, name),
           department = COALESCE(:department, department),
           talent_details = CASE WHEN :clearTalent THEN :talentDetails ELSE talent_details END,
           photo_url = COALESCE(:photoUrl, photo_url)
       WHERE id = :id`,
      {
        id,
        candidateNumber,
        gender,
        name: input.name?.trim() ?? null,
        department: input.department?.trim() ?? null,
        clearTalent: clearTalent ? 1 : 0,
        talentDetails,
        photoUrl: input.photoUrl ?? null,
      }
    );
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      const label = nextGender === "male" ? "Mr." : "Miss";
      throw new Error(
        `${label} #${nextNumber} is already used. Pick another number or division.`
      );
    }
    throw error;
  }

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
    `${JUDGE_SELECT} WHERE role = 'judge' ORDER BY judge_number`
  );
  return rows.map(mapJudge);
}

export async function createJudge(input: {
  username: string;
  password: string;
  displayName?: string | null;
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
  const displayName = input.displayName?.trim() || null;

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO users (username, display_name, password_hash, role, judge_number)
     VALUES (:username, :displayName, :passwordHash, 'judge', :judgeNumber)`,
    {
      username: input.username.trim(),
      displayName,
      passwordHash,
      judgeNumber,
    }
  );

  await syncScoreGrid();

  const [rows] = await pool.query<JudgeRow[]>(`${JUDGE_SELECT} WHERE id = :id`, {
    id: result.insertId,
  });

  return mapJudge(rows[0]);
}

export async function updateJudge(
  id: number,
  input: Partial<{
    username: string;
    displayName: string | null;
    password: string;
    judgeNumber: number;
  }>
): Promise<JudgeAccount> {
  const changingProfile =
    input.username !== undefined ||
    input.displayName !== undefined ||
    input.judgeNumber !== undefined;

  // Password can be changed anytime; profile fields require scoring closed.
  if (changingProfile) {
    await assertSetupAllowed();
  }

  const updates: string[] = [];
  const params: Record<string, string | number | null> = { id };

  if (input.username !== undefined) {
    const username = input.username.trim();
    if (!username) throw new Error("Username is required");
    updates.push("username = :username");
    params.username = username;
  }

  if (input.displayName !== undefined) {
    updates.push("display_name = :displayName");
    params.displayName = input.displayName?.trim() || null;
  }

  if (input.judgeNumber !== undefined) {
    if (!Number.isInteger(input.judgeNumber) || input.judgeNumber < 1) {
      throw new Error("Judge number must be a positive whole number");
    }
    updates.push("judge_number = :judgeNumber");
    params.judgeNumber = input.judgeNumber;
  }

  if (input.password !== undefined && input.password !== "") {
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
    `${JUDGE_SELECT} WHERE id = :id AND role = 'judge'`,
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

/** Clear all judge scores and tabulation results; keep candidates, judges, categories, settings. */
export async function resetAllScores(): Promise<{ clearedScoreRows: number }> {
  const connection = await pool.getConnection();
  let clearedScoreRows = 0;
  try {
    await connection.beginTransaction();

    const [scoreResult] = await connection.query<ResultSetHeader>(
      `UPDATE scores
       SET raw_score = NULL, is_submitted = 0
       WHERE raw_score IS NOT NULL OR is_submitted = 1`
    );
    clearedScoreRows = Number(scoreResult.affectedRows ?? 0);

    await connection.query("DELETE FROM candidate_results");
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await syncScoreGrid();
  await recalculateTabulation();

  return { clearedScoreRows };
}
