import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { query } from './db';

export async function getR2Config() {
  let company: any = {};
  try {
    const res = await query('SELECT * FROM companies LIMIT 1');
    if (res.rows.length > 0) {
      company = res.rows[0];
    }
  } catch (err) {
    console.error('Failed to query company for R2 config:', err);
  }

  // Priority 1: Read from Environment Variables (.env.local / Vercel Environment Variables)
  // Priority 2: Read from Database companies table
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || company.r2_account_id || '47aa407c8a51f1fe4fe1f387b381e424';
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT || company.r2_endpoint || `https://${accountId}.r2.cloudflarestorage.com`;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET || process.env.R2_BUCKET_NAME || company.r2_bucket_name || 'elraye2';
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || company.r2_access_key_id;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || company.r2_secret_access_key;
  const backupIntervalHours = Number(process.env.CLOUDFLARE_R2_BACKUP_INTERVAL || process.env.R2_BACKUP_INTERVAL || company.r2_backup_interval_hours) || 8;

  if (!accessKeyId || !secretAccessKey) return null;

  return {
    accountId,
    endpoint,
    bucketName,
    accessKeyId,
    secretAccessKey,
    backupIntervalHours,
    lastBackupAt: company.r2_last_backup_at,
    isEnvConfigured: !!(process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID)
  };
}

function createS3Client(config: any) {
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

// Full database backup structure query matching database/route.ts
export async function generateBackupData() {
  const TABLE_ORDER = [
    'companies', 'departments', 'items_catalog', 'users', 'warehouses', 'subcontractors',
    'projects', 'employees', 'employee_loans', 'company_debts', 'project_phases',
    'project_progress', 'estimations', 'boq_items', 'material_requests',
    'material_request_items', 'material_submittals', 'inventory_items',
    'inventory_transactions', 'subcontractor_contracts', 'subcontractor_ipc',
    'subcontractor_ipc_items', 'daily_labor', 'labor_attendance', 'client_ipc',
    'client_ipc_items', 'project_expenses', 'maintenance_contracts',
    'maintenance_visits', 'fault_tickets', 'salary_allocations',
    'attendance_records', 'payroll', 'overtime_requests', 'personal_assets',
    'employee_documents', 'equipment_documents', 'notifications'
  ];

  const backup: Record<string, any[]> = {};
  
  for (const name of TABLE_ORDER) {
    const checkRes = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      );
    `, [name]);

    if (checkRes.rows[0].exists) {
      const rowsRes = await query(`SELECT * FROM "${name}"`);
      backup[name] = rowsRes.rows;
    }
  }

  return {
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: backup
  };
}

export async function uploadBackupToR2(config: any) {
  const backupJson = await generateBackupData();
  const fileContent = JSON.stringify(backupJson, null, 2);
  
  // Format filename: backup-YYYY-MM-DD_HH-mm-ss.json
  const now = new Date();
  const dateStr = now.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
  const filename = `backup-${dateStr}.json`;

  const s3 = createS3Client(config);
  
  await s3.send(new PutObjectCommand({
    Bucket: config.bucketName,
    Key: filename,
    Body: fileContent,
    ContentType: 'application/json',
  }));

  // Update last backup timestamp in DB
  try {
    await query('UPDATE companies SET r2_last_backup_at = NOW()');
  } catch (e) {
    console.error('Failed to update r2_last_backup_at:', e);
  }

  return { filename, timestamp: now.toISOString() };
}

export async function listBackupsFromR2(config: any) {
  const s3 = createS3Client(config);
  
  const response = await s3.send(new ListObjectsV2Command({
    Bucket: config.bucketName,
    Prefix: 'backup-',
  }));

  if (!response.Contents) return [];

  // Sort descending by date (most recent first)
  return response.Contents
    .map(item => ({
      key: item.Key || '',
      sizeBytes: item.Size || 0,
      lastModified: item.LastModified || new Date(),
    }))
    .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

export async function getBackupFromR2(key: string, config: any) {
  const s3 = createS3Client(config);
  
  const response = await s3.send(new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  }));

  if (!response.Body) {
    throw new Error('R2 response body is empty');
  }

  return await response.Body.transformToString();
}

let schedulerStarted = false;

export function initBackupScheduler() {
  if (schedulerStarted) return;
  
  // Only start in a Node environment on the server side
  if (typeof window !== 'undefined') return;

  schedulerStarted = true;
  console.log('🔄 [R2 Backup Worker] Initializing background scheduler...');
  
  // Run check immediately on start, then every 10 minutes
  checkAndTriggerBackup().catch(err => console.error('Error in initial backup check:', err));
  
  setInterval(() => {
    checkAndTriggerBackup().catch(err => console.error('Error in backup scheduler loop:', err));
  }, 10 * 60 * 1000); // 10 minutes
}

async function checkAndTriggerBackup() {
  try {
    const config = await getR2Config();
    if (!config) return; // Not configured

    const now = new Date();
    const intervalMs = config.backupIntervalHours * 60 * 60 * 1000;
    
    let shouldBackup = false;
    if (!config.lastBackupAt) {
      shouldBackup = true;
    } else {
      const lastBackup = new Date(config.lastBackupAt);
      const timePassed = now.getTime() - lastBackup.getTime();
      if (timePassed >= intervalMs) {
        shouldBackup = true;
      }
    }

    if (shouldBackup) {
      console.log(`⏰ [R2 Backup Worker] Time for backup! Interval: ${config.backupIntervalHours}h. Triggering upload to R2...`);
      const result = await uploadBackupToR2(config);
      console.log(`✅ [R2 Backup Worker] Auto-backup uploaded successfully: ${result.filename}`);
    }
  } catch (err) {
    console.error('❌ [R2 Backup Worker] Failed to run auto-backup:', err);
  }
}
