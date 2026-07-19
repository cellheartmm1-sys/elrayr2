import { query } from './db';
import { SYSTEM_MODULES, UserPermission, PendingApproval } from './approvals-types';

export { SYSTEM_MODULES };
export type { UserPermission, PendingApproval };

// Helper to check if approval is required for a user action
export async function createApprovalRequest(
  requesterName: string,
  requesterRole: string,
  module: string,
  actionType: 'CREATE' | 'UPDATE' | 'DELETE',
  entityType: string,
  title: string,
  details: any,
  requesterId?: string
) {
  const result = await query(
    `INSERT INTO pending_approvals 
     (requester_id, requester_name, requester_role, module, action_type, entity_type, title, details, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
     RETURNING *`,
    [requesterId || null, requesterName, requesterRole, module, actionType, entityType, title, JSON.stringify(details)]
  );
  return result.rows[0];
}
