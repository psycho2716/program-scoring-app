"use client";

import { Lock, Radio, Unlock } from "lucide-react";
import { Category, SystemState } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CategoryControlProps {
  categories: Category[];
  state: SystemState | null;
  selectedCategoryId: number | null;
  onSelectCategory: (id: number) => void;
  onBroadcast: () => void;
  onToggleScoring: () => void;
  isUpdating?: boolean;
}

export function CategoryControl({
  categories,
  state,
  selectedCategoryId,
  onSelectCategory,
  onBroadcast,
  onToggleScoring,
  isUpdating = false,
}: CategoryControlProps) {
  const isOpen = Boolean(state?.isScoringOpen);

  return (
    <div className="gold-border-card p-4 md:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-[220px] flex-1 space-y-2">
            <Label htmlFor="category-select" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Active Judging Category
            </Label>
            <Select
              value={selectedCategoryId?.toString() ?? ""}
              onValueChange={(value) => onSelectCategory(Number(value))}
              disabled={isOpen || isUpdating}
            >
              <SelectTrigger
                id="category-select"
                className="h-11 border-white/15 bg-black/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.categoryName} ({cat.weight}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isOpen ? (
              <p className="text-[11px] text-rsu-gold/90">
                Category locked while scoring is open. Close scoring to switch.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Status</p>
            <Badge
              variant={isOpen ? "success" : "destructive"}
              className="h-11 rounded-xl px-4 text-[11px] uppercase tracking-[0.16em]"
            >
              {isOpen ? "Scoring Open" : "Scoring Closed"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!selectedCategoryId || isUpdating}
            onClick={onBroadcast}
            className="border-rsu-teal/30 bg-rsu-teal/10 text-rsu-teal hover:bg-rsu-teal/20"
          >
            <Radio className="h-4 w-4" />
            Broadcast to Judges
          </Button>
          <Button
            type="button"
            variant={isOpen ? "destructive" : "success"}
            disabled={isUpdating || (!isOpen && !selectedCategoryId)}
            onClick={onToggleScoring}
            className={!isOpen ? "bg-rsu-teal hover:bg-teal-400" : undefined}
          >
            {isOpen ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            {isOpen ? "Close Scoring" : "Open Scoring"}
          </Button>
        </div>
      </div>
    </div>
  );
}
