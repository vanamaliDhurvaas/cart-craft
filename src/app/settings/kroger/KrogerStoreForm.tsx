"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, ErrorText } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchIcon, StoreIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";

interface Location {
  locationId: string;
  name: string;
  address: string;
}

export function KrogerStoreForm({ currentLocationId }: { currentLocationId: string | null }) {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/kroger/locations?zip=${encodeURIComponent(zip)}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't search stores.");
      return;
    }
    setLocations(data);
  }

  async function selectStore(locationId: string) {
    setSaving(locationId);
    await fetch("/api/kroger/set-store", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locationId })
    });
    setSaving(null);
    router.refresh();
  }

  return (
    <div>
      {currentLocationId && (
        <p className="mb-4 flex items-center gap-2 text-sm text-fg-muted">
          <StoreIcon size={16} className="text-accent" />
          Current store ID: <span className="font-mono text-xs font-semibold text-fg">{currentLocationId}</span>
        </p>
      )}
      <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-faint" />
          <Input
            id="zip"
            required
            inputMode="numeric"
            aria-label="ZIP code"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="Search stores near a ZIP code…"
            className="pl-10"
          />
        </div>
        <Button type="submit" disabled={loading} variant="secondary">
          {loading ? "Searching…" : "Search"}
        </Button>
      </form>
      {error && <ErrorText>{error}</ErrorText>}
      {locations.length > 0 && (
        <ul className="animate-fade-up mt-4 divide-y divide-line overflow-hidden rounded-[var(--radius-control)] border border-line bg-surface-solid">
          {locations.map((loc) => {
            const selected = loc.locationId === currentLocationId;
            return (
              <li
                key={loc.locationId}
                className={cn(
                  "flex items-center justify-between gap-4 px-4 py-3 transition-colors",
                  selected ? "bg-accent-soft/60" : "hover:bg-surface-2"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{loc.name}</p>
                  <p className="truncate text-sm text-fg-muted">{loc.address}</p>
                </div>
                {selected ? (
                  <Badge variant="success">Selected</Badge>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => selectStore(loc.locationId)}
                    disabled={saving === loc.locationId}
                  >
                    {saving === loc.locationId ? "Saving…" : "Use this store"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
