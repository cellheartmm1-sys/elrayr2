const { Client } = require('pg');

const connectionString = 'postgresql://postgres.gnfsmtammkivxlecvefp:H%40mzafarida123@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

async function verifyApprovalsSystem() {
  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database for verification');

    // 1. Check tables existence
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('user_permissions', 'pending_approvals')
    `);
    console.log('📊 Verified Tables:', tablesRes.rows.map(r => r.table_name));

    // 2. Insert test user permission if not exists
    const usersRes = await client.query(`SELECT id FROM users LIMIT 1`);
    if (usersRes.rows.length > 0) {
      const testUserId = usersRes.rows[0].id;
      await client.query(`
        INSERT INTO user_permissions (user_id, module, can_view, can_create, can_edit, can_delete, requires_approval)
        VALUES ($1, 'projects', true, true, false, false, true)
        ON CONFLICT (user_id, module) DO NOTHING
      `, [testUserId]);
      console.log('✅ Inserted default test user_permissions for user:', testUserId);
    }

    // 3. Test insert into pending_approvals
    const approvalIns = await client.query(`
      INSERT INTO pending_approvals (requester_name, requester_role, module, action_type, entity_type, title, details, status)
      VALUES (
        'سالم الغامدي (المستخدم الثاني)',
        'secondary',
        'projects',
        'CREATE',
        'project',
        'إضافة مشروع تجريبي: برج المستقبل والتطوير',
        '{"name": "برج المستقبل والتطوير", "code": "PRJ-2026-TEST", "client_name": "شركة التطوير الفائق", "contract_value": 5000000, "status": "active"}'::jsonb,
        'pending'
      ) RETURNING id, title, status;
    `);
    const testApproval = approvalIns.rows[0];
    console.log('✅ Created test pending approval:', testApproval);

    // 4. Verify fetching pending approval
    const fetchRes = await client.query(`SELECT COUNT(*) FROM pending_approvals WHERE status = 'pending'`);
    console.log('📋 Total pending approvals count in database:', fetchRes.rows[0].count);

    console.log('\n🎉 Dual-User & Approval Workflow Database Verification SUCCESSFUL!');
  } catch (err) {
    console.error('❌ Verification Error:', err.message);
  } finally {
    await client.end();
  }
}

verifyApprovalsSystem();
