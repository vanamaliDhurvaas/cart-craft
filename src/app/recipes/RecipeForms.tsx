"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Label, Input, Textarea, ErrorText, Hint, SuccessText } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { LinkIcon, PencilIcon, SparklesIcon, TrashIcon, ChevronRightIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";

/** After adding a recipe, bring the (newest-first) recipe list into view so the addition is visible. */
function scrollToRecipeList() {
  if (typeof document === "undefined") return;
  document.getElementById("recipe-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: "Manual",
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
  WEB: "Web"
};

/* ------------------------------------------------------------------ */
/* Add from URL                                                        */
/* ------------------------------------------------------------------ */

export function AddByUrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [needsManual, setNeedsManual] = useState<{ title: string | null; rawExtractedText: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setNeedsManual(null);
    const res = await fetch("/api/recipes/ingest-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    if (data.needsManualInput) {
      setNeedsManual({ title: data.title, rawExtractedText: data.rawExtractedText });
      return;
    }
    setUrl("");
    const count = data.recipe?.ingredients?.length ?? 0;
    setSuccess(`Added "${data.recipe?.title ?? "your recipe"}" — ${count} ingredient${count === 1 ? "" : "s"}.`);
    router.refresh();
    scrollToRecipeList();
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <LinkIcon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-faint" />
          <Input
            id="url"
            type="url"
            required
            aria-label="Recipe URL"
            placeholder="Paste a YouTube, TikTok, Reel, or recipe page link…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-12 pl-11 text-[15px]"
          />
        </div>
        <Button type="submit" size="lg" disabled={loading} className="sm:w-auto">
          {loading ? (
            <>
              <Spinner /> Extracting…
            </>
          ) : (
            <>
              <SparklesIcon size={18} /> Add recipe
            </>
          )}
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-fg-faint">
        <span>Works with</span>
        {["YouTube", "TikTok", "Instagram Reels", "Any recipe site"].map((p) => (
          <span key={p} className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-fg-muted">
            {p}
          </span>
        ))}
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      {success && <SuccessText>✓ {success} See it below.</SuccessText>}
      {needsManual && (
        <Alert variant="warn" className="mt-5">
          <p className="font-semibold text-fg">Couldn&apos;t auto-extract ingredients from that link.</p>
          <p className="my-2 text-fg-muted">
            {needsManual.rawExtractedText
              ? "Here's what we found — paste/edit the ingredient list below and add it manually."
              : "We couldn't read a caption or transcript for this video. Paste the ingredient list below."}
          </p>
          <ManualForm
            prefillTitle={needsManual.title ?? ""}
            prefillText={needsManual.rawExtractedText}
            onSaved={() => setNeedsManual(null)}
          />
        </Alert>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
      aria-hidden
    />
  );
}

/* ------------------------------------------------------------------ */
/* Manual entry                                                        */
/* ------------------------------------------------------------------ */

export function ManualForm({
  prefillTitle = "",
  prefillText = "",
  onSaved
}: {
  prefillTitle?: string;
  prefillText?: string;
  /** Called after a successful save — lets a parent (e.g. the "couldn't auto-extract" fallback) clean itself up. */
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(prefillTitle);
  const [ingredientsText, setIngredientsText] = useState(prefillText);
  const [servings, setServings] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, ingredientsText, servings })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setTitle("");
    setIngredientsText("");
    const count = data.ingredients?.length ?? 0;
    setSuccess(`Added "${data.title ?? "your recipe"}" — ${count} ingredient${count === 1 ? "" : "s"}.`);
    onSaved?.();
    router.refresh();
    scrollToRecipeList();
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-x-4 sm:grid-cols-[1fr_140px]">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="servings">Servings</Label>
          <Input
            id="servings"
            type="number"
            min={1}
            value={servings}
            onChange={(e) => setServings(parseInt(e.target.value, 10) || 1)}
          />
        </div>
      </div>
      <Label htmlFor="ingredientsText">Ingredients (one per line)</Label>
      <Textarea
        id="ingredientsText"
        required
        placeholder={"2 cups flour\n1 tsp salt\n3 eggs"}
        value={ingredientsText}
        onChange={(e) => setIngredientsText(e.target.value)}
      />
      {error && <ErrorText>{error}</ErrorText>}
      <Button type="submit" disabled={loading} className="mt-5">
        {loading ? "Saving…" : "Save recipe"}
      </Button>
      {success && <SuccessText>✓ {success} See it below.</SuccessText>}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Recipe card (view / inline edit / delete)                           */
/* ------------------------------------------------------------------ */

interface RecipeCardData {
  id: string;
  title: string;
  servings: number | null;
  sourceType: string;
  sourceUrl: string | null;
  ingredients: { rawLine: string; name: string }[];
}

export function RecipeCard({ recipe }: { recipe: RecipeCardData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(recipe.title);
  const [servings, setServings] = useState(recipe.servings ?? 1);
  const [ingredientsText, setIngredientsText] = useState(recipe.ingredients.map((i) => i.rawLine).join("\n"));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/recipes/${recipe.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, servings, ingredientsText })
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
    if (!confirm(`Delete "${recipe.title}"? This also removes it from any meal plans it's used in.`)) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setDeleting(false);
      setError(data?.error ?? "Couldn't delete recipe.");
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <Card className="md:col-span-2 xl:col-span-3">
        <form onSubmit={onSave}>
          <div className="mb-1 flex items-center gap-2">
            <PencilIcon size={16} className="text-accent" />
            <span className="text-sm font-semibold text-fg">Editing recipe</span>
          </div>
          <div className="grid gap-x-4 sm:grid-cols-[1fr_140px]">
            <div>
              <Label htmlFor={`title-${recipe.id}`}>Title</Label>
              <Input id={`title-${recipe.id}`} required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor={`servings-${recipe.id}`}>Servings</Label>
              <Input
                id={`servings-${recipe.id}`}
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>
          <Label htmlFor={`ingredients-${recipe.id}`}>Ingredients (one per line)</Label>
          <Textarea
            id={`ingredients-${recipe.id}`}
            required
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
            className="min-h-[200px]"
          />
          {error && <ErrorText>{error}</ErrorText>}
          <div className="mt-5 flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  const preview = recipe.ingredients.slice(0, 4);
  const more = recipe.ingredients.length - preview.length;

  return (
    <Card interactive className={cn("group flex h-full flex-col", deleting && "opacity-50")}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <Badge variant="muted">{SOURCE_LABEL[recipe.sourceType] ?? recipe.sourceType}</Badge>
        <div className="flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
          <IconButton label="Edit recipe" onClick={() => setEditing(true)}>
            <PencilIcon size={15} />
          </IconButton>
          <IconButton label="Delete recipe" onClick={onDelete} disabled={deleting} danger>
            <TrashIcon size={15} />
          </IconButton>
        </div>
      </div>

      <h3 className="font-display text-[19px] leading-snug text-fg">{recipe.title}</h3>
      <p className="mt-1 text-xs text-fg-muted">
        {recipe.ingredients.length} ingredient{recipe.ingredients.length === 1 ? "" : "s"} · serves{" "}
        {recipe.servings ?? 1}
      </p>

      {preview.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {preview.map((i, idx) => (
            <span
              key={idx}
              className="max-w-full truncate rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs text-fg-muted"
            >
              {i.name}
            </span>
          ))}
          {more > 0 && <span className="px-1 py-0.5 text-xs text-fg-faint">+{more} more</span>}
        </div>
      )}

      {recipe.sourceUrl && (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-medium text-fg-faint transition-colors hover:text-accent"
        >
          Open source
          <ChevronRightIcon size={12} />
        </a>
      )}
      {error && <ErrorText>{error}</ErrorText>}
    </Card>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger = false,
  children
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-all duration-150",
        "hover:bg-surface-3 active:scale-95 disabled:opacity-40",
        danger ? "hover:text-danger" : "hover:text-fg"
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Card wrappers used by the page                                      */
/* ------------------------------------------------------------------ */

export function RecipeIngestCard() {
  return (
    <Card className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--accent-glow), transparent 70%)" }}
        aria-hidden
      />
      <div className="relative">
        <CardTitle className="mb-1">Add from a link</CardTitle>
        <p className="mb-5 text-sm text-fg-muted">
          We&apos;ll pull out just the ingredients — even from a messy video caption.
        </p>
        <AddByUrlForm />
      </div>
    </Card>
  );
}

export function ManualRecipeCard() {
  return (
    <details className="group rounded-[var(--radius-card)] border border-line bg-surface shadow-card backdrop-blur-xl open:shadow-card-hover">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="font-display text-[22px] text-fg">Or type one in</h2>
          <p className="mt-0.5 text-sm text-fg-muted">
            Paste an ingredient list — each line becomes a quantity, unit, and name.
          </p>
        </div>
        <ChevronRightIcon
          size={18}
          className="shrink-0 text-fg-faint transition-transform duration-300 group-open:rotate-90"
        />
      </summary>
      <div className="border-t border-line px-5 pb-5 sm:px-6 sm:pb-6">
        <ManualForm />
        <Hint>Tip: sub-headers like &quot;For the sauce&quot; are ignored automatically.</Hint>
      </div>
    </details>
  );
}
