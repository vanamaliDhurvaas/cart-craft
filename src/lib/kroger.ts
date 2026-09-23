/**
 * Kroger Partner API client: OAuth2 (client-credentials for public product
 * search, authorization-code for per-user cart access), product search,
 * store location search, and cart push.
 *
 * Reference: https://developer.kroger.com (register an app there first —
 * see README "Kroger developer registration" for the walkthrough). Endpoint
 * shapes below match the public API as documented there; double-check
 * against your dashboard's docs if Kroger has changed anything since.
 *
 * Requires KROGER_CLIENT_ID, KROGER_CLIENT_SECRET, KROGER_REDIRECT_URI, and
 * optionally KROGER_API_BASE (defaults to production).
 */

import { prisma } from "./prisma";

function apiBase() {
  return (process.env.KROGER_API_BASE || "https://api.kroger.com").replace(/\/+$/, "");
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set. See .env.example.`);
  return v;
}

function basicAuthHeader() {
  const id = requireEnv("KROGER_CLIENT_ID");
  const secret = requireEnv("KROGER_CLIENT_SECRET");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

async function postToken(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${apiBase()}/v1/connect/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: basicAuthHeader(),
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(params).toString()
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Kroger token request failed (${res.status}): ${body.slice(0, 500)}`);
  }
  return res.json();
}

/** App-level token for public data (product search) that doesn't need a specific user. */
export async function getAppToken(): Promise<string> {
  const token = await postToken({ grant_type: "client_credentials", scope: "product.compact" });
  return token.access_token;
}

/** Step 1 of per-user auth: send the user here to authorize cart access. */
export function getAuthorizeUrl(state: string): string {
  const clientId = requireEnv("KROGER_CLIENT_ID");
  const redirectUri = requireEnv("KROGER_REDIRECT_URI");
  const url = new URL(`${apiBase()}/v1/connect/oauth2/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "cart.basic:write profile.compact");
  url.searchParams.set("state", state);
  return url.toString();
}

/** Step 2: exchange the ?code=... callback param for user access + refresh tokens. */
export async function exchangeCodeForUserToken(code: string) {
  const redirectUri = requireEnv("KROGER_REDIRECT_URI");
  return postToken({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
}

async function refreshUserToken(refreshToken: string) {
  return postToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}

/**
 * Returns a valid access token for this user, refreshing (and persisting the
 * refreshed tokens) if the stored one is expired or close to expiring.
 * Throws if the user hasn't connected Kroger yet.
 */
export async function ensureValidUserToken(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.krogerAccessToken || !user.krogerRefreshToken) {
    throw new Error("This user hasn't connected a Kroger account yet.");
  }

  const expiresAt = user.krogerTokenExpiresAt?.getTime() ?? 0;
  const needsRefresh = expiresAt - Date.now() < 60_000; // refresh if <60s of life left
  if (!needsRefresh) return user.krogerAccessToken;

  const refreshed = await refreshUserToken(user.krogerRefreshToken);
  await prisma.user.update({
    where: { id: userId },
    data: {
      krogerAccessToken: refreshed.access_token,
      krogerRefreshToken: refreshed.refresh_token ?? user.krogerRefreshToken,
      krogerTokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000)
    }
  });
  return refreshed.access_token;
}

export interface KrogerLocation {
  locationId: string;
  name: string;
  address: string;
}

export async function searchLocations(zipCode: string): Promise<KrogerLocation[]> {
  const token = await getAppToken();
  const url = new URL(`${apiBase()}/v1/locations`);
  url.searchParams.set("filter.zipCode.near", zipCode);
  url.searchParams.set("filter.limit", "10");
  const res = await fetch(url.toString(), { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Kroger location search failed (${res.status})`);
  const data = await res.json();
  return (data.data ?? []).map((loc: Record<string, any>) => ({
    locationId: loc.locationId,
    name: loc.name,
    address: [loc.address?.addressLine1, loc.address?.city, loc.address?.state].filter(Boolean).join(", ")
  }));
}

export interface KrogerProduct {
  productId: string;
  upc: string;
  description: string;
  brand: string | null;
  sizeDescription: string | null;
}

/** Search Kroger's catalog at a specific store for a given ingredient/product term. */
export async function searchProducts(term: string, locationId: string): Promise<KrogerProduct[]> {
  const token = await getAppToken();
  const url = new URL(`${apiBase()}/v1/products`);
  url.searchParams.set("filter.term", term);
  url.searchParams.set("filter.locationId", locationId);
  url.searchParams.set("filter.limit", "5");
  const res = await fetch(url.toString(), { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Kroger product search failed (${res.status}) for term "${term}"`);
  const data = await res.json();
  return (data.data ?? []).map((p: Record<string, any>) => ({
    productId: p.productId,
    upc: p.upc,
    description: p.description,
    brand: p.brand ?? null,
    sizeDescription: p.items?.[0]?.size ?? null
  }));
}

export type KrogerModality = "PICKUP" | "DELIVERY";

/** Push matched items directly into the authenticated user's real Kroger cart. */
export async function addItemsToCart(
  userId: string,
  items: Array<{ upc: string; quantity: number }>,
  modality: KrogerModality = "DELIVERY"
): Promise<void> {
  const accessToken = await ensureValidUserToken(userId);
  const res = await fetch(`${apiBase()}/v1/cart/add`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      items: items.map((i) => ({ upc: i.upc, quantity: i.quantity, modality }))
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Kroger cart add failed (${res.status}): ${body.slice(0, 500)}`);
  }
}
