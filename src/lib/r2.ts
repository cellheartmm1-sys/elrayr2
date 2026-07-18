import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { query } from './db';

export async function getR2Config() {
  const res = await query('SELECT * FROM companies LIMIT 1');
  if (res.rows.length === 0) return null;
  const company = res.rows[0];
  if (!company.r2_access_key_id || !company.r2_secret_access_key) return null;
  return {
    accountId: company.r2_account_id || '47aa407c8a51f1fe4fe1f387b381e424',
    endpoint: company.r2_endpoint || 'https://47aa407c8a51f1fe4fe1f387b381e424.r2.cloudflarestorage.com',
    bucketName: company.r2_bucket_name || 'elraye2',
    accessKeyId: company.r2_access_key_id,
    secretAccessKey: company.r2_secret_access_key,
    backupIntervalHours: Number(company.r2_backup_interval_hours) || 8,
    lastBackupAt: company.r2_last_backup_at
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
  await query('UPDATE companies SET r2_last_backup_at = NOW()');

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
