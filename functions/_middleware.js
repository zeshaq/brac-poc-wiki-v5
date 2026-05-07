// Auth gate for the BFSI POC wiki.
//
// Every non-public request must carry a valid signed session cookie.
// Public paths (login form, login/logout API, the shared stylesheet for
// the login form, favicon, robots) are allowed through unauthenticated.
// Anything else: 302 -> /login?next=<original path>.

const COOKIE_NAME = "bfsi_session";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours

const PUBLIC_EXACT = new Set([
  "/login",
  "/login.html",
  "/styles.css",
  "/favicon.ico",
  "/robots.txt",
  "/api/login",
  "/api/logout",
]);

function isPublic(pathname) {
  return PUBLIC_EXACT.has(pathname);
}

function readCookie(request, name) {
  const raw = request.headers.get("Cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) return part.slice(eq + 1).trim();
  }
  return null;
}

function safeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function hmacSign(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  let s = "";
  const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function isSessionValid(cookieValue, secret) {
  if (!cookieValue || !secret) return false;
  const dot = cookieValue.indexOf(".");
  if (dot < 0) return false;
  const tsStr = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const ts = Number(tsStr);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  const ageSeconds = (Date.now() / 1000) - ts;
  if (ageSeconds < 0 || ageSeconds > SESSION_MAX_AGE_SECONDS) return false;
  const expected = await hmacSign(secret, tsStr);
  return safeCompare(sig, expected);
}

export const onRequest = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (isPublic(url.pathname)) return next();

  const cookie = readCookie(request, COOKIE_NAME);
  const ok = await isSessionValid(cookie, env.COOKIE_SECRET);
  if (ok) return next();

  const dest = new URL("/login", url);
  dest.searchParams.set("next", url.pathname + (url.search || ""));
  return Response.redirect(dest.toString(), 302);
};
