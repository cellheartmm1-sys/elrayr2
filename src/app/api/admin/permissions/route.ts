import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { SYSTEM_MODULES } from '@/lib/approvals-types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('user_id');
    const email = searchParams.get('email');

    // 1. If email provided without userId, resolve userId and role
    let userRole = '';
    if (!userId && email) {
      const userRes = await query('SELECT id, role FROM users WHERE email = $1 OR username = $1', [email]);
      if (userRes.rows.length > 0) {
        userId = userRes.rows[0].id;
        userRole = userRes.rows[0].role;
      }
    } else if (userId) {
      const userRes = await query('SELECT role FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length > 0) {
        userRole = userRes.rows[0].role;
      }
    }

    // 2. If target user is Admin, return full permissions for all modules
    if (userRole === 'admin') {
      const adminPermissions = SYSTEM_MODULES.map(m => ({
        user_id: userId || 'admin',
        module: m.id,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
        requires_approval: false
      }));
      return NextResponse.json(adminPermissions);
    }

    // 3. If userId is available, fetch exact user permissions from database
    if (userId) {
      const result = await query('SELECT * FROM user_permissions WHERE user_id = $1', [userId]);
      const rows = result.rows;

      const permissionsMap = new Map(rows.map((r: any) => [r.module, r]));
      const fullPermissions = SYSTEM_MODULES.map(m => {
        if (permissionsMap.has(m.id)) {
          const perm = permissionsMap.get(m.id);
          return {
            ...perm,
            // Ensure settings module is never viewable by non-admin users
            can_view: m.id === 'settings' ? false : Boolean(perm.can_view),
            can_create: m.id === 'settings' ? false : Boolean(perm.can_create),
            can_edit: m.id === 'settings' ? false : Boolean(perm.can_edit),
            can_delete: m.id === 'settings' ? false : Boolean(perm.can_delete),
          };
        }
        
        // Default for non-admin user when module is not saved yet:
        // Default to false so ungranted modules are NOT accessible by default!
        return {
          user_id: userId,
          module: m.id,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
          requires_approval: true
        };
      });

      return NextResponse.json(fullPermissions);
    }

    // If no user specified, return empty array to prevent data leaks
    return NextResponse.json([]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, permissions } = body;

    if (!user_id || !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    for (const perm of permissions) {
      await query(
        `INSERT INTO user_permissions (user_id, module, can_view, can_create, can_edit, can_delete, requires_approval, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (user_id, module) DO UPDATE SET
           can_view = EXCLUDED.can_view,
           can_create = EXCLUDED.can_create,
           can_edit = EXCLUDED.can_edit,
           can_delete = EXCLUDED.can_delete,
           requires_approval = EXCLUDED.requires_approval,
           updated_at = NOW()`,
        [
          user_id,
          perm.module,
          perm.module === 'settings' ? false : Boolean(perm.can_view),
          perm.module === 'settings' ? false : Boolean(perm.can_create),
          perm.module === 'settings' ? false : Boolean(perm.can_edit),
          perm.module === 'settings' ? false : Boolean(perm.can_delete),
          perm.requires_approval !== undefined ? perm.requires_approval : true
        ]
      );
    }

    return NextResponse.json({ success: true, message: 'تم حفظ الصلاحيات بنجاح' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
