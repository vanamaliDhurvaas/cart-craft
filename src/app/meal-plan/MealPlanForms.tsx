"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label, Input, Select, ErrorText, Hint } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { CartIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";

const mealTypeLabel: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack"
};

const mealTypeTone: Record<string, string> = {
  BREAKFAST: "bg-amber-soft text-amber",
  LUNCH: "bg-accent-soft text-accent",
  DINNER: "bg-surface-3 text-fg",
  SNACK: "bg-surface-3 text-fg-muted"
};

/* ------------------------------------------------------------------ */
/* Create plan                                                         */
/* ------------------------------------------------------------------ */

export function CreatePlanForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/meal-plans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, startDate, endDate })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setName("");
    setStartDate("");
    setEndDate("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-x-4 md:grid-cols-[1fr_170px_170px_auto] md:items-end">
        <div>
          <Label htmlFor="name">Plan name</Label>
          <Input
            id="name"
            required
            placeholder="This week, September, Sunday dinner…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="startDate">Start</Label>
          <Input id="startDate" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="endDate">End</Label>
          <Input id="endDate" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading} className="mt-4 md:mt-0">
          <PlusIcon size={16} />
          {loading ? "Creating…" : "Create plan"}
        </Button>
      </div>
      <Hint>Pick any range — a single day, a week, a month, whatever you need.</Hint>
      {error && <ErrorText>{error}</ErrorText>}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Add entry                                                           */
/* ------------------------------------------------------------------ */

