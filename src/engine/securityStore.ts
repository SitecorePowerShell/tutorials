/**
 * In-memory mock of Sitecore's user/role store. Used by the simulator's
 * security cmdlets (Get-User, Get-Role, Add-RoleMember, etc.).
 *
 * Real SPE backs these onto Sitecore's MembershipProvider; we just keep
 * a small representative set so the security lesson can run end-to-end.
 */

export interface MockRole {
  /** _isRole + name match SitecoreItem shape so the default formatter can
   *  table them without bespoke handling */
  _isRole: true;
  /** Used by the post-loop formatter as the row's "Name" cell */
  name: string;
  Name: string;        // "sitecore\\Developer"
  Domain: string;       // "sitecore"
  IsEveryone: boolean;
  Description?: string;
}

export interface MockUser {
  _isUser: true;
  name: string;
  Name: string;        // "sitecore\\admin"
  Domain: string;
  IsAdministrator: boolean;
  IsAuthenticated: boolean;
  Email?: string;
  FullName?: string;
  MemberOf: MockRole[];
}

const role = (
  Name: string,
  Description?: string,
  IsEveryone = false
): MockRole => ({
  _isRole: true,
  name: Name,
  Name,
  Domain: Name.split("\\")[0],
  IsEveryone,
  Description,
});

const ROLES: MockRole[] = [
  role("sitecore\\Developer", "Sitecore developers"),
  role("sitecore\\Sitecore Client Authoring", "Default Content Editor access"),
  role("sitecore\\Author", "Content authors"),
  role("sitecore\\Sitecore Client Users"),
  role("extranet\\Everyone", undefined, true),
];

const user = (
  Name: string,
  IsAdministrator: boolean,
  memberRoleNames: string[] = [],
  Email?: string,
  FullName?: string
): MockUser => ({
  _isUser: true,
  name: Name,
  Name,
  Domain: Name.split("\\")[0],
  IsAdministrator,
  IsAuthenticated: false,
  Email,
  FullName,
  MemberOf: memberRoleNames
    .map((rn) => ROLES.find((r) => r.Name.toLowerCase() === rn.toLowerCase()))
    .filter((r): r is MockRole => !!r),
});

const USERS: MockUser[] = [
  user("sitecore\\Admin", true, [], "admin@example.com", "Administrator"),
  user(
    "sitecore\\michael",
    false,
    ["sitecore\\Developer", "sitecore\\Sitecore Client Authoring"],
    "michael@example.com",
    "Michael West"
  ),
  user(
    "sitecore\\jdoe",
    false,
    ["sitecore\\Author"],
    "jdoe@example.com",
    "Jane Doe"
  ),
  user("default\\Anonymous", false),
  user("extranet\\Anonymous", false, ["extranet\\Everyone"]),
];

/** Fully-qualify a name; assumes "sitecore" if no domain prefix. */
function qualify(name: string): string {
  return name.includes("\\") ? name : `sitecore\\${name}`;
}

/** Wildcard match using shell-style * and ? (case-insensitive). */
function matchesPattern(value: string, pattern: string): boolean {
  const re =
    "^" +
    pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".") +
    "$";
  return new RegExp(re, "i").test(value);
}

export function findUser(identity: string): MockUser | undefined {
  const q = qualify(identity).toLowerCase();
  return USERS.find((u) => u.Name.toLowerCase() === q);
}

export function filterUsers(pattern: string): MockUser[] {
  return USERS.filter((u) => matchesPattern(u.Name, pattern));
}

export function findRole(identity: string): MockRole | undefined {
  const q = qualify(identity).toLowerCase();
  return ROLES.find((r) => r.Name.toLowerCase() === q);
}

export function filterRoles(pattern: string): MockRole[] {
  return ROLES.filter((r) => matchesPattern(r.Name, pattern));
}

export function createUser(
  identity: string,
  email?: string,
  fullName?: string
): MockUser {
  const u = user(qualify(identity), false, [], email, fullName);
  USERS.push(u);
  return u;
}

export function createRole(identity: string, description?: string): MockRole {
  const r = role(qualify(identity), description);
  ROLES.push(r);
  return r;
}

export function addRoleMember(roleIdentity: string, memberIdentity: string): {
  ok: boolean;
  reason?: string;
} {
  const r = findRole(roleIdentity);
  if (!r) return { ok: false, reason: `Role '${roleIdentity}' not found.` };
  const u = findUser(memberIdentity);
  if (!u) return { ok: false, reason: `User '${memberIdentity}' not found.` };
  if (!u.MemberOf.some((mr) => mr.Name === r.Name)) {
    u.MemberOf.push(r);
  }
  return { ok: true };
}

export function removeRoleMember(
  roleIdentity: string,
  memberIdentity: string
): { ok: boolean; reason?: string } {
  const r = findRole(roleIdentity);
  if (!r) return { ok: false, reason: `Role '${roleIdentity}' not found.` };
  const u = findUser(memberIdentity);
  if (!u) return { ok: false, reason: `User '${memberIdentity}' not found.` };
  u.MemberOf = u.MemberOf.filter((mr) => mr.Name !== r.Name);
  return { ok: true };
}

export function testAccount(identity: string): boolean {
  return !!findUser(identity) || !!findRole(identity);
}

/**
 * Mock ACL test — simulates Sitecore's permission system at a coarse level:
 *  - Administrators can do anything.
 *  - Non-admin users can read everything.
 *  - Write/Create/Delete/Admin require the user to be in a role whose name
 *    contains "Author", "Developer", or "Client Authoring".
 *  - Items under /sitecore/system are admin-only.
 */
export function testItemAcl(
  path: string,
  identity: string,
  accessRight: string
): boolean {
  const u = findUser(identity);
  if (!u) return false;
  if (u.IsAdministrator) return true;

  const right = accessRight.toLowerCase();
  if (right === "item:read" || right === "field:read" || right === "language:read") {
    return true;
  }

  // Normalize so we catch both forward- and back-slash path conventions
  const normalized = path.toLowerCase().replace(/\\/g, "/");
  if (normalized.includes("/sitecore/system")) {
    return false;
  }

  const elevated = ["Author", "Developer", "Client Authoring"];
  return u.MemberOf.some((r) =>
    elevated.some((needle) => r.Name.includes(needle))
  );
}

/** Reset to seed state — used by tests so role/user mutations don't leak. */
export function _resetSecurityStore(): void {
  // Trim any user / role added past the original seed.
  USERS.length = 5;
  ROLES.length = 5;
  // Reset MemberOf back to the seeded values.
  const fresh = [
    { name: "sitecore\\Admin", roles: [] as string[] },
    {
      name: "sitecore\\michael",
      roles: ["sitecore\\Developer", "sitecore\\Sitecore Client Authoring"],
    },
    { name: "sitecore\\jdoe", roles: ["sitecore\\Author"] },
    { name: "default\\Anonymous", roles: [] as string[] },
    { name: "extranet\\Anonymous", roles: ["extranet\\Everyone"] },
  ];
  for (const f of fresh) {
    const u = USERS.find((x) => x.Name === f.name);
    if (u) {
      u.MemberOf = f.roles
        .map((rn) => ROLES.find((r) => r.Name === rn))
        .filter((r): r is MockRole => !!r);
    }
  }
}
