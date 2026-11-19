/**
 * Runs once when the Next.js server process starts (Node runtime only —
 * not on every request, and not in the Edge runtime). Logs which optional,
 * key-gated integrations are actually active, and specifically calls out
 * a key that's present but set to an empty string — e.g. `ANTHROPIC_API_KEY=""`
 * left over from .env.example — since that's indistinguishable from "off"
 * at runtime (an empty string is falsy) but easy to mistake for "configured"
 * when skimming the file. See docs.next.js.org "instrumentation.ts".
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const checks: Array<[key: string, feature: string]> = [
    ["ANTHROPIC_API_KEY", "AI ingredient extraction from messy captions/pages"],
    ["OPENAI_API_KEY", "Whisper audio-transcription fallback for videos"],
    ["KROGER_CLIENT_ID", "Kroger account connection"],
    ["KROGER_CLIENT_SECRET", "Kroger account connection"]
  ];

  const lines = checks.map(([key, feature]) => {
    const raw = process.env[key];
    if (raw === undefined) return `  ✗ ${key} not set — ${feature} is OFF.`;
    if (raw.trim() === "") {
      return `  ✗ ${key} is set but empty ("") — ${feature} is OFF. Put a real key in .env.local.`;
    }
    return `  ✓ ${key} configured — ${feature} is ON.`;
  });

  console.log("\n— CartCraft integrations —\n" + lines.join("\n") + "\n");
}
