// /api/logout -- clears the session cookie and redirects to /login.

const COOKIE_NAME = "bfsi_session";

export const onRequest = async () => {
  const headers = new Headers();
  headers.set("Location", "/login");
  headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  );
  return new Response(null, { status: 302, headers });
};
