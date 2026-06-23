import { cookies } from "next/headers";

const SESSION_COOKIE = "admin_session";
const SESSION_SECRET = "hr-attendance-admin-2024";

export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (!session) return false;

  return session.value === SESSION_SECRET;
}

export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, SESSION_SECRET, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function verifyCredentials(username: string, password: string): boolean {
  return username === "admin" && password === "1234";
}
