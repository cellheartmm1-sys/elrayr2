/**
 * Roles that have read-only access (cannot add, edit, or delete data).
 */
export const READ_ONLY_ROLES = ['accountant', 'secondary', 'store_keeper', 'supervisor'];

/**
 * Returns true if the given role should have read-only access to the system.
 */
export function isReadOnlyRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return READ_ONLY_ROLES.includes(role);
}

/**
 * Returns true if the given role has full admin/manager write access.
 */
export function isAdminOrManager(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'manager';
}
