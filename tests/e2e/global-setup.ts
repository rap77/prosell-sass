/** Prepare an authenticated Playwright storage state for protected E2E tests. */
import { chromium, type Cookie, type FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CONFIG_DIR = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_STATE_PATH = path.join(CONFIG_DIR, ".auth", "storage-state.json");

interface UserData {
  tenant_id?: string;
  role?: string;
  [key: string]: unknown;
}

function isUserData(value: unknown): value is UserData {
  return typeof value === "object" && value !== null;
}

function parseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function hasValidAccessToken(storageState: unknown): boolean {
  if (
    typeof storageState !== "object" ||
    storageState === null ||
    !("cookies" in storageState) ||
    !Array.isArray(storageState.cookies)
  ) {
    return false;
  }

  return storageState.cookies.some(
    (cookie: unknown) =>
      typeof cookie === "object" &&
      cookie !== null &&
      "name" in cookie &&
      "expires" in cookie &&
      cookie.name === "access_token" &&
      typeof cookie.expires === "number" &&
      cookie.expires > Date.now() / 1000,
  );
}

function parseSetCookieHeader(header: string): Cookie | null {
  const [nameValue, ...attributes] = header
    .split(";")
    .map((part) => part.trim());
  if (!nameValue) return null;

  const [name, value] = nameValue.split("=");
  if (!name || value === undefined) return null;

  const cookie: Cookie = {
    name,
    value,
    domain: "localhost",
    path: "/",
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  };

  for (const attribute of attributes) {
    const [key, valuePart] = attribute.split("=");
    switch (key.toLowerCase()) {
      case "max-age":
        cookie.expires = Math.floor(
          (Date.now() + Number(valuePart ?? "0") * 1000) / 1000,
        );
        break;
      case "expires":
        cookie.expires = Math.floor(new Date(valuePart ?? "").getTime() / 1000);
        break;
      case "domain":
        cookie.domain = valuePart || "localhost";
        break;
      case "path":
        cookie.path = valuePart || "/";
        break;
      case "samesite": {
        const sameSite = valuePart?.toLowerCase();
        if (sameSite === "lax") cookie.sameSite = "Lax";
        if (sameSite === "strict") cookie.sameSite = "Strict";
        if (sameSite === "none") cookie.sameSite = "None";
        break;
      }
      case "secure":
        cookie.secure = true;
        break;
      case "httponly":
        cookie.httpOnly = true;
        break;
    }
  }

  return cookie;
}

async function globalSetup(_config: FullConfig): Promise<void> {
  if (fs.existsSync(STORAGE_STATE_PATH)) {
    const storedState = parseJson(fs.readFileSync(STORAGE_STATE_PATH, "utf-8"));
    if (hasValidAccessToken(storedState)) return;
  }

  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Set TEST_USER_EMAIL and TEST_USER_PASSWORD for E2E authentication",
    );
  }

  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  const response = await fetch(`${backendUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  if (!response.ok) throw new Error(`E2E login failed: ${response.status}`);

  const cookies = response.headers
    .getSetCookie()
    .map(parseSetCookieHeader)
    .filter((cookie): cookie is Cookie => cookie !== null);
  if (cookies.length === 0) throw new Error("E2E login returned no cookies");

  const userDataCookie = cookies.find((cookie) => cookie.name === "user_data");
  if (userDataCookie) {
    const rawValue = userDataCookie.value.replace(/^"|"$/g, "");
    const userData = parseJson(decodeURIComponent(rawValue));
    if (isUserData(userData)) {
      userData.role = "dealer";
      userDataCookie.value = encodeURIComponent(JSON.stringify(userData));
      if (typeof userData.tenant_id === "string") {
        fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
        fs.writeFileSync(
          path.join(CONFIG_DIR, ".auth", "tenant-id.txt"),
          userData.tenant_id,
        );
      }
    }
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies(cookies);
  await context.newPage();
  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}

export default globalSetup;
