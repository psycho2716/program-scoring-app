import ExcelJS from "exceljs";
import { getSystemState } from "./stateService";
import { getEventSettings } from "./settingsService";
import {
  getCandidatesForExport,
  getRawScoresForExport,
  getTabulation,
} from "./tabulationService";

export async function buildResultsWorkbook(): Promise<ExcelJS.Workbook> {
  const settings = await getEventSettings();
  const eventName = settings.pageantName;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pageant Scoring System";
  workbook.created = new Date();

  const candidates = await getCandidatesForExport();
  const rawScoreBlocks = await getRawScoresForExport();
  const tabulation = await getTabulation();
  const state = await getSystemState();

  const candidatesSheet = workbook.addWorksheet("Candidates");
  candidatesSheet.columns = [
    { header: "#", key: "num", width: 8 },
    { header: "Name", key: "name", width: 30 },
    { header: "Department", key: "department", width: 35 },
  ];
  candidatesSheet.getRow(1).font = { bold: true };
  candidates.forEach((c) => {
    candidatesSheet.addRow({ num: c.candidateNumber, name: c.name, department: c.department });
  });

  const rawSheet = workbook.addWorksheet("RawScores");
  let currentRow = 1;

  for (const block of rawScoreBlocks) {
    rawSheet.mergeCells(currentRow, 1, currentRow, 9);
    const headerCell = rawSheet.getCell(currentRow, 1);
    headerCell.value = `${block.categoryName} — ${block.weight}%`;
    headerCell.font = { bold: true, size: 12 };
    currentRow += 1;

    rawSheet.getRow(currentRow).values = [
      "#",
      "Name",
      "Judge 1",
      "Judge 2",
      "Judge 3",
      "Judge 4",
      "Judge 5",
      "Judge 6",
      "Judge 7",
    ];
    rawSheet.getRow(currentRow).font = { bold: true };
    currentRow += 1;

    for (const row of block.rows) {
      rawSheet.getRow(currentRow).values = [
        row.candidateNumber,
        row.name,
        ...row.judgeScores.map((s) => s ?? ""),
      ];
      currentRow += 1;
    }

    currentRow += 1;
  }

  const tabSheet = workbook.addWorksheet("Tabulation");
  tabSheet.mergeCells(1, 1, 1, 11);
  tabSheet.getCell(1, 1).value = eventName;
  tabSheet.getCell(1, 1).font = { bold: true, size: 14 };

  tabSheet.getRow(2).values = [
    "#",
    "Name",
    "Prod Num (10%)",
    "Advocacy (15%)",
    "Uniform (10%)",
    "Talent (20%)",
    "ASEAN (20%)",
    "Q&A (25%)",
    "Final Score",
    "Rank",
  ];
  tabSheet.getRow(2).font = { bold: true };

  const categoryOrder = rawScoreBlocks.map((b) => b.categoryId);

  tabulation
    .sort((a, b) => a.rank - b.rank)
    .forEach((row, index) => {
      const excelRow = tabSheet.getRow(index + 3);
      const categoryValues = categoryOrder.map((catId) =>
        Number(row.categoryScores[catId] ?? 0).toFixed(2)
      );

      excelRow.values = [
        row.candidateNumber,
        row.name,
        ...categoryValues,
        Number(row.finalScore).toFixed(2),
        row.rank,
      ];

      if (row.rank === 1) {
        excelRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFD700" },
          };
          cell.font = { bold: true };
        });
      }
    });

  const metaSheet = workbook.addWorksheet("Meta");
  metaSheet.addRow(["Event Name", eventName]);
  metaSheet.addRow(["Export Timestamp", new Date().toISOString()]);
  metaSheet.addRow([
    "Active Category at Export",
    state.activeCategory?.categoryName ?? "None",
  ]);
  metaSheet.addRow(["Total Judges", 7]);
  metaSheet.addRow(["Total Candidates", candidates.length]);
  metaSheet.getColumn(1).width = 28;
  metaSheet.getColumn(2).width = 40;

  return workbook;
}

export async function exportResultsBuffer(): Promise<Buffer> {
  const workbook = await buildResultsWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function getExportFilename(pageantName: string): string {
  const slug = pageantName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "Pageant";
  const date = new Date().toISOString().slice(0, 10);
  return `${slug}-Results-${date}.xlsx`;
}