export function AddEntryForm({
  planId,
  recipes
}: {
  planId: string;
  recipes: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [mealType, setMealType] = useState("DINNER");
  const [multiplier, setMultiplier] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/meal-plans/${planId}/entries`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipeId, date, mealType, servingsMultiplier: multiplier })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setDate("");
    router.refresh();
  }

  if (recipes.length === 0) {
    return (
      <p className="mt-3 text-sm text-fg-muted">
        Add some recipes first, then come back to assign them to this plan.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-2">
      <div className="grid gap-x-4 md:grid-cols-[1fr_160px_150px_110px_auto] md:items-end">
        <div>
          <Label htmlFor={`recipe-${planId}`}>Recipe</Label>
          <Select id={`recipe-${planId}`} value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`date-${planId}`}>Date</Label>
          <Input id={`date-${planId}`} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor={`meal-${planId}`}>Meal</Label>
          <Select id={`meal-${planId}`} value={mealType} onChange={(e) => setMealType(e.target.value)}>
            <option value="BREAKFAST">Breakfast</option>
            <option value="LUNCH">Lunch</option>
            <option value="DINNER">Dinner</option>
            <option value="SNACK">Snack</option>
          </Select>
        </div>
        <div>
          <Label htmlFor={`mult-${planId}`}>Servings ×</Label>
          <Input
            id={`mult-${planId}`}
            type="number"
            step="0.5"
            min="0.5"
            value={multiplier}
            onChange={(e) => setMultiplier(parseFloat(e.target.value) || 1)}
          />
        </div>
        <Button type="submit" disabled={loading} className="mt-4 md:mt-0">
          {loading ? "Adding…" : "Add to plan"}
        </Button>
      </div>
      <Hint>Servings × scales the recipe — 2 doubles every ingredient.</Hint>
      {error && <ErrorText>{error}</ErrorText>}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Plan header (rename / reschedule / delete)                          */
/* ------------------------------------------------------------------ */

function daysBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

function fmtRange(a: string, b: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = new Date(a + "T00:00:00").toLocaleDateString("en-US", opts);
  const end = new Date(b + "T00:00:00").toLocaleDateString("en-US", opts);
  return a === b ? start : `${start} – ${end}`;
}

export function PlanHeader({
  plan,
  entryCount
}: {
  plan: { id: string; name: string; startDate: string; endDate: string };
  entryCount: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(plan.name);
  const [startDate, setStartDate] = useState(plan.startDate);
  const [endDate, setEndDate] = useState(plan.endDate);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/meal-plans/${plan.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, startDate, endDate })
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function onDelete() {
    if (
      !confirm(
        `Delete "${plan.name}"? This also deletes its entries and any shopping lists generated from it.`
      )
    )
      return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/meal-plans/${plan.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setDeleting(false);
      setError(data?.error ?? "Couldn't delete meal plan.");
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <form onSubmit={onSave} className="mb-5 rounded-[var(--radius-control)] border border-line bg-surface-2 px-4 pb-4 pt-1">
        <div className="grid gap-x-4 md:grid-cols-[1fr_170px_170px] md:items-end">
          <div>
            <Label htmlFor={`plan-name-${plan.id}`}>Plan name</Label>
            <Input id={`plan-name-${plan.id}`} required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`plan-start-${plan.id}`}>Start</Label>
            <Input
              id={`plan-start-${plan.id}`}
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`plan-end-${plan.id}`}>End</Label>
            <Input
              id={`plan-end-${plan.id}`}
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        <div className="mt-4 flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="mb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl text-fg">{plan.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            <span className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 font-medium text-fg">
              {fmtRange(plan.startDate, plan.endDate)}
            </span>
            <span>{daysBetween(plan.startDate, plan.endDate)} days</span>
            <span aria-hidden>·</span>
            <span>
              {entryCount} meal{entryCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label="Edit plan">
            <PencilIcon size={15} />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            aria-label="Delete plan"
            className="hover:text-danger"
          >
            <TrashIcon size={15} />
            <span className="hidden sm:inline">{deleting ? "Deleting…" : "Delete"}</span>
          </Button>
        </div>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Entry row (edit / remove)                                           */
/* ------------------------------------------------------------------ */

export function EntryRow({
  planId,
  entry,
  recipes
}: {
  planId: string;
  entry: {
    id: string;
    date: string;
    mealType: string;
    servingsMultiplier: number;
    recipeId: string;
    recipeTitle: string;
  };
  recipes: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [recipeId, setRecipeId] = useState(entry.recipeId);
  const [date, setDate] = useState(entry.date);
  const [mealType, setMealType] = useState(entry.mealType);
  const [multiplier, setMultiplier] = useState(entry.servingsMultiplier);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/meal-plans/${planId}/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipeId, date, mealType, servingsMultiplier: multiplier })
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function onDelete() {
    if (!confirm("Remove this recipe from the plan?")) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/meal-plans/${planId}/entries/${entry.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setDeleting(false);
      setError(data?.error ?? "Couldn't remove entry.");
      return;
    }
    router.refresh();
  }

  const d = new Date(entry.date + "T00:00:00");

  if (editing) {
    return (
      <li className="py-3">
        <form onSubmit={onSave} className="rounded-[var(--radius-control)] border border-line bg-surface-2 px-4 pb-4 pt-1">
          <div className="grid gap-x-3 md:grid-cols-[1fr_150px_140px_100px] md:items-end">
            <div>
              <Label htmlFor={`e-recipe-${entry.id}`}>Recipe</Label>
              <Select id={`e-recipe-${entry.id}`} value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor={`e-date-${entry.id}`}>Date</Label>
              <Input
                id={`e-date-${entry.id}`}
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`e-meal-${entry.id}`}>Meal</Label>
              <Select id={`e-meal-${entry.id}`} value={mealType} onChange={(e) => setMealType(e.target.value)}>
                <option value="BREAKFAST">Breakfast</option>
                <option value="LUNCH">Lunch</option>
                <option value="DINNER">Dinner</option>
                <option value="SNACK">Snack</option>
              </Select>
            </div>
            <div>
              <Label htmlFor={`e-mult-${entry.id}`}>Servings ×</Label>
              <Input
                id={`e-mult-${entry.id}`}
                type="number"
                step="0.5"
                min="0.5"
                value={multiplier}
                onChange={(e) => setMultiplier(parseFloat(e.target.value) || 1)}
              />
            </div>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <div className="mt-4 flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={cn("group flex items-center gap-4 py-3", deleting && "opacity-50")}>
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-amber-soft text-center">
        <span className="text-[10px] font-bold uppercase tracking-wide text-amber">
          {d.toLocaleDateString("en-US", { weekday: "short" })}
        </span>
        <span className="font-display text-base leading-none text-fg">{d.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-fg">{entry.recipeTitle}</p>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className={cn("rounded-full px-2 py-0.5 font-semibold", mealTypeTone[entry.mealType])}>
            {mealTypeLabel[entry.mealType]}
          </span>
          {entry.servingsMultiplier !== 1 && <span className="text-fg-muted">×{entry.servingsMultiplier}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          aria-label="Edit entry"
          title="Edit"
          onClick={() => setEditing(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-all hover:bg-surface-3 hover:text-fg active:scale-95"
        >
          <PencilIcon size={15} />
        </button>
        <button
          type="button"
          aria-label="Remove entry"
          title="Remove"
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-all hover:bg-surface-3 hover:text-danger active:scale-95 disabled:opacity-40"
        >
          <TrashIcon size={15} />
        </button>
      </div>
      {error && <ErrorText className="w-full">{error}</ErrorText>}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Generate shopping list                                              */
/* ------------------------------------------------------------------ */

export function GenerateListButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/shopping-lists/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mealPlanId: planId })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push(`/shopping-list/${data.id}`);
  }

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-fg-muted">
        Combine every ingredient in this plan into one shopping list, then push it to Kroger.
      </p>
      <Button onClick={onClick} disabled={loading} className="shrink-0">
        <CartIcon size={16} />
        {loading ? "Generating…" : "Generate shopping list"}
      </Button>
      {error && <ErrorText className="w-full">{error}</ErrorText>}
    </div>
  );
}
