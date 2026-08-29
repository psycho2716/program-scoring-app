"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Save, Upload, X } from "lucide-react";
import { apiFetch, uploadCandidatePhoto } from "@/lib/api";
import type { ApiResponse, Candidate, CandidateFormFields, CandidatesManagerProps } from "@/types";
import { CandidatePhoto } from "@/components/brand/candidate-photo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const emptyForm: CandidateFormFields = {
  candidateNumber: "",
  name: "",
  department: "",
  talentDetails: "",
};

function draftFromCandidate(candidate: Candidate): CandidateFormFields {
  return {
    candidateNumber: String(candidate.candidateNumber),
    name: candidate.name,
    department: candidate.department,
    talentDetails: candidate.talentDetails ?? "",
  };
}

function isDraftDirty(candidate: Candidate, draft: CandidateFormFields): boolean {
  return (
    draft.candidateNumber.trim() !== String(candidate.candidateNumber) ||
    draft.name.trim() !== candidate.name ||
    draft.department.trim() !== candidate.department ||
    draft.talentDetails.trim() !== (candidate.talentDetails ?? "").trim()
  );
}

export function CandidatesManager({
  token,
  scoringLocked = false,
  onChange,
}: CandidatesManagerProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [form, setForm] = useState<CandidateFormFields>(emptyForm);
  const [drafts, setDrafts] = useState<Record<number, CandidateFormFields>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const createFileRef = useRef<HTMLInputElement>(null);
  const rowFileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const load = async () => {
    if (!token) return;
    const res = await apiFetch<ApiResponse<Candidate[]>>("/api/admin/candidates", {}, token);
    if (res.success && res.data) {
      setCandidates(res.data);
      setDrafts((prev) => {
        const next: Record<number, CandidateFormFields> = {};
        for (const candidate of res.data!) {
          // Keep in-progress edits for the same candidate when possible
          const existing = prev[candidate.id];
          next[candidate.id] =
            existing && isDraftDirty(candidate, existing)
              ? existing
              : draftFromCandidate(candidate);
        }
        return next;
      });
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const dirtyIds = useMemo(() => {
    const ids = new Set<number>();
    for (const candidate of candidates) {
      const draft = drafts[candidate.id];
      if (draft && isDraftDirty(candidate, draft)) ids.add(candidate.id);
    }
    return ids;
  }, [candidates, drafts]);

  const handlePhotoSelect = (file: File | null) => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const updateDraft = (id: number, patch: Partial<CandidateFormFields>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? emptyForm), ...patch },
    }));
  };

  const resetDraft = (candidate: Candidate) => {
    setDrafts((prev) => ({ ...prev, [candidate.id]: draftFromCandidate(candidate) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || scoringLocked) return;
    setMessage(null);

    try {
      const res = await apiFetch<ApiResponse<Candidate>>(
        "/api/admin/candidates",
        {
          method: "POST",
          body: JSON.stringify({
            candidateNumber: Number(form.candidateNumber),
            name: form.name,
            department: form.department,
            talentDetails: form.talentDetails.trim() || null,
          }),
        },
        token
      );

      if (!res.success || !res.data) {
        throw new Error(res.error ?? "Failed to add candidate");
      }

      if (photoFile) {
        await uploadCandidatePhoto(res.data.id, photoFile, token);
      }

      setForm(emptyForm);
      handlePhotoSelect(null);
      if (createFileRef.current) createFileRef.current.value = "";
      setMessage(photoFile ? "Candidate added with photo" : "Candidate added");
      await load();
      onChange?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add candidate");
    }
  };

  const handleSave = async (candidate: Candidate) => {
    if (!token || scoringLocked) return;
    const draft = drafts[candidate.id];
    if (!draft) return;

    const candidateNumber = Number(draft.candidateNumber);
    if (!Number.isInteger(candidateNumber) || candidateNumber < 1) {
      setMessage("Candidate number must be a positive whole number");
      return;
    }
    if (!draft.name.trim() || !draft.department.trim()) {
      setMessage("Name and department are required");
      return;
    }

    setSavingId(candidate.id);
    setMessage(null);
    try {
      const res = await apiFetch<ApiResponse<Candidate>>(
        `/api/admin/candidates/${candidate.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            candidateNumber,
            name: draft.name.trim(),
            department: draft.department.trim(),
            talentDetails: draft.talentDetails.trim() || null,
          }),
        },
        token
      );
      if (!res.success || !res.data) {
        throw new Error(res.error ?? "Failed to update candidate");
      }
      setMessage(`Updated #${String(candidateNumber).padStart(2, "0")} ${draft.name.trim()}`);
      await load();
      onChange?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update candidate");
    } finally {
      setSavingId(null);
    }
  };

  const handleRowPhotoUpload = async (candidateId: number, file: File | null) => {
    if (!token || scoringLocked || !file) return;
    setUploadingId(candidateId);
    setMessage(null);
    try {
      await uploadCandidatePhoto(candidateId, file, token);
      setMessage("Photo updated");
      await load();
      onChange?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploadingId(null);
      const input = rowFileRefs.current[candidateId];
      if (input) input.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    if (!token || scoringLocked) return;
    try {
      await apiFetch(`/api/admin/candidates/${id}`, { method: "DELETE" }, token);
      await load();
      onChange?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete candidate");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-rsu-teal">Candidates</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="mb-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-[auto_1fr_1fr_1fr_auto] md:items-end">
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                disabled={scoringLocked}
                onClick={() => createFileRef.current?.click()}
                className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-dashed border-rsu-teal/40 bg-black/30 text-rsu-teal transition hover:border-rsu-teal hover:bg-rsu-teal/10 disabled:opacity-50"
                title="Upload candidate photo"
              >
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
              </button>
              <span className="text-[10px] text-muted-foreground">Photo</span>
              <input
                ref={createFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={scoringLocked}
                onChange={(e) => handlePhotoSelect(e.target.files?.[0] ?? null)}
              />
            </div>
            <Input
              placeholder="#"
              value={form.candidateNumber}
              disabled={scoringLocked}
              onChange={(e) => setForm({ ...form, candidateNumber: e.target.value })}
              required
            />
            <Input
              placeholder="Name"
              value={form.name}
              disabled={scoringLocked}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              placeholder="Department"
              value={form.department}
              disabled={scoringLocked}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              required
            />
            <Button type="submit" variant="teal" disabled={scoringLocked}>
              Add Candidate
            </Button>
          </div>
          <Input
            placeholder="Talent / performance details (e.g. Contemporary Dance Routine)"
            value={form.talentDetails}
            disabled={scoringLocked}
            maxLength={200}
            onChange={(e) => setForm({ ...form, talentDetails: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Optional photo (JPEG, PNG, WebP, or GIF, max 5MB) and talent details for the judges
            scoring screen. Edit any row below, then click Save.
          </p>
        </form>

        <div className="space-y-2">
          {candidates.map((candidate) => {
            const draft = drafts[candidate.id] ?? draftFromCandidate(candidate);
            const dirty = dirtyIds.has(candidate.id);
            const busy = savingId === candidate.id || uploadingId === candidate.id;

            return (
              <div
                key={candidate.id}
                className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <CandidatePhoto
                      name={draft.name || candidate.name}
                      photoUrl={candidate.photoUrl}
                      candidateNumber={
                        Number(draft.candidateNumber) || candidate.candidateNumber
                      }
                      size="md"
                      className="mt-1 shrink-0 rounded-full"
                    />
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[4.5rem_1fr_1fr]">
                      <Input
                        aria-label={`Candidate ${candidate.id} number`}
                        value={draft.candidateNumber}
                        disabled={scoringLocked || busy}
                        onChange={(e) =>
                          updateDraft(candidate.id, { candidateNumber: e.target.value })
                        }
                        className="h-9"
                      />
                      <Input
                        aria-label={`Candidate ${candidate.id} name`}
                        value={draft.name}
                        disabled={scoringLocked || busy}
                        onChange={(e) => updateDraft(candidate.id, { name: e.target.value })}
                        className="h-9 sm:col-span-1"
                      />
                      <Input
                        aria-label={`Candidate ${candidate.id} department`}
                        value={draft.department}
                        disabled={scoringLocked || busy}
                        onChange={(e) =>
                          updateDraft(candidate.id, { department: e.target.value })
                        }
                        className="h-9"
                      />
                      <Input
                        aria-label={`Candidate ${candidate.id} talent details`}
                        value={draft.talentDetails}
                        disabled={scoringLocked || busy}
                        maxLength={200}
                        placeholder="Talent / performance details"
                        onChange={(e) =>
                          updateDraft(candidate.id, { talentDetails: e.target.value })
                        }
                        className="h-9 sm:col-span-3"
                      />
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pt-1">
                    <input
                      ref={(el) => {
                        rowFileRefs.current[candidate.id] = el;
                      }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={scoringLocked || busy}
                      onChange={(e) =>
                        handleRowPhotoUpload(candidate.id, e.target.files?.[0] ?? null)
                      }
                    />
                    {dirty ? (
                      <>
                        <Button
                          type="button"
                          variant="teal"
                          size="sm"
                          disabled={scoringLocked || busy}
                          onClick={() => void handleSave(candidate)}
                        >
                          <Save className="h-3.5 w-3.5" />
                          {savingId === candidate.id ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={scoringLocked || busy}
                          onClick={() => resetDraft(candidate)}
                          className="text-zinc-400"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={scoringLocked || busy}
                      onClick={() => rowFileRefs.current[candidate.id]?.click()}
                      className="border-rsu-teal/30 text-rsu-teal"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingId === candidate.id
                        ? "Uploading..."
                        : candidate.photoUrl
                          ? "Change"
                          : "Upload"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={scoringLocked || busy}
                      onClick={() => void handleDelete(candidate.id)}
                      className="text-red-300 hover:bg-destructive/10 hover:text-red-200"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
