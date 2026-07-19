export interface UserPermission {
  id?: string;
  user_id: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  requires_approval: boolean;
}

export interface PendingApproval {
  id?: string;
  requester_id?: string;
  requester_name: string;
  requester_role: string;
  module: string;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: string;
  title: string;
  details: any;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  approved_by?: string;
  approved_at?: string;
  created_at?: string;
}

// All available system modules
export const SYSTEM_MODULES = [
  { id: 'projects', name: 'المشاريع' },
  { id: 'estimation', name: 'الهندسة والتسعير' },
  { id: 'procurement', name: 'المشتريات والمخازن' },
  { id: 'subcontractors', name: 'مقاولو الباطن' },
  { id: 'labor', name: 'العمالة اليومية' },
  { id: 'maintenance', name: 'الصيانة والتشغيل' },
  { id: 'finance', name: 'المالية والمستخلصات' },
  { id: 'hr', name: 'الموارد البشرية' },
  { id: 'settings', name: 'الإعدادات' },
];
