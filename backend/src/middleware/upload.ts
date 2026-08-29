import fs from "fs";
import path from "path";
import multer from "multer";

export const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");
export const CANDIDATE_UPLOADS_DIR = path.join(UPLOADS_ROOT, "candidates");

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function ensureUploadDirs(): void {
  fs.mkdirSync(CANDIDATE_UPLOADS_DIR, { recursive: true });
}

ensureUploadDirs();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDirs();
    cb(null, CANDIDATE_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const candidateId = Number(req.params.id);
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
    cb(null, `candidate-${candidateId}-${Date.now()}${safeExt}`);
  },
});

export const candidatePhotoUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed"));
      return;
    }
    cb(null, true);
  },
});

export function toPublicUploadPath(absoluteFilePath: string): string {
  const relative = path.relative(UPLOADS_ROOT, absoluteFilePath).replace(/\\/g, "/");
  return `/uploads/${relative}`;
}

export function resolveUploadAbsolutePath(publicPath: string): string | null {
  if (!publicPath.startsWith("/uploads/")) return null;
  const relative = publicPath.replace(/^\/uploads\//, "");
  const absolute = path.resolve(UPLOADS_ROOT, relative);
  if (!absolute.startsWith(UPLOADS_ROOT)) return null;
  return absolute;
}

export function deleteUploadIfExists(publicPath: string | null | undefined): void {
  if (!publicPath) return;
  const absolute = resolveUploadAbsolutePath(publicPath);
  if (!absolute) return;
  try {
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
  } catch {
    // best-effort cleanup
  }
}
