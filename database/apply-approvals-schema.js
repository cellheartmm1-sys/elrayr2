const { Client } = require('pg');

const connectionString = 'postgresql://postgres.gnfsmtammkivxlecvefp:H%40mzafarida123@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

async function applyPermissionsSchema() {
  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        module TEXT NOT NULL,
        can_view BOOLEAN DEFAULT TRUE,
        can_create BOOLEAN DEFAULT FALSE,
        can_edit BOOLEAN DEFAULT FALSE,
        can_delete BOOLEAN DEFAULT FALSE,
        requires_approval BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, module)
      );

      CREATE TABLE IF NOT EXISTS pending_approvals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        requester_id UUID REFERENCES users(id),
        requester_name TEXT NOT NULL,
        requester_role TEXT DEFAULT 'secondary',
        module TEXT NOT NULL,
        action_type TEXT NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE')),
        entity_type TEXT NOT NULL,
        title TEXT NOT NULL,
        details JSONB NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        rejection_reason TEXT,
        approved_by UUID REFERENCES users(id),
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('✅ Created user_permissions and pending_approvals tables successfully!');
  } catch (err) {
    console.error('❌ Migration Error:', err.message);
  } finally {
    await client.end();
  }
}

applyPermissionsSchema();
