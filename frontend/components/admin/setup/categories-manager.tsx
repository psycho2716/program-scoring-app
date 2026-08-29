"use client";

import { useEffect, useMemo, useState } from "react";
import { GripVertical, Scale } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ApiResponse, Category, CategoryInput } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CategoriesManagerProps {
  token: string | null;
  scoringLocked?: boolean;
  onChange?: () => void;
}

function toInputs(categories: Category[]): CategoryInput[] {
  return categories.map((cat) => ({
    categoryName: cat.categoryName,
    weight: cat.weight,
    displayOrder: cat.displayOrder,
  }));
}

export function CategoriesManager({ token, scoringLocked = false, onChange }: CategoriesManagerProps) {
  const [categories, setCategories] = useState<CategoryInput[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totalWeight = useMemo(
    () => categories.reduce((sum, cat) => sum + Number(cat.weight || 0), 0),
    [categories]
  );

  const load = async () => {
    if (!token) return;
    const res = await apiFetch<ApiResponse<Category[]>>("/api/admin/categories", {}, token);
    if (res.success && res.data) setCategories(toInputs(res.data));
  };

  useEffect(() => {
    load();
  }, [token]);

  const updateRow = (index: number, patch: Partial<CategoryInput>) => {
    setCategories((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setCategories((prev) => [
      ...prev,
      {
        categoryName: "",
        weight: 0,
        displayOrder: prev.length + 1,
      },
    ]);
  };

  const removeRow = (index: number) => {
    setCategories((prev) =>
      prev.filter((_, i) => i !== index).map((row, i) => ({ ...row, displayOrder: i + 1 }))
    );
  };

  const handleSave = async () => {
    if (!token || scoringLocked) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch<ApiResponse<Category[]>>(
        "/api/admin/categories",
        {
          method: "PUT",
          body: JSON.stringify({ categories }),
        },
        token
      );
      if (res.success && res.data) {
        setCategories(toInputs(res.data));
        setMessage("Categories saved");
        onChange?.();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save categories");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-rsu-teal">
          <Scale className="h-4 w-4" />
          Categories & Weights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {categories.map((category, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              <Input
                value={category.categoryName}
                disabled={scoringLocked}
                onChange={(e) => updateRow(index, { categoryName: e.target.value })}
                placeholder="Category name"
                aria-label={`Category name ${index + 1}`}
                className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0"
              />
              <div className="relative w-20 shrink-0">
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={category.weight}
                  disabled={scoringLocked}
                  onChange={(e) => updateRow(index, { weight: Number(e.target.value) })}
                  aria-label={`Weight percentage for ${category.categoryName || "category"}`}
                  className="h-9 border-rsu-gold/30 bg-rsu-gold/10 pr-6 text-right font-semibold text-rsu-gold"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-rsu-gold/80">
                  %
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={scoringLocked || categories.length <= 1}
                onClick={() => removeRow(index)}
                className="shrink-0 text-red-300 hover:bg-destructive/10 hover:text-red-200"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Total Weight
          </span>
          <span
            className={cn(
              "text-sm font-bold",
              Math.abs(totalWeight - 100) < 0.01 ? "text-rsu-teal" : "text-red-300"
            )}
          >
            {totalWeight.toFixed(0)}%
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" variant="secondary" disabled={scoringLocked} onClick={addRow}>
            Add Category
          </Button>
          <Button type="button" disabled={saving || scoringLocked} onClick={handleSave}>
            {saving ? "Saving..." : "Save Categories"}
          </Button>
        </div>
        {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
