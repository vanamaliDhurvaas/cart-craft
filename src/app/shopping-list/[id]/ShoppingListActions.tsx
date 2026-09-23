"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorText, SuccessText } from "@/components/ui/Field";
import { CartIcon, CheckIcon, RefreshIcon, SearchIcon, SparklesIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";

interface Item {
  id: string;
  ingredientName: string;
  quantity: number;
  unit: string | null;
  krogerProductId: string | null;
  matchedProductDescription: string | null;
  matchedProductSize: string | null;
  matchConfidence: number | null;
  userConfirmed: boolean;
  addedToCart: boolean;
}

interface AltProduct {
  productId: string;
  upc: string;
  description: string;
  brand: string | null;
  sizeDescription: string | null;
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
/* Step 1 — match                                                      */
/* ------------------------------------------------------------------ */

export function MatchButton({
  listId,
  hasStore,
  matchedCount,
  total
}: {
  listId: string;
  hasStore: boolean;
  matchedCount: number;
  total: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/shopping-lists/${listId}/match`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  if (!hasStore) {
    return (
      <p className="text-sm text-fg-muted">
        Set a preferred Kroger store in{" "}
        <Link href="/settings/kroger" className="font-semibold text-accent hover:text-accent-strong">
          Kroger settings
        </Link>{" "}
        before matching products.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-fg-muted">
        {matchedCount === 0
          ? "Search your store's catalog and pick the closest product for every ingredient."
          : `${matchedCount} of ${total} ingredients matched. Run again to refresh.`}
      </p>
      <div className="shrink-0">
        <Button onClick={onClick} disabled={loading} variant={matchedCount === 0 ? "primary" : "secondary"}>
          {loading ? (
            <>
              <Spinner /> Matching…
            </>
          ) : (
            <>
              <SearchIcon size={16} />
              {matchedCount === 0 ? "Match to Kroger products" : "Re-match"}
            </>
          )}
        </Button>
        {error && <ErrorText>{error}</ErrorText>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2 — review rows                                                */
/* ------------------------------------------------------------------ */

export function ItemRow({ item, listId }: { item: Item; listId: string }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(item.userConfirmed);
  const [saving, setSaving] = useState(false);
  const [showAlts, setShowAlts] = useState(false);
  const [alts, setAlts] = useState<AltProduct[] | null>(null);
  const [altsLoading, setAltsLoading] = useState(false);
  const [altsError, setAltsError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(item.addedToCart);
  const [resetting, setResetting] = useState(false);

  async function toggleConfirm() {
    setSaving(true);
    await fetch(`/api/shopping-lists/${listId}/items/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userConfirmed: !confirmed })
    });
    setConfirmed(!confirmed);
    setSaving(false);
    router.refresh();
  }

  async function toggleAlternatives() {
    const next = !showAlts;
    setShowAlts(next);
    if (next && alts === null) {
      setAltsLoading(true);
      setAltsError(null);
      const res = await fetch(`/api/shopping-lists/${listId}/items/${item.id}/alternatives`);
      const data = await res.json();
      setAltsLoading(false);
      if (!res.ok) {
        setAltsError(data.error ?? "Couldn't load alternatives.");
        return;
      }
      setAlts(data.candidates);
    }
  }

  async function selectAlternative(p: AltProduct) {
    setSelecting(p.upc);
    await fetch(`/api/shopping-lists/${listId}/items/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        krogerProductId: p.upc,
        matchedProductDescription: p.description,
        matchedProductSize: p.sizeDescription,
        matchConfidence: 1
      })
    });
    setSelecting(null);
    setShowAlts(false);
    router.refresh();
  }

  async function onResetAddedToCart() {
    setResetting(true);
    await fetch(`/api/shopping-lists/${listId}/items/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ addedToCart: false })
    });
    setAddedToCart(false);
    setResetting(false);
    router.refresh();
  }

  const lowConfidence = item.matchConfidence !== null && item.matchConfidence < 0.4;
  const unresolved = item.quantity === 0;

  return (
    <li className={cn("py-3.5", showAlts && "bg-surface-2/40")}>
      <div className="flex items-center gap-4">
        {/* Confirm control */}
        <div className="flex w-9 shrink-0 justify-center">
          {addedToCart ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-fg">
              <CheckIcon size={13} strokeWidth={3} />
            </span>
          ) : (
            <input
              type="checkbox"
              aria-label={`Confirm ${item.ingredientName}`}
              checked={confirmed}
              disabled={!item.krogerProductId || saving}
              onChange={toggleConfirm}
              className="h-5 w-5 cursor-pointer rounded-md border-line-strong bg-surface-2 accent-accent transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-30"
            />
          )}
        </div>

        {/* Ingredient + product */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="font-medium capitalize text-fg">{item.ingredientName}</p>
            <span className="text-xs text-fg-muted">
              {unresolved ? "amount unclear" : `${item.quantity} ${item.unit ?? ""}`.trim()}
            </span>
            {unresolved && <Badge variant="warn">review</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {item.krogerProductId ? (
              <>
                <span className="text-fg-muted">{item.matchedProductDescription}</span>
                {item.matchedProductSize && <span className="text-xs text-fg-faint">· {item.matchedProductSize}</span>}
                {lowConfidence && <Badge variant="warn">check this</Badge>}
              </>
            ) : (
              <span className="text-fg-faint">Not matched yet</span>
            )}
            <button
              type="button"
              onClick={toggleAlternatives}
              className="text-xs font-semibold text-accent transition-colors hover:text-accent-strong"
            >
              {showAlts ? "Hide" : item.krogerProductId ? "Choose alternative" : "Find product"}
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          {addedToCart ? (
            <>
              <Badge variant="success">In cart</Badge>
              <button
                type="button"
                onClick={onResetAddedToCart}
                disabled={resetting}
                className="text-[11px] text-fg-faint transition-colors hover:text-accent disabled:opacity-50"
              >
                {resetting ? "…" : "Not in cart anymore?"}
              </button>
            </>
          ) : confirmed && item.krogerProductId ? (
            <Badge variant="default">Ready</Badge>
          ) : null}
        </div>
      </div>

      {showAlts && (
        <div className="animate-fade-up mt-3 pl-[52px]">
          {altsLoading && (
            <p className="flex items-center gap-2 text-sm text-fg-muted">
              <Spinner /> Searching Kroger products…
            </p>
          )}
          {altsError && <ErrorText>{altsError}</ErrorText>}
          {alts && alts.length === 0 && !altsLoading && (
            <p className="text-sm text-fg-muted">No other products found for this ingredient.</p>
          )}
          {alts && alts.length > 0 && (
            <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-control)] border border-line bg-surface-solid">
              {alts.map((p) => {
                const isCurrent = p.upc === item.krogerProductId;
                return (
                  <li
                    key={p.upc}
                    className={cn(
                      "flex items-center justify-between gap-4 px-4 py-2.5 transition-colors",
                      isCurrent ? "bg-accent-soft/60" : "hover:bg-surface-2"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{p.description}</p>
                      <p className="text-xs text-fg-muted">{[p.brand, p.sizeDescription].filter(Boolean).join(" · ")}</p>
                    </div>
                    {isCurrent ? (
                      <Badge variant="success">Selected</Badge>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => selectAlternative(p)}
                        disabled={selecting === p.upc}
                      >
                        {selecting === p.upc ? "Selecting…" : "Use this"}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3 — push to cart                                               */
/* ------------------------------------------------------------------ */

export function PushToCartButton({ listId, readyCount }: { listId: string; readyCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch(`/api/shopping-lists/${listId}/push-cart`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setResult(`Added ${data.itemsAdded} item(s) to your Kroger cart.`);
    router.refresh();
  }

  return (
    <div>
      <Button onClick={onClick} disabled={loading || readyCount === 0} size="lg" className="w-full sm:w-auto">
        {loading ? (
          <>
            <Spinner /> Adding to Kroger cart…
          </>
        ) : (
          <>
            <CartIcon size={18} />
            Push {readyCount > 0 ? `${readyCount} item${readyCount === 1 ? "" : "s"}` : "confirmed items"} to Kroger
          </>
        )}
      </Button>
      {result && (
        <SuccessText className="flex items-center gap-2">
          <SparklesIcon size={16} />
          {result} Open the Kroger app to review and check out.
        </SuccessText>
      )}
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

/**
 * We only know an item is "in cart" because we successfully pushed it —
 * Kroger's API doesn't let us read back what's actually still in the
 * user's cart. If they remove items directly in the Kroger app, this lets
 * them tell us to forget that so the whole list becomes pushable again.
 */
export function ResetCartButton({ listId }: { listId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch(`/api/shopping-lists/${listId}/reset-cart`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setResult(
      data.itemsReset > 0
        ? `Reset ${data.itemsReset} item(s) — they're ready to push again.`
        : "Nothing to reset — no items are currently marked as in your cart."
    );
    router.refresh();
  }

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs leading-relaxed text-fg-muted">
        Removed items from your Kroger cart directly? We can&apos;t see that automatically — reset here so they can
        be pushed again.
      </p>
      <div className="shrink-0">
        <Button type="button" variant="ghost" size="sm" onClick={onClick} disabled={loading}>
          <RefreshIcon size={14} />
          {loading ? "Resetting…" : "Reset cart status"}
        </Button>
      </div>
      {result && <p className="w-full text-sm text-fg-muted">{result}</p>}
      {error && <ErrorText className="w-full">{error}</ErrorText>}
    </div>
  );
}
