// POST /api/login -- validates credentials and issues a signed session cookie.
//
// Inputs (form-urlencoded POST):
//   username, password, next
// On success: 302 -> next (or "/"), Set-Cookie: brac_session=<ts>.<hmac>.
// On failure: 302 -> /login?error=1&next=<next>.

const COOKIE_NAME = "brac_session";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

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

function safeNext(raw) {
  if (typeof raw !== "string") return "/";
  // Only allow same-site relative paths.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw.startsWith("/api/login") || raw === "/login" || raw === "/login.html") return "/";
  return raw;
}

export const onRequestPost = async ({ request, env }) => {
  let form;
  try {
    form = await request.formData();
  } catch (_) {
    return new Response("Bad request", { status: 400 });
  }

  const username = String(form.get("username") || "");
  const password = String(form.get("password") || "");
  const next = safeNext(String(form.get("next") || "/"));

  const expectedUser = env.AUTH_USERNAME || "";
  const expectedPass = env.AUTH_PASSWORD || "";
  const cookieSecret = env.COOKIE_SECRET || "";

  // Always run two compares before deciding, to keep timing roughly constant.
  const userOk = safeCompare(username, expectedUser);
  const passOk = safeCompare(password, expectedPass);

  if (!userOk || !passOk || !cookieSecret) {
    const params = new URLSearchParams({ error: "1" });
    if (next !== "/") params.set("next", next);
    const back = new URL("/login?" + params.toString(), request.url);
    return Response.redirect(back.toString(), 302);
  }

  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = await hmacSign(cookieSecret, ts);
  const cookieValue = `${ts}.${sig}`;

  const headers = new Headers();
  headers.set("Location", next);
  headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  );
  return new Response(null, { status: 302, headers });
};

// Reject any non-POST.
export const onRequest = async () => new Response("Method Not Allowed", { status: 405 });
