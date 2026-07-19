import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { SYSTEM_MODULES } from '@/lib/approvals-types';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    // Fetch existing user permissions
    let sql = 'SELECT * FROM user_permissions';
    const params: any[] = [];

    if (userId) {
      sql += ' WHERE user_id = $1';
      params.push(userId);
    }

    const result = await query(sql, params);
    const rows = result.rows;

    // If fetching for a specific user, merge defaults for missing modules
    if (userId) {
      const permissionsMap = new Map(rows.map((r: any) => [r.module, r]));
      const fullPermissions = SYSTEM_MODULES.map(m => {
        if (permissionsMap.has(m.id)) {
          return permissionsMap.get(m.id);
        }
        return {
          user_id: userId,
          module: m.id,
          can_view: true,
          can_create: false,
          can_edit: false,
          can_delete: false,
          requires_approval: true
        };
      });
      return NextResponse.json(fullPermissions);
    }

    return NextResponse.json(rows);
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
          perm.can_view,
          perm.can_create,
          perm.can_edit,
          perm.can_delete,
          perm.requires_approval !== undefined ? perm.requires_approval : true
        ]
      );
    }

    return NextResponse.json({ success: true, message: 'تم حفظ الصلاحيات بنجاح' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
