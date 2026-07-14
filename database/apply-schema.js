const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.gnfsmtammkivxlecvefp:H%40mzafarida123@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

async function runSchema() {
  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL');
    
    const sql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
    
    // Execute entire SQL at once
    await client.query(sql);
    console.log('✅ Schema applied successfully!');
    
    // Verify tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('\n📊 Created tables:');
    result.rows.forEach(r => console.log(' -', r.table_name));
    
    // Count seed data
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM projects) as projects,
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM items_catalog) as items,
        (SELECT COUNT(*) FROM subcontractors) as subcontractors,
        (SELECT COUNT(*) FROM departments) as departments
    `);
    console.log('\n🌱 Seed data:');
    console.log(counts.rows[0]);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    // Try individual statement approach as fallback
    console.log('\n🔄 Trying statement-by-statement approach...');
    await runStatementByStatement(client, connectionString);
  } finally {
    try { await client.end(); } catch(e) {}
  }
}

async function runStatementByStatement(oldClient, connStr) {
  const client = new Client({ 
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    const sql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
    
    // Remove comments and split carefully
    const lines = sql.split('\n');
    let currentStmt = '';
    let stmtCount = 0;
    let successCount = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('--')) continue;
      
      currentStmt += line + '\n';
      
      if (trimmed.endsWith(';')) {
        stmtCount++;
        try {
          await client.query(currentStmt);
          successCount++;
        } catch (err) {
          if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
            console.log(`  ⚠️  Stmt ${stmtCount}: ${err.message.substring(0, 80)}`);
          }
        }
        currentStmt = '';
      }
    }
    
    console.log(`\n✅ Executed ${successCount}/${stmtCount} statements successfully`);
    
    const result = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
    console.log('📊 Tables in database:');
    result.rows.forEach(r => console.log(' -', r.table_name));
    
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  } finally {
    await client.end();
  }
}

runSchema();
