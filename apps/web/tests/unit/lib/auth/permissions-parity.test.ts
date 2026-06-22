import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  Permission,
  ROLE_PERMISSIONS,
  type RoleType,
} from "@/lib/auth/permissions";

/**
 * permissions.ts is a hand-maintained mirror of the backend RBAC model
 * (apps/api/src/prosell/domain/entities/role.py) — there is no shared
 * package between Python and TypeScript, so nothing stops the two from
 * drifting apart silently. This test parses the backend source as text
 * and asserts both sides agree on every Permission value and every role's
 * permission set, so a future edit to one side without the other fails
 * CI instead of becoming a UI-gating bug.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROLE_PY_PATH = join(
  __dirname,
  "../../../../../api/src/prosell/domain/entities/role.py",
);
const rolePySource = readFileSync(ROLE_PY_PATH, "utf-8");

function extractBlock(
  source: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = source.indexOf(startMarker);
  if (start === -1) {
    throw new Error(`Marker not found in role.py: ${startMarker}`);
  }
  const end = source.indexOf(endMarker, start);
  if (end === -1) {
    throw new Error(`End marker not found in role.py: ${endMarker}`);
  }
  return source.slice(start, end);
}

function backendPermissionValues(): Set<string> {
  const block = extractBlock(
    rolePySource,
    "class Permission(StrEnum):",
    "ROLE_PERMISSIONS",
  );
  const values = new Set<string>();
  for (const match of block.matchAll(/^\s{4}[A-Z_]+\s*=\s*"([^"]+)"/gm)) {
    values.add(match[1]);
  }
  return values;
}

function backendRolePermissions(): Record<string, Set<string>> {
  const block = extractBlock(rolePySource, "ROLE_PERMISSIONS", "\nclass Role(");
  const roles: Record<string, Set<string>> = {};
  for (const roleMatch of block.matchAll(
    /RoleType\.([A-Z_]+):\s*\{([^}]*)\}/gs,
  )) {
    const roleName = roleMatch[1].toLowerCase();
    const permissions = new Set<string>();
    for (const permMatch of roleMatch[2].matchAll(/Permission\.([A-Z_]+)/g)) {
      permissions.add(Permission[permMatch[1] as keyof typeof Permission]);
    }
    roles[roleName] = permissions;
  }
  return roles;
}

describe("permissions.ts / role.py parity", () => {
  it("declares the exact same Permission values as the backend", () => {
    const backendValues = backendPermissionValues();
    const frontendValues = new Set(Object.values(Permission));

    expect(frontendValues).toEqual(backendValues);
  });

  it("grants the exact same permissions per role as the backend", () => {
    const backendRoles = backendRolePermissions();
    const frontendRoleNames = Object.keys(ROLE_PERMISSIONS) as RoleType[];

    expect(new Set(frontendRoleNames)).toEqual(
      new Set(Object.keys(backendRoles)),
    );

    for (const role of frontendRoleNames) {
      const frontendSet = new Set<string>(ROLE_PERMISSIONS[role]);
      expect(frontendSet, `role "${role}" permission set diverged`).toEqual(
        backendRoles[role],
      );
    }
  });
});
