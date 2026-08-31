'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import PrintA4Template from '@/components/PrintA4Template';
import { formatCurrency } from '@/lib/currencyHelper';
import { formatTimeDisplay } from '@/lib/dateUtils';
import { exportJsonToExcel } from '@/lib/exportUtils';
import { isReadOnlyRole } from '@/lib/authHelper';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type TabType = 'ipc' | 'expenses' | 'cashflow' | 'debts' | 'reports' | 'petty_cash';

interface IPC {
  id: string;
  ipc_number: string;
  project_name: string;
  project_id: string;
  ipc_date: string;
  period_from?: string;
  period_to?: string;
  items_total: string;
  vat_percentage?: string;
  vat_amount: string;
  retention_percentage?: string;
  retention_amount: string;
  advance_deduction_percentage?: string;
  advance_deduction_amount?: string;
  wht_percentage?: string;
  wht_amount?: string;
  previous_payments?: string;
  net_payable: string;
  status: string;
  notes?: string;
}

interface Expense {
  id: string;
  expense_date: string;
  project_name: string;
  category: string;
  description: string;
  amount: string;
  supplier: string;
  invoice_number: string;
}

interface CashFlowItem {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

const statusLabels: Record<string, string> = {
  draft: 'مسودة', submitted: 'مُقدَّم للاعتماد', consultant_approved: 'معتمد استشاري',
  client_approved: 'معتمد عميل', paid: 'تم التحصيل', rejected: 'مرفوض'
};
const statusBadge: Record<string, string> = {
  draft: 'badge-muted', submitted: 'badge-warning', consultant_approved: 'badge-purple',
  client_approved: 'badge-info', paid: 'badge-success', rejected: 'badge-danger'
};

const categoryLabels: Record<string, string> = {
  material: 'شراء مواد', labor: 'أجور ويوميات عمالة', subcontractor: 'مستخلصات مقاولين باطن',
  equipment: 'إيجار/شراء معدات', transport: 'نقليات ومحروقات', overhead: 'مصاريف عمومية وإدارية', other: 'أخرى'
};

export default function FinancePage() {
  const [currencySymbol, setCurrencySymbol] = useState('ج.م');
  const [userRole, setUserRole] = useState('admin');
  const [userName, setUserName] = useState('مستخدم النظام');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setCurrencySymbol(localStorage.getItem('system_currency_symbol') || 'ج.م');
      setUserRole(localStorage.getItem('user_role') || 'admin');
      setUserName(localStorage.getItem('user_name') || 'مستخدم النظام');
    }
  }, []);

  const isManagerOrAdmin = userRole === 'admin' || userRole === 'manager';
  const isReadOnly = isReadOnlyRole(userRole);

  const [activeTab, setActiveTab] = useState<TabType>('ipc');
  const lastTabRef = useRef<string | null>(null);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    lastTabRef.current = tab;
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `${window.location.pathname}?tab=${tab}`);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['ipc', 'expenses', 'cashflow', 'debts', 'reports', 'petty_cash'].includes(tab)) {
        lastTabRef.current = tab;
        setActiveTab(tab as TabType);
      }
    }
  }, []);
  const [ipcs, setIpcs] = useState<IPC[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashflow, setCashflow] = useState<CashFlowItem[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [showIpcModal, setShowIpcModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);

  // Edit & Print States
  const [editingIpc, setEditingIpc] = useState<IPC | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [printIpc, setPrintIpc] = useState<IPC | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  // Filters
  const [projectFilter, setProjectFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [debtTypeFilter, setDebtTypeFilter] = useState('');

  // Financial Reports State
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');
  const [reportFromDate, setReportFromDate] = useState('');
  const [reportToDate, setReportToDate] = useState('');
  const [reportProjectFilter, setReportProjectFilter] = useState('all');
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showPrintReportModal, setShowPrintReportModal] = useState(false);

  // New report console states
  const [activeReportType, setActiveReportType] = useState<string | null>(null);
  const [selectedReportProjectId, setSelectedReportProjectId] = useState<string>('');
  const [selectedReportEmployeeId, setSelectedReportEmployeeId] = useState<string>('');
  const [reportStartDate, setReportStartDate] = useState<string>('');
  const [reportEndDate, setReportEndDate] = useState<string>('');
  const [reportMonthFilter, setReportMonthFilter] = useState<number>(new Date().getMonth() + 1);
  const [reportYearFilter, setReportYearFilter] = useState<number>(2026);
  const [printReportData, setPrintReportData] = useState<any>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  const [pettyCustodies, setPettyCustodies] = useState<any[]>([]);
  const [pettyClaims, setPettyClaims] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showCustodyModal, setShowCustodyModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  const [custodyForm, setCustodyForm] = useState({
    engineer_id: '', project_id: '', amount: '', issue_date: new Date().toISOString().split('T')[0], notes: ''
  });

  // Edit Custody states
  const [showEditCustodyModal, setShowEditCustodyModal] = useState(false);
  const [editingCustody, setEditingCustody] = useState<any>(null);
  const [editCustodyForm, setEditCustodyForm] = useState({
    engineer_id: '', project_id: '', amount_given: '', issue_date: '', notes: ''
  });

  // Edit Claim states
  const [showEditClaimModal, setShowEditClaimModal] = useState(false);
  const [editingClaim, setEditingClaim] = useState<any>(null);
  const [editClaimForm, setEditClaimForm] = useState({
    engineer_id: '', project_id: '', category: 'material', description: '', amount: '', claim_date: '', notes: '', receipt_image_url: ''
  });


  const [claimForm, setClaimForm] = useState({
    custody_id: '', engineer_id: '', project_id: '', category: 'material',
    description: '', amount: '', claim_date: new Date().toISOString().split('T')[0],
    receipt_image_url: '', notes: ''
  });

  const [ipcForm, setIpcForm] = useState({
    project_id: '', ipc_number: '', period_from: '', period_to: '',
    items_total: '', vat_percentage: '14', retention_percentage: '10', advance_deduction_percentage: '0', wht_percentage: '1', notes: '', previous_payments: ''
  });

  const [ipcItems, setIpcItems] = useState<any[]>([]);

  // Automatically calculate "الدفعات السابقة" when project changes
  useEffect(() => {
    if (!ipcForm.project_id) return;
    const fetchPreviousPayments = async () => {
      try {
        const res = await fetch(`/api/finance/ipc?project_id=${ipcForm.project_id}&limit=100`);
        const result = await res.json();
        const projectIpcs = result.data || [];
        // Sum items_total for approved/paid IPCs (excluding current editing IPC)
        const approvedIpcs = projectIpcs.filter((i: any) => i.status !== 'draft' && i.status !== 'rejected' && i.id !== editingIpc?.id);
        const sumPrevious = approvedIpcs.reduce((sum: number, item: any) => sum + Number(item.items_total || 0), 0);
        
        setIpcForm(prev => ({
          ...prev,
          previous_payments: String(sumPrevious)
        }));
      } catch (err) {
        console.error('Failed to calculate previous payments:', err);
      }
    };
    fetchPreviousPayments();
  }, [ipcForm.project_id, editingIpc]);

  // Automatically calculate "إجمالي قيمة الأعمال" when item quantities or rates change
  useEffect(() => {
    if (ipcItems.length === 0) return;
    const sum = ipcItems.reduce((acc, curr) => acc + (Number(curr.current_quantity || 0) * Number(curr.unit_rate || 0)), 0);
    setIpcForm(prev => ({
      ...prev,
      items_total: String(sum)
    }));
  }, [ipcItems]);

  const [printIpcItems, setPrintIpcItems] = useState<any[]>([]);

  useEffect(() => {
    if (!printIpc) {
      setPrintIpcItems([]);
      return;
    }
    const fetchPrintIpcItems = async () => {
      try {
        const res = await fetch(`/api/finance/ipc?id=${printIpc.id}`);
        if (res.ok) {
          const result = await res.json();
          setPrintIpcItems(result.items || []);
        }
      } catch (err) {
        console.error('Failed to fetch print IPC items:', err);
      }
    };
    fetchPrintIpcItems();
  }, [printIpc]);

  const [expenseForm, setExpenseForm] = useState({
    project_id: '', category: 'material', description: '', expense_date: '', amount: '', supplier: '', invoice_number: ''
  });

  const [debtForm, setDebtForm] = useState({
    creditor_name: '', debt_type: 'project_finance', project_id: '', amount: '', due_date: '', notes: ''
  });

  const [pettyLoading, setPettyLoading] = useState(false);

  const fetchPettyCashData = useCallback(async () => {
    setPettyLoading(true);
    try {
      const res = await fetch('/api/finance/petty-cash');
      const data = await res.json();
      setPettyCustodies(data?.custodies || []);
      setPettyClaims(data?.claims || []);
    } catch (e) { console.error(e); }
    finally { setPettyLoading(false); }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : (data?.data || []));
    } catch (e) { console.error(e); }
  }, []);

  const handleIssueCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custodyForm.engineer_id || !custodyForm.amount) {
      alert('⚠️ يرجى اختيار المهندس وإدخال قيمة العُهدة النقدية');
      return;
    }
    try {
      const res = await fetch('/api/finance/petty-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'issue_custody', ...custodyForm })
      });
      const data = await res.json();
      if (res.ok) {
        setShowCustodyModal(false);
        setCustodyForm({ engineer_id: '', project_id: '', amount: '', issue_date: new Date().toISOString().split('T')[0], notes: '' });
        alert(`✅ ${data.message}`);
        fetchPettyCashData();
      } else { alert(`❌ فشل التسليم: ${data.error || 'حدث خطأ'}`); }
    } catch (err) { console.error(err); alert('❌ حدث خطأ بالاتصال'); }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimForm.engineer_id || !claimForm.description || !claimForm.amount) {
      alert('⚠️ يرجى إدخال المهندس، الوصف، والمبلغ للفاتورة');
      return;
    }
    try {
      const res = await fetch('/api/finance/petty-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'submit_claim', ...claimForm })
      });
      const data = await res.json();
      if (res.ok) {
        setShowClaimModal(false);
        setClaimForm({
          custody_id: '', engineer_id: '', project_id: '', category: 'material',
          description: '', amount: '', claim_date: new Date().toISOString().split('T')[0],
          receipt_image_url: '', notes: ''
        });
        alert(`✅ ${data.message}`);
        fetchPettyCashData();
      } else { alert(`❌ فشل رفع الفاتورة: ${data.error || 'حدث خطأ'}`); }
    } catch (err) { console.error(err); alert('❌ حدث خطأ بالاتصال'); }
  };

  const handleApproveOrRejectClaim = async (claimId: string, action: 'approve' | 'reject') => {
    if (!isManagerOrAdmin) {
      alert('❌ ليس لديك صلاحية الاعتماد. الاعتماد والموافقة هي صلاحية حصرية لمدير النظام والمدير العام فقط.');
      return;
    }
    try {
      const res = await fetch('/api/finance/petty-cash', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
          'x-user-name': encodeURIComponent(userName)
        },
        body: JSON.stringify({ claim_id: claimId, action })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}`);
        fetchPettyCashData();
        fetchExpenses();
      } else { alert(`❌ فشل العملية: ${data.error || 'حدث خطأ'}`); }
    } catch (err) { console.error(err); }
  };

  const handleOpenEditCustody = (cust: any) => {
    setEditingCustody(cust);
    setEditCustodyForm({
      engineer_id: cust.engineer_id || '',
      project_id: cust.project_id || '',
      amount_given: String(cust.amount_given || ''),
      issue_date: cust.issue_date ? cust.issue_date.split('T')[0] : '',
      notes: cust.notes || ''
    });
    setShowEditCustodyModal(true);
  };

  const handleUpdateCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustody) return;
    try {
      const res = await fetch('/api/finance/petty-cash', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'edit_custody', id: editingCustody.id, ...editCustodyForm })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}`);
        setShowEditCustodyModal(false);
        setEditingCustody(null);
        fetchPettyCashData();
      } else { alert(`❌ فشل التعديل: ${data.error || 'حدث خطأ'}`); }
    } catch (err) { console.error(err); alert('❌ حدث خطأ بالاتصال'); }
  };

  const handleOpenEditClaim = (claim: any) => {
    setEditingClaim(claim);
    setEditClaimForm({
      engineer_id: claim.engineer_id || '',
      project_id: claim.project_id || '',
      category: claim.category || 'material',
      description: claim.description || '',
      amount: String(claim.amount || ''),
      claim_date: claim.claim_date ? claim.claim_date.split('T')[0] : '',
      notes: claim.notes || '',
      receipt_image_url: claim.receipt_image_url || ''
    });
    setShowEditClaimModal(true);
  };

  const handleUpdateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClaim) return;
    try {
      const res = await fetch('/api/finance/petty-cash', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'edit_claim', id: editingClaim.id, ...editClaimForm })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}`);
        setShowEditClaimModal(false);
        setEditingClaim(null);
        fetchPettyCashData();
      } else { alert(`❌ فشل التعديل: ${data.error || 'حدث خطأ'}`); }
    } catch (err) { console.error(err); alert('❌ حدث خطأ بالاتصال'); }
  };


  const fetchIPCs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (projectFilter) params.set('project_id', projectFilter);
    if (statusFilter) params.set('status', statusFilter);
    try {
      const res = await fetch(`/api/finance/ipc?${params}`);
      const data = await res.json();
      setIpcs(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, [projectFilter, statusFilter]);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (projectFilter) params.set('project_id', projectFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    try {
      const res = await fetch(`/api/finance/expenses?${params}`);
      const data = await res.json();
      setExpenses(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, [projectFilter, categoryFilter]);

  const fetchCashflow = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/cashflow');
      const data = await res.json();
      const rawList = data && Array.isArray(data.data) ? data.data : [];
      const mapped = rawList.map((row: any) => ({
        month: row.month,
        income: parseFloat(row.total_inflow) || 0,
        expenses: parseFloat(row.total_outflow) || 0,
        net: parseFloat(row.net_cashflow) || 0
      }));
      setCashflow(mapped);
    } finally { setLoading(false); }
  }, []);

  const fetchDebts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debtTypeFilter) params.set('debt_type', debtTypeFilter);
    try {
      const res = await fetch(`/api/finance/debts?${params}`);
      const data = await res.json();
      setDebts(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, [debtTypeFilter]);

  const fetchProjectsList = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  };

  const fetchCompanyInfo = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setCompanyInfo(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFinancialReport = useCallback(async () => {
    setLoadingReport(true);
    try {
      const params = new URLSearchParams();
      if (reportProjectFilter !== 'all') params.set('project_id', reportProjectFilter);

      const now = new Date();
      let from = reportFromDate;
      let to = reportToDate;

      if (reportPeriod === 'daily') {
        const todayStr = reportFromDate || now.toISOString().split('T')[0];
        from = todayStr;
        to = todayStr;
      } else if (reportPeriod === 'weekly') {
        const curr = reportFromDate ? new Date(reportFromDate) : new Date();
        const first = curr.getDate() - curr.getDay();
        const last = first + 6;
        from = new Date(curr.setDate(first)).toISOString().split('T')[0];
        to = new Date(curr.setDate(last)).toISOString().split('T')[0];
      } else if (reportPeriod === 'monthly') {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        from = `${year}-${month}-01`;
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        to = `${year}-${month}-${lastDay}`;
      }

      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const res = await fetch(`/api/finance/reports?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (err) {
      console.error('Failed to fetch financial report', err);
    } finally {
      setLoadingReport(false);
    }
  }, [reportPeriod, reportFromDate, reportToDate, reportProjectFilter]);

  useEffect(() => {
    fetchProjectsList();
    fetchCompanyInfo();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as TabType;
      const validTabs: TabType[] = ['ipc', 'expenses', 'cashflow', 'debts', 'reports', 'petty_cash'];
      if (tab && validTabs.includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'ipc') fetchIPCs();
    if (activeTab === 'expenses') fetchExpenses();
    if (activeTab === 'cashflow') fetchCashflow();
    if (activeTab === 'debts') fetchDebts();
    if (activeTab === 'reports') {
      Promise.all([fetchFinancialReport(), fetchEmployees()]);
    }
    if (activeTab === 'petty_cash') {
      Promise.all([fetchPettyCashData(), fetchEmployees()]);
    }
  }, [activeTab, fetchIPCs, fetchExpenses, fetchCashflow, fetchDebts, fetchFinancialReport, fetchPettyCashData, fetchEmployees]);

  const handleCreateIpc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingIpc;
      const url = '/api/finance/ipc';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingIpc?.id,
          ipc_number: ipcForm.ipc_number,
          project_id: ipcForm.project_id,
          ipc_date: editingIpc ? editingIpc.ipc_date : new Date().toISOString().split('T')[0],
          period_from: ipcForm.period_from || null,
          period_to: ipcForm.period_to || null,
          items_total: Number(ipcForm.items_total) || 0,
          vat_percentage: Number(ipcForm.vat_percentage) || 0,
          retention_percentage: Number(ipcForm.retention_percentage) || 0,
          advance_deduction_percentage: Number(ipcForm.advance_deduction_percentage) || 0,
          wht_percentage: Number(ipcForm.wht_percentage) || 0,
          previous_payments: Number(ipcForm.previous_payments) || 0,
          notes: ipcForm.notes || '',
          status: editingIpc ? editingIpc.status : 'draft',
          items: ipcItems
        })
      });
      if (res.ok) {
        setShowIpcModal(false);
        setEditingIpc(null);
        setIpcItems([]);
        setIpcForm({
          project_id: '', ipc_number: '', period_from: '', period_to: '',
          items_total: '', vat_percentage: '14', retention_percentage: '10', advance_deduction_percentage: '0', wht_percentage: '1', notes: '', previous_payments: ''
        });
        fetchIPCs();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء حفظ المستخلص: ${errData.error || 'فشلت عملية الحفظ'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleOpenEditIpc = async (ipc: IPC) => {
    setEditingIpc(ipc);
    setIpcForm({
      project_id: ipc.project_id || '',
      ipc_number: ipc.ipc_number,
      period_from: ipc.period_from ? new Date(ipc.period_from).toISOString().split('T')[0] : '',
      period_to: ipc.period_to ? new Date(ipc.period_to).toISOString().split('T')[0] : '',
      items_total: ipc.items_total,
      vat_percentage: ipc.vat_percentage || '14',
      retention_percentage: ipc.retention_percentage || '10',
      advance_deduction_percentage: ipc.advance_deduction_percentage || '0',
      wht_percentage: ipc.wht_percentage || '1',
      notes: ipc.notes || '',
      previous_payments: ipc.previous_payments || ''
    });
    
    // Fetch items
    try {
      const res = await fetch(`/api/finance/ipc?id=${ipc.id}`);
      if (res.ok) {
        const result = await res.json();
        setIpcItems(result.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch IPC items:', err);
    }
    
    setShowIpcModal(true);
  };

  const handleLoadProjectBoq = async () => {
    if (!ipcForm.project_id) {
      alert('⚠️ يرجى اختيار المشروع أولاً.');
      return;
    }
    try {
      const resEst = await fetch('/api/estimation');
      const ests = await resEst.json();
      const prjEst = ests.find((e: any) => e.project_id === ipcForm.project_id);
      if (!prjEst) {
        alert('⚠️ لم يتم العثور على مقايسة (BOQ) معتمدة لهذا المشروع. يمكنك إضافة بنود يدوية.');
        return;
      }
      
      const resDetail = await fetch(`/api/estimation/${prjEst.id}`);
      const detail = await resDetail.json();
      if (detail.items && Array.isArray(detail.items)) {
        // Load these items into the ipcItems state
        const loadedItems = detail.items.map((boq: any) => ({
          boq_item_id: boq.id,
          description: boq.description,
          unit: boq.unit || 'قطعة',
          contract_quantity: boq.quantity || 0,
          previous_quantity: 0,
          current_quantity: 0,
          unit_rate: Number(boq.material_unit_cost || 0) + Number(boq.labor_unit_cost || 0)
        }));
        setIpcItems(loadedItems);
        alert(`✅ تم سحب ${loadedItems.length} بند من مقايسة المشروع بنجاح!`);
      } else {
        alert('⚠️ لا توجد بنود في المقايسة المحددة.');
      }
    } catch (err: any) {
      alert(`❌ فشل سحب البنود: ${err.message}`);
    }
  };

  const handleDeleteIPC = async (ipcId: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا المستخلص نهائياً؟')) return;
    try {
      const res = await fetch(`/api/finance/ipc?id=${ipcId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('✅ تم حذف المستخلص بنجاح!');
        fetchIPCs();
      } else {
        const err = await res.json();
        alert(`❌ فشل حذف المستخلص: ${err.error || 'خطأ غير معروف'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleGenerateReport = async (type: string) => {
    setActiveReportType(type);
    setLoading(true);
    try {
      let data: any = {};
      
      if (type === 'project_detail' || type === 'project_expenses') {
        const projectId = selectedReportProjectId;
        if (!projectId) { alert('⚠️ يرجى اختيار المشروع أولاً.'); setLoading(false); return; }
        
        // Fetch projects list to find the current project metadata
        const projRes = await fetch(`/api/projects`);
        const projs = await projRes.json();
        const project = (Array.isArray(projs) ? projs : projs.data || []).find((p: any) => p.id === projectId);
        
        // Fetch expenses of the project
        const expRes = await fetch(`/api/finance/expenses?project_id=${projectId}`);
        const expData = await expRes.json();
        
        // Fetch IPCs of the project
        const ipcRes = await fetch(`/api/finance/ipc?project_id=${projectId}`);
        const ipcData = await ipcRes.json();

        data = {
          project,
          expenses: expData.data || [],
          ipcs: ipcData.data || []
        };
      } 
      else if (type === 'projects_summary') {
        const projRes = await fetch(`/api/projects`);
        const projs = await projRes.json();
        data = {
          projects: Array.isArray(projs) ? projs : projs.data || []
        };
      }
      else if (type === 'all_workers' || type === 'supervisors') {
        const empRes = await fetch(`/api/employees`);
        const emps = await empRes.json();
        const empList = Array.isArray(emps) ? emps : emps.data || [];
        data = {
          employees: type === 'all_workers' 
            ? empList.filter((e: any) => e.employment_type === 'daily' || e.job_title?.includes('عامل') || e.job_title?.includes('فني') || e.job_title?.includes('سائق'))
            : empList.filter((e: any) => e.employment_type !== 'daily' && !e.job_title?.includes('عامل') && !e.job_title?.includes('فني') && !e.job_title?.includes('سائق'))
        };
      }
      else if (type === 'worker_ledger' || type === 'worker_attendance') {
        const empId = selectedReportEmployeeId;
        if (!empId) { alert('⚠️ يرجى اختيار العامل أولاً.'); setLoading(false); return; }
        
        const empRes = await fetch(`/api/employees`);
        const emps = await empRes.json();
        const employee = (Array.isArray(emps) ? emps : emps.data || []).find((e: any) => e.id === empId);

        const params = new URLSearchParams();
        params.set('employee_id', empId);
        if (reportStartDate) params.set('date_from', reportStartDate);
        if (reportEndDate) params.set('date_to', reportEndDate);

        const attRes = await fetch(`/api/hr/attendance?${params}`);
        const attData = await attRes.json();

        const loanRes = await fetch(`/api/hr/loans`);
        const loanData = await loanRes.json();
        const employeeLoans = (loanData.data || loanData || []).filter((l: any) => l.employee_id === empId);

        data = {
          employee,
          attendance: attData.data || [],
          loans: employeeLoans
        };
      }
      else if (type === 'payroll_report') {
        const payRes = await fetch('/api/hr/payroll');
        const payData = await payRes.json();
        const payrollList = Array.isArray(payData) ? payData : payData.data || [];
        data = {
          payroll: payrollList.filter((p: any) => Number(p.month) === Number(reportMonthFilter) && Number(p.year) === Number(reportYearFilter))
        };
      }
      else if (type === 'all_equipments' || type === 'equipment_expenses') {
        const assetRes = await fetch('/api/hr/assets');
        const assets = await assetRes.json();
        const assetList = Array.isArray(assets) ? assets : assets.data || [];
        
        const expRes = await fetch('/api/finance/expenses');
        const expData = await expRes.json();
        const equipmentExpenses = (expData.data || []).filter((e: any) => e.category === 'equipment');

        data = {
          assets: assetList.filter((a: any) => a.asset_type === 'vehicle' || a.asset_type === 'tool' || a.job_title?.includes('معدة')),
          expenses: equipmentExpenses
        };
      }
      else if (type === 'daily_log' || type === 'monthly_log' || type === 'range_log') {
        const expRes = await fetch('/api/finance/expenses');
        const expData = await expRes.json();
        
        const ipcRes = await fetch('/api/finance/ipc');
        const ipcData = await ipcRes.json();

        data = {
          expenses: expData.data || [],
          ipcs: ipcData.data || []
        };
      }
      else if (type === 'revenues' || type === 'profits' || type === 'cashbox') {
        const res = await fetch('/api/finance/reports');
        const rData = await res.json();
        data = {
          report: rData
        };
      }
      else if (type === 'debts_report') {
        const params = new URLSearchParams();
        if (selectedReportProjectId) params.set('project_id', selectedReportProjectId);
        if (debtTypeFilter) params.set('debt_type', debtTypeFilter);
        const debtRes = await fetch(`/api/finance/debts?${params}`);
        const debtData = await debtRes.json();
        data = {
          debts: Array.isArray(debtData) ? debtData : debtData.data || []
        };
      }

      setPrintReportData(data);
      setShowPrintModal(true);
    } catch (err) {
      console.error(err);
      alert('❌ فشل توليد التقرير.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintDebtsFromTab = () => {
    const filtered = debts.filter(d => {
      if (projectFilter && d.project_id !== projectFilter) return false;
      if (debtTypeFilter && d.debt_type !== debtTypeFilter) return false;
      return true;
    });
    setPrintReportData({ debts: filtered });
    setActiveReportType('debts_report');
    setShowPrintModal(true);
  };

  const handleExportDebtsExcel = (debtList: any[]) => {
    if (!debtList || debtList.length === 0) {
      alert('⚠️ لا توجد مديونيات للتصدير.');
      return;
    }
    const debtTypeMap: Record<string, string> = {
      project_finance: 'قرض تمويل مشروع',
      subcontractor_ipc: 'مستخلص مقاول باطن',
      supplier_invoice: 'فاتورة توريد',
      other: 'التزام آخر'
    };
    const statusMap: Record<string, string> = {
      paid: 'مسدد بالكامل',
      partially_paid: 'مسدد جزئياً',
      unpaid: 'غير مسدد'
    };
    const excelData = debtList.map((d, i) => ({
      'م': i + 1,
      'الجهة الدائنة / المقرض': d.creditor_name,
      'نوع الالتزام': debtTypeMap[d.debt_type] || d.debt_type,
      'المشروع الممول / المرتبط': d.project_name || 'غير محدد',
      'القيمة الإجمالية': Number(d.amount || 0),
      'المسدد': Number(d.paid_amount || 0),
      'المتبقي': Number(d.amount || 0) - Number(d.paid_amount || 0),
      'تاريخ الاستحقاق': d.due_date ? new Date(d.due_date).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : '-',
      'الحالة': statusMap[d.status] || d.status,
      'ملاحظات': d.notes || '-'
    }));
    exportJsonToExcel({
      filename: `تقرير_مديونيات_وقروض_تمويل_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'المديونيات والتمويل',
      data: excelData
    });
  };

  const handleExportIpcsExcel = () => {
    if (ipcs.length === 0) {
      alert('لا توجد مستخلصات لتصديرها.');
      return;
    }
    const exportData = ipcs.map(i => ({
      ipc_number: i.ipc_number,
      project_name: i.project_name || '-',
      period: `${i.period_from ? new Date(i.period_from).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : ''} إلى ${i.period_to ? new Date(i.period_to).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : ''}`,
      items_total: Number(i.items_total || 0),
      vat_amount: Number(i.vat_amount || 0),
      retention_amount: Number(i.retention_amount || 0),
      net_payable: Number(i.net_payable || 0),
      status: statusLabels[i.status] || i.status
    }));

    exportJsonToExcel({
      filename: `مستخلصات_العملاء_${new Date().toISOString().slice(0,10)}`,
      sheetName: 'مستخلصات المالك',
      data: exportData,
      headers: {
        ipc_number: 'رقم المستخلص',
        project_name: 'اسم المشروع',
        period: 'فترة المستخلص',
        items_total: 'قيمة الأعمال المنجزة',
        vat_amount: 'ضريبة القيمة المضافة',
        retention_amount: 'استقطاع الضمان المالي',
        net_payable: 'الصافي المستحق الصرف',
        status: 'حالة المستخلص'
      }
    });
  };

  const handleExportSingleIpcExcel = (ipc: IPC) => {
    if (printIpcItems.length > 0) {
      const exportData = printIpcItems.map(item => ({
        description: item.description,
        unit: item.unit || 'قطعة',
        contract_quantity: Number(item.contract_quantity) || 0,
        previous_quantity: Number(item.previous_quantity) || 0,
        current_quantity: Number(item.current_quantity) || 0,
        total_quantity: (Number(item.previous_quantity) || 0) + (Number(item.current_quantity) || 0),
        unit_rate: Number(item.unit_rate) || 0,
        current_amount: Number(item.current_quantity || 0) * Number(item.unit_rate || 0)
      }));

      exportJsonToExcel({
        filename: `تفاصيل_بنود_مستخلص_${ipc.ipc_number}_${new Date().toISOString().slice(0,10)}`,
        sheetName: 'تفاصيل بنود المستخلص',
        data: exportData,
        headers: {
          description: 'البند / الوصف',
          unit: 'الوحدة',
          contract_quantity: 'كمية المقايسة',
          previous_quantity: 'الكمية السابقة',
          current_quantity: 'الكمية الحالية',
          total_quantity: 'إجمالي الكمية المنفذة',
          unit_rate: 'سعر الفئة',
          current_amount: 'القيمة الحالية للأعمال'
        }
      });
      return;
    }

    const singleData = [{
      ipc_number: ipc.ipc_number,
      project_name: ipc.project_name || '-',
      period_from: ipc.period_from ? new Date(ipc.period_from).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : '-',
      period_to: ipc.period_to ? new Date(ipc.period_to).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : '-',
      items_total: Number(ipc.items_total || 0),
      vat_amount: Number(ipc.vat_amount || 0),
      retention_amount: Number(ipc.retention_amount || 0),
      previous_payments: Number(ipc.previous_payments || 0),
      net_payable: Number(ipc.net_payable || 0),
      status: statusLabels[ipc.status] || ipc.status,
      notes: ipc.notes || '-'
    }];

    exportJsonToExcel({
      filename: `مستخلص_مالك_${ipc.ipc_number}_${new Date().toISOString().slice(0,10)}`,
      sheetName: 'مستخلص عميل',
      data: singleData,
      headers: {
        ipc_number: 'رقم المستخلص',
        project_name: 'اسم المشروع',
        period_from: 'من تاريخ',
        period_to: 'إلى تاريخ',
        items_total: 'إجمالي قيمة الأعمال المنجزة',
        vat_amount: 'ضريبة القيمة المضافة',
        retention_amount: 'استقطاع الضمان المحتجز',
        previous_payments: 'خصم دفعات سابقة',
        net_payable: 'الصافي النهائي المستحق للمؤسسة',
        status: 'الحالة الحالية',
        notes: 'ملاحظات'
      }
    });
  };

  const handleOpenEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setExpenseForm({
      project_id: expense.project_id || '',
      category: expense.category || 'material',
      description: expense.description || '',
      expense_date: expense.expense_date ? new Date(expense.expense_date).toISOString().split('T')[0] : '',
      amount: expense.amount || '',
      supplier: expense.supplier || '',
      invoice_number: expense.invoice_number || ''
    });
    setShowExpenseModal(true);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingExpense;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch('/api/finance/expenses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingExpense?.id,
          project_id: expenseForm.project_id || null,
          category: expenseForm.category,
          description: expenseForm.description || '',
          expense_date: expenseForm.expense_date || new Date().toISOString().split('T')[0],
          amount: Number(expenseForm.amount) || 0,
          supplier: expenseForm.supplier || null,
          invoice_number: expenseForm.invoice_number || null
        })
      });
      if (res.ok) {
        setShowExpenseModal(false);
        setEditingExpense(null);
        setExpenseForm({ project_id: '', category: 'material', description: '', expense_date: '', amount: '', supplier: '', invoice_number: '' });
        fetchExpenses();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء حفظ المصروف: ${errData.error || 'فشلت عملية الحفظ'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا المصروف؟')) return;
    try {
      const res = await fetch(`/api/finance/expenses?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('✅ تم حذف المصروف بنجاح!');
        fetchExpenses();
      } else {
        const err = await res.json();
        alert(`❌ فشل الحذف: ${err.error || 'حدث خطأ'}`);
      }
    } catch (e) {
      console.error(e);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/finance/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditor_name: debtForm.creditor_name,
          debt_type: debtForm.debt_type,
          project_id: debtForm.project_id || null,
          amount: Number(debtForm.amount) || 0,
          due_date: debtForm.due_date || null,
          notes: debtForm.notes || ''
        })
      });
      if (res.ok) {
        setShowDebtModal(false);
        setDebtForm({ creditor_name: '', debt_type: 'project_finance', project_id: '', amount: '', due_date: '', notes: '' });
        fetchDebts();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء إضافة المديونية: ${errData.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleDeleteDebt = async (id: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذه المديونية؟')) return;
    try {
      const res = await fetch(`/api/finance/debts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('✅ تم حذف المديونية بنجاح!');
        fetchDebts();
      } else {
        const err = await res.json();
        alert(`❌ فشل الحذف: ${err.error || 'حدث خطأ'}`);
      }
    } catch (e) {
      console.error(e);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handlePayDebt = async (id: string, currentPaid: number, totalAmount: number) => {
    const payStr = prompt('أدخل قيمة المبلغ المراد سداده:', '0');
    if (payStr === null) return;
    const amountToPay = Number(payStr);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      alert('الرجاء إدخال مبلغ صحيح.');
      return;
    }
    const newPaid = currentPaid + amountToPay;
    try {
      const res = await fetch('/api/finance/debts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, paid_amount: newPaid })
      });
      if (res.ok) {
        fetchDebts();
        alert('✅ تم تسجيل سداد المديونية بنجاح!');
      } else {
        alert('❌ فشل تسجيل السداد.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // KPIs
  const totalInvoiced = ipcs.reduce((acc, i) => acc + Number(i.net_payable || 0), 0);
  const totalCollected = ipcs.filter(i => i.status === 'paid').reduce((acc, i) => acc + Number(i.net_payable || 0), 0);
  const totalUncollected = totalInvoiced - totalCollected;

  const totalExpensesSum = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);

  // Chart
  const chartData = {
    labels: cashflow.map(c => c.month),
    datasets: [
      {
        label: `الإيرادات المحصلة (${currencySymbol})`,
        data: cashflow.map(c => c.income),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        fill: true,
        tension: 0.3,
      },
      {
        label: `إجمالي المصروفات (${currencySymbol})`,
        data: cashflow.map(c => c.expenses),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        fill: true,
        tension: 0.3,
      }
    ]
  };

  return (
    <AppLayout title="المالية والمستخلصات" subtitle="إدارة مستخلصات العميل، مصروفات المشاريع، والتدفقات النقدية والربحية" icon="💰">
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'ipc' ? 'active' : ''}`} onClick={() => handleTabChange('ipc')}>📄 مستخلصات العميل</button>
        <button className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => handleTabChange('expenses')}>🧾 مصروفات المشاريع</button>
        <button className={`tab-btn ${activeTab === 'cashflow' ? 'active' : ''}`} onClick={() => handleTabChange('cashflow')}>📈 التدفق النقدي والربحية</button>
        <button className={`tab-btn ${activeTab === 'debts' ? 'active' : ''}`} onClick={() => handleTabChange('debts')}>🏛️ المديونيات وتمويل المشاريع</button>
        <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => handleTabChange('reports')}>📊 التقارير المالية والطباعة</button>
        <button className={`tab-btn ${activeTab === 'petty_cash' ? 'active' : ''}`} onClick={() => handleTabChange('petty_cash')}>💵 العُهَد النقدية للمهندسين (Petty Cash)</button>
      </div>


      {/* ======================== TAB: CLIENT IPCs ======================== */}
      {activeTab === 'ipc' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">📄 مستخلصات العميل المعتمدة</div>
              <div className="page-description">إصدار ومتابعة مستحقات الشركة لدى ملاك المشاريع بناءً على الكميات المعتمدة</div>
            </div>
            <div className="page-header-actions" style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={handleExportIpcsExcel}>📊 تصدير إلى Excel (.xlsx)</button>
              {!isReadOnly && <button className="btn btn-primary" onClick={() => setShowIpcModal(true)}>+ إصدار مستخلص جديد</button>}
            </div>
          </div>

          <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card accent">
              <div className="stat-card-icon">📄</div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }} suppressHydrationWarning>{formatCurrency(totalInvoiced)}</div>
              <div className="stat-label">إجمالي المرفوع للعملاء</div>
            </div>
            <div className="stat-card success">
              <div className="stat-card-icon">💸</div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }} suppressHydrationWarning>{formatCurrency(totalCollected)}</div>
              <div className="stat-label">المبالغ المحصلة فعلياً</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-card-icon">⏳</div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }} suppressHydrationWarning>{formatCurrency(totalUncollected)}</div>
              <div className="stat-label">مستحقات معلقة تحت التحصيل</div>
            </div>
          </div>


          <div className="filter-bar">
            <select className="form-control" style={{ width: 'auto' }} value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
              <option value="">كل المشاريع</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="form-control" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">كل الحالات</option>
              {Object.entries(statusLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="card">
            {loading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : ipcs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📄</div>
                <div className="empty-state-title">لا توجد مستخلصات مُصدرة بعد</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم المستخلص</th>
                      <th>المشروع</th>
                      <th>تاريخ الرفع</th>
                      <th>إجمالي الأعمال</th>
                      <th>ضريبة القيمة المضافة</th>
                      <th>استقطاع الضمان</th>
                      <th>الصافي المطلوب</th>
                      <th>الحالة</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipcs.map(ipc => (
                      <tr key={ipc.id}>
                        <td style={{ fontWeight: 700 }}>{ipc.ipc_number}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ipc.project_name}</td>
                        <td>{new Date(ipc.ipc_date).toLocaleDateString('ar-EG', { calendar: 'gregory' })}</td>
                        <td>{formatCurrency(ipc.items_total)}</td>
                        <td>{formatCurrency(ipc.vat_amount)}</td>
                        <td style={{ color: 'var(--status-warning)' }}>{formatCurrency(ipc.retention_amount)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--status-success)' }}>{formatCurrency(ipc.net_payable)}</td>
                        <td><span className={`badge ${statusBadge[ipc.status] || 'badge-muted'}`}>{statusLabels[ipc.status] || ipc.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {!isReadOnly && <button
                              className="btn btn-ghost text-primary btn-sm"
                              onClick={() => handleOpenEditIpc(ipc)}
                              title="تعديل"
                            >
                              ✏️
                            </button>}
                            <button
                              className="btn btn-ghost text-success btn-sm"
                              onClick={() => setPrintIpc(ipc)}
                              title="طباعة"
                            >
                              🖨️
                            </button>
                            {!isReadOnly && <button
                              className="btn btn-ghost text-danger btn-sm"
                              onClick={() => handleDeleteIPC(ipc.id)}
                              title="حذف"
                            >
                              🗑️
                            </button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================== TAB: EXPENSES ======================== */}
      {activeTab === 'expenses' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">🧾 مصروفات وتكاليف المشاريع</div>
              <div className="page-description">تسجيل ومراقبة تكاليف المواد، أجور المصنعيات، المشتريات والمصروفات العامة لكل موقع</div>
            </div>
            <div className="page-header-actions">
              {!isReadOnly && <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)}>+ تسجيل مصروف جديد</button>}
            </div>
          </div>

          <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card danger">
              <div className="stat-card-icon">💸</div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }} suppressHydrationWarning>{formatCurrency(totalExpensesSum)}</div>

              <div className="stat-label">إجمالي المصروفات المدرجة</div>
            </div>
          </div>

          <div className="filter-bar">
            <select className="form-control" style={{ width: 'auto' }} value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
              <option value="">كل المشاريع</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="form-control" style={{ width: 'auto' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="">كل الفئات</option>
              {Object.entries(categoryLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="card">
            {loading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : expenses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🧾</div>
                <div className="empty-state-title">لا توجد مصروفات مسجلة بعد</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>المشروع</th>
                      <th>فئة المصروف</th>
                      <th>الوصف</th>
                      <th>المورد/الجهة</th>
                      <th>رقم الفاتورة</th>
                      <th>المبلغ</th>
                      <th style={{ textAlign: 'center' }}>العمليات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id}>
                        <td>{new Date(e.expense_date).toLocaleDateString('ar-EG')}</td>
                        <td style={{ fontWeight: 600 }}>{e.project_name}</td>
                        <td><span className="badge badge-purple">{categoryLabels[e.category] || e.category}</span></td>
                        <td style={{ color: 'var(--text-primary)' }}>{e.description}</td>
                        <td>{e.supplier || '-'}</td>
                        <td>{e.invoice_number || '-'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--status-danger)' }}>{formatCurrency(e.amount)}</td>
                        <td style={{ textAlign: 'center' }}>
                          {!isReadOnly ? (
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleOpenEditExpense(e)}
                                title="تعديل المصروف"
                              >
                                ✏️ تعديل
                              </button>
                              <button
                                className="btn btn-outline btn-sm text-danger"
                                onClick={() => handleDeleteExpense(e.id)}
                                title="حذف المصروف"
                              >
                                🗑️ حذف
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>عرض فقط</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================== TAB: CASH FLOW ======================== */}
      {activeTab === 'cashflow' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">📈 التدفق النقدي وصافي الربحية</div>
              <div className="page-description">مقارنة الإيرادات الفعلية المحصلة بالمصروفات التشغيلية للمؤسسة شهرياً</div>
            </div>
          </div>

          <div className="card mb-4" style={{ height: '300px' }}>
            <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">📊 تفصيل الحركة النقدية الشهرية</div></div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الشهر</th>
                    <th style={{ color: 'var(--status-success)' }}>الإيرادات المحصلة</th>
                    <th style={{ color: 'var(--status-danger)' }}>المصروفات</th>
                    <th>صافي التدفق المالي</th>
                  </tr>
                </thead>
                <tbody>
                  {cashflow.map((c, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700 }}>{c.month}</td>
                      <td style={{ color: 'var(--status-success)' }}>{formatCurrency(c.income)}</td>
                      <td style={{ color: 'var(--status-danger)' }}>{formatCurrency(c.expenses)}</td>
                      <td style={{ fontWeight: 700, color: c.net >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                        {formatCurrency(c.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ======================== TAB: DEBTS ======================== */}
      {activeTab === 'debts' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">🏛️ مديونيات المؤسسة وقروض تمويل المشاريع</div>
              <div className="page-description">تسجيل ومتابعة التزامات الشركة المالية ومبالغ التمويل الخارجي المؤقتة للمشاريع</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={handlePrintDebtsFromTab} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🖨️ طباعة تقرير المديونيات والتمويل
              </button>
              {!isReadOnly && <button className="btn btn-primary" onClick={() => setShowDebtModal(true)}>➕ تسجيل التزام / قرض جديد</button>}
            </div>
          </div>

          <div className="stat-grid mb-4">
            <div className="stat-card">
              <div className="stat-label">إجمالي الالتزامات والتمويل</div>
              <div className="stat-value text-primary">
                {formatCurrency(debts.reduce((acc, d) => acc + Number(d.amount || 0), 0))}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">إجمالي المبالغ المسددة</div>
              <div className="stat-value text-success">
                {formatCurrency(debts.reduce((acc, d) => acc + Number(d.paid_amount || 0), 0))}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">المتبقي المطلوب سداده</div>
              <div className="stat-value text-danger">
                {formatCurrency(
                  debts.reduce((acc, d) => acc + (Number(d.amount || 0) - Number(d.paid_amount || 0)), 0)
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="form-group mb-0">
                <select className="form-control" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
                  <option value="">كل المشاريع...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group mb-0">
                <select className="form-control" value={debtTypeFilter} onChange={e => setDebtTypeFilter(e.target.value)}>
                  <option value="">كل الأنواع...</option>
                  <option value="project_finance">قروض تمويل المشاريع</option>
                  <option value="subcontractor_ipc">مستخلصات مقاولي الباطن</option>
                  <option value="supplier_invoice">فواتير التوريد</option>
                  <option value="other">التزامات أخرى</option>
                </select>
              </div>
            </div>

            {debts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏛️</div>
                <div className="empty-state-title">لا توجد مديونيات مسجلة تطابق التصفية</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الجهة الدائنة / المقرض</th>
                      <th>نوع الالتزام</th>
                      <th>المشروع الممول/المرتبط</th>
                      <th>القيمة الإجمالية</th>
                      <th>تاريخ الاستحقاق</th>
                      <th>المسدد</th>
                      <th>المتبقي</th>
                      <th>الحالة</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debts.map((d) => {
                      const remaining = Number(d.amount) - Number(d.paid_amount);
                      return (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.creditor_name}</td>
                          <td>
                            <span className="badge badge-purple">
                              {d.debt_type === 'project_finance' ? '💵 تمويل مشروع' : d.debt_type === 'subcontractor_ipc' ? '🔗 مستخلص باطن' : d.debt_type === 'supplier_invoice' ? '🧾 فاتورة توريد' : 'أخرى'}
                            </span>
                          </td>
                          <td>{d.project_name || '-'}</td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(d.amount)}</td>
                          <td>{d.due_date ? new Date(d.due_date).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : '-'}</td>
                          <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{formatCurrency(d.paid_amount)}</td>
                          <td style={{ color: 'var(--status-danger)', fontWeight: 600 }}>{formatCurrency(remaining)}</td>
                          <td>
                            <span className={`badge ${d.status === 'paid' ? 'badge-success' : d.status === 'partially_paid' ? 'badge-warning' : 'badge-danger'}`}>
                              {d.status === 'paid' ? 'مسدد بالكامل' : d.status === 'partially_paid' ? 'مسدد جزئياً' : 'غير مسدد'}
                            </span>
                          </td>
                          <td>
                            {!isReadOnly && d.status !== 'paid' && (
                              <button
                                className="btn btn-ghost text-primary btn-sm"
                                onClick={() => handlePayDebt(d.id, Number(d.paid_amount), Number(d.amount))}
                              >
                                💸 تسجيل دفعة سداد
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================== TAB: FINANCIAL REPORTS ======================== */}
      {activeTab === 'reports' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">📊 التقارير المالية والتحليلات الشاملة</div>
              <div className="page-description">توليد تقارير الإيرادات والمصروفات والتدفق النقدي (يومياً، أسبوعياً، شهرياً، أو مدة محددة) مع إمكانية الطباعة والـ PDF</div>
            </div>
            <div className="page-header-actions">
              <button
                className="btn btn-primary"
                onClick={() => setShowPrintReportModal(true)}
                disabled={!reportData}
              >
                🖨️ طباعة التقرير المالي
              </button>

            </div>
          </div>

          {/* Report Filter Toolbar */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>فترة التقرير</label>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${reportPeriod === 'daily' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setReportPeriod('daily')}
                  >
                    📅 يومي
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${reportPeriod === 'weekly' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setReportPeriod('weekly')}
                  >
                    📆 أسبوعي
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${reportPeriod === 'monthly' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setReportPeriod('monthly')}
                  >
                    🗓️ شهري
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${reportPeriod === 'custom' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setReportPeriod('custom')}
                  >
                    ⏳ مدة محددة
                  </button>
                </div>
              </div>

              {reportPeriod === 'custom' ? (
                <>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ marginBottom: '0.25rem' }}>من تاريخ</label>
                    <input
                      type="date"
                      className="form-control"
                      value={reportFromDate}
                      onChange={e => setReportFromDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ marginBottom: '0.25rem' }}>إلى تاريخ</label>
                    <input
                      type="date"
                      className="form-control"
                      value={reportToDate}
                      onChange={e => setReportToDate(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ marginBottom: '0.25rem' }}>تحديد التاريخ / اليوم</label>
                  <input
                    type="date"
                    className="form-control"
                    value={reportFromDate}
                    onChange={e => setReportFromDate(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>تصفية بمشروع معين</label>
                <select
                  className="form-control"
                  value={reportProjectFilter}
                  onChange={e => setReportProjectFilter(e.target.value)}
                >
                  <option value="all">كل المشاريع</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={fetchFinancialReport}
                  disabled={loadingReport}
                  style={{ padding: '0.6rem 1.25rem' }}
                >
                  {loadingReport ? 'جاري التوليد...' : '🔄 عرض التقرير'}
                </button>
              </div>
            </div>
          </div>

          {/* Financial KPI Summary Cards */}
          {reportData && (
            <>
              <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card success">
                  <div className="stat-card-icon">💰</div>
                  <div className="stat-value" style={{ fontSize: '1.4rem' }}>
                    {formatCurrency(reportData.summary?.total_revenues ?? reportData.summary?.totalRevenues ?? 0)}
                  </div>
                  <div className="stat-label">إجمالي الإيرادات والتحصيلات ({currencySymbol})</div>
                </div>

                <div className="stat-card danger">
                  <div className="stat-card-icon">💸</div>
                  <div className="stat-value" style={{ fontSize: '1.4rem' }}>
                    {formatCurrency(reportData.summary?.total_expenses ?? reportData.summary?.totalExpenses ?? 0)}
                  </div>
                  <div className="stat-label">إجمالي المصروفات والنفقات ({currencySymbol})</div>
                </div>

                <div className="stat-card warning">
                  <div className="stat-card-icon">🤝</div>
                  <div className="stat-value" style={{ fontSize: '1.4rem' }}>
                    {formatCurrency(reportData.summary?.total_subcontractor ?? reportData.summary?.totalSubcontractor ?? 0)}
                  </div>
                  <div className="stat-label">مستخلصات مقاولي الباطن ({currencySymbol})</div>
                </div>

                <div className="stat-card purple">
                  <div className="stat-card-icon">⚖️</div>
                  <div className="stat-value" style={{ fontSize: '1.4rem', color: ((reportData.summary?.net_cash_flow ?? reportData.summary?.netCashFlow ?? 0) >= 0) ? '#10b981' : '#ef4444' }}>
                    {formatCurrency(reportData.summary?.net_cash_flow ?? reportData.summary?.netCashFlow ?? 0)}
                  </div>
                  <div className="stat-label">صافي التدفق المالي والأرباح ({currencySymbol})</div>
                </div>
              </div>

              {/* Transactions Breakdown Table */}
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>📋 كشف العمليات المالية والحركات المنجزة ({reportData.transactions?.length || 0})</h3>
                </div>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>التاريخ</th>
                        <th>نوع الحركة</th>
                        <th>البيان / الوصف</th>
                        <th>المشروع / الجهة</th>
                        <th>التصنيف</th>
                        <th style={{ textAlign: 'left' }}>المبلغ ({currencySymbol})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.transactions?.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            لا توجد حركات مالية في هذه الفترة المحددة.
                          </td>
                        </tr>
                      ) : (
                        reportData.transactions?.map((t: any, index: number) => {
                          const isRevenue = t.type === 'revenue';
                          const isExpense = t.type === 'expense';
                          const isSub = t.type === 'subcontractor';

                          return (
                            <tr key={t.id || index}>
                              <td>{t.date ? new Date(t.date).toLocaleDateString('ar-EG') : '-'}</td>
                              <td>
                                <span className={`badge ${isRevenue ? 'badge-success' : isExpense ? 'badge-danger' : isSub ? 'badge-warning' : 'badge-info'}`}>
                                  {isRevenue ? 'إيراد / تحصيل 🟢' : isExpense ? 'مصروفات 🔴' : isSub ? 'مستخلص مقاول 🟡' : 'التزام مالية 🔵'}
                                </span>
                              </td>
                              <td style={{ fontWeight: 600 }}>{t.title || t.description || '-'}</td>
                              <td>{t.project_name || t.creditor_name || '-'}</td>
                              <td><span className="badge badge-muted">{t.category || '-'}</span></td>
                              <td style={{ textAlign: 'left', fontWeight: 700, color: isRevenue ? '#10b981' : '#ef4444' }}>
                                {isRevenue ? '+' : '-'}{formatCurrency(t.amount || 0)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Grid of 6 Detailed Report Console Cards */}
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2.5rem', marginBottom: '1.25rem', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>🖨️ طباعة وتقارير الأقسام التفصيلية</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                
                {/* 1. Projects Reports Card */}
                <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.06)', border: '1px solid var(--border-subtle)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '0.75rem 1.25rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', background: '#c49a3f' }}>📁 تقارير المشاريع</div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '1rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>تقرير مشروع محدد:</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select className="form-control" value={selectedReportProjectId} onChange={e => setSelectedReportProjectId(e.target.value)}>
                          <option value="">اختر المشروع...</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button className="btn btn-primary" onClick={() => handleGenerateReport('project_detail')} style={{ background: '#c49a3f', borderColor: '#c49a3f', whiteSpace: 'nowrap' }}>🖨️ طباعة</button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '1rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>تقرير ملخص جميع المشاريع:</span>
                      <button className="btn btn-outline" onClick={() => handleGenerateReport('projects_summary')} style={{ whiteSpace: 'nowrap' }}>🖨️ طباعة تقرير الجميع</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>تقرير مصروفات مشروع محدد:</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select className="form-control" value={selectedReportProjectId} onChange={e => setSelectedReportProjectId(e.target.value)}>
                          <option value="">اختر المشروع...</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button className="btn btn-primary" onClick={() => handleGenerateReport('project_expenses')} style={{ background: '#c49a3f', borderColor: '#c49a3f', whiteSpace: 'nowrap' }}>🖨️ طباعة</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Workers Reports Card */}
                <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.06)', border: '1px solid var(--border-subtle)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '0.75rem 1.25rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', background: '#198754' }}>👷‍♂️ تقارير العمال</div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '1rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>تقرير جميع العمال واليوميات:</span>
                      <button className="btn btn-outline" onClick={() => handleGenerateReport('all_workers')} style={{ whiteSpace: 'nowrap' }}>🖨️ طباعة الجميع</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '1rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>كشف حساب عامل (يوميات + سلف + خصومات):</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input type="date" className="form-control" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} placeholder="من تاريخ" />
                        <input type="date" className="form-control" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} placeholder="إلى تاريخ" />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select className="form-control" value={selectedReportEmployeeId} onChange={e => setSelectedReportEmployeeId(e.target.value)}>
                          <option value="">اختر العامل...</option>
                          {employees.filter(e => e.employment_type === 'daily' || e.job_title?.includes('عامل') || e.job_title?.includes('فني') || e.job_title?.includes('سائق')).map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.job_title})</option>
                          ))}
                        </select>
                        <button className="btn btn-primary" onClick={() => handleGenerateReport('worker_ledger')} style={{ background: '#198754', borderColor: '#198754', whiteSpace: 'nowrap' }}>🖨️ كشف حساب</button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>تقرير يوميات حضور العامل:</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select className="form-control" value={selectedReportEmployeeId} onChange={e => setSelectedReportEmployeeId(e.target.value)}>
                          <option value="">اختر العامل...</option>
                          {employees.filter(e => e.employment_type === 'daily' || e.job_title?.includes('عامل') || e.job_title?.includes('فني')).map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                          ))}
                        </select>
                        <button className="btn btn-primary" onClick={() => handleGenerateReport('worker_attendance')} style={{ background: '#198754', borderColor: '#198754', whiteSpace: 'nowrap' }}>🖨️ طباعة اليوميات</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Supervisors Reports Card */}
                <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.06)', border: '1px solid var(--border-subtle)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '0.75rem 1.25rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', background: '#6f42c1' }}>👔 تقارير المشرفين والإدارة</div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '1rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>تقرير المشرفين والرواتب الإدارية:</span>
                      <button className="btn btn-outline" onClick={() => handleGenerateReport('supervisors')} style={{ whiteSpace: 'nowrap' }}>🖨️ طباعة المشرفين</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>تقرير كشف الرواتب والمسير:</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <select className="form-control" value={reportMonthFilter} onChange={e => setReportMonthFilter(Number(e.target.value))}>
                          {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1} - شهر</option>)}
                        </select>
                        <select className="form-control" value={reportYearFilter} onChange={e => setReportYearFilter(Number(e.target.value))}>
                          <option value="2026">2026</option>
                          <option value="2025">2025</option>
                        </select>
                      </div>
                      <button className="btn btn-primary" onClick={() => handleGenerateReport('payroll_report')} style={{ background: '#6f42c1', borderColor: '#6f42c1', width: '100%' }}>🖨️ طباعة مسير رواتب الشهر المختار</button>
                    </div>
                  </div>
                </div>

                {/* 4. Equipment Reports Card */}
                <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.06)', border: '1px solid var(--border-subtle)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '0.75rem 1.25rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', background: '#fd7e14' }}>🚚 تقارير المعدات والآليات</div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '1rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>تقرير قائمة المعدات والآليات:</span>
                      <button className="btn btn-outline" onClick={() => handleGenerateReport('all_equipments')} style={{ whiteSpace: 'nowrap' }}>🖨️ طباعة المعدات</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>تقرير مصروفات تشغيل المعدات:</span>
                      <button className="btn btn-primary" onClick={() => handleGenerateReport('equipment_expenses')} style={{ background: '#fd7e14', borderColor: '#fd7e14', width: '100%' }}>🖨️ طباعة مصروفات وتشغيل المعدات</button>
                    </div>
                  </div>
                </div>

                {/* 5. Logs & Movements Reports Card */}
                <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.06)', border: '1px solid var(--border-subtle)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '0.75rem 1.25rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', background: '#212529' }}>📅 تقارير الحركة والقيود المالية</div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '1rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>تقرير حركة يومية للتاريخ:</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="date" className="form-control" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} />
                        <button className="btn btn-primary" onClick={() => handleGenerateReport('daily_log')} style={{ background: '#212529', borderColor: '#212529', whiteSpace: 'nowrap' }}>🖨️ طباعة اليومي</button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '1rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>تقرير حركة شهرية للمركز المالي:</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <select className="form-control" value={reportMonthFilter} onChange={e => setReportMonthFilter(Number(e.target.value))}>
                          {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1} - شهر</option>)}
                        </select>
                        <select className="form-control" value={reportYearFilter} onChange={e => setReportYearFilter(Number(e.target.value))}>
                          <option value="2026">2026</option>
                          <option value="2025">2025</option>
                        </select>
                      </div>
                      <button className="btn btn-primary" onClick={() => handleGenerateReport('monthly_log')} style={{ background: '#212529', borderColor: '#212529', width: '100%' }}>🖨️ طباعة حركة الشهر</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>تقرير حركة بين تاريخين:</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input type="date" className="form-control" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} placeholder="من تاريخ" />
                        <input type="date" className="form-control" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} placeholder="إلى تاريخ" />
                      </div>
                      <button className="btn btn-primary" onClick={() => handleGenerateReport('range_log')} style={{ background: '#212529', borderColor: '#212529', width: '100%' }}>🖨️ طباعة المدى</button>
                    </div>
                  </div>
                </div>

                {/* 6. Financial Reports Card */}
                <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.06)', border: '1px solid var(--border-subtle)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '0.75rem 1.25rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', background: '#0dcaf0' }}>📊 التقارير المالية والحسابات</div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '1rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>تقرير الإيرادات ومستخلصات المقاصة:</span>
                      <button className="btn btn-outline" onClick={() => handleGenerateReport('revenues')} style={{ whiteSpace: 'nowrap' }}>🖨️ طباعة الإيرادات</button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '1rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>تقرير الأرباح والخسائر:</span>
                      <button className="btn btn-outline" onClick={() => handleGenerateReport('profits')} style={{ whiteSpace: 'nowrap' }}>🖨️ طباعة الأرباح</button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>تقرير كشف الخزينة والصندوق الكامل:</span>
                      <button className="btn btn-primary" onClick={() => handleGenerateReport('cashbox')} style={{ background: '#0dcaf0', borderColor: '#0dcaf0', whiteSpace: 'nowrap' }}>🖨️ طباعة الخزينة</button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>تقرير 🏛️ المديونيات وقروض التمويل:</span>
                      <button className="btn btn-primary" onClick={() => handleGenerateReport('debts_report')} style={{ background: '#6f42c1', borderColor: '#6f42c1', whiteSpace: 'nowrap' }}>🖨️ طباعة المديونيات والتمويل</button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Printable Financial Statement Container for window.print() */}
              <div className="print-container">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <img src="/logo.jpg" alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                  <h2 style={{ margin: '0.5rem 0', fontSize: '1.6rem' }}>{companyInfo?.name_ar || 'مؤسسة الرايق للمقاولات الكهروميكانيكية'}</h2>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, textDecoration: 'underline' }}>تقرير الكشف المالي الشامل وتدفقات الحسابات</div>
                  <div style={{ fontSize: '0.95rem', color: '#555', marginTop: '0.25rem' }}>
                    فترة التقرير: {reportPeriod === 'daily' ? 'تقرير يومي' : reportPeriod === 'weekly' ? 'تقرير أسبوعي' : reportPeriod === 'monthly' ? 'تقرير شهري' : 'تقرير فترة مخصصة'} ({new Date().toLocaleDateString('ar-EG')})
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem', border: '1px solid #000', padding: '1rem', borderRadius: '6px' }}>
                  <div><strong>إجمالي الإيرادات:</strong> {formatCurrency(reportData.summary?.total_revenues ?? reportData.summary?.totalRevenues ?? 0)}</div>
                  <div><strong>إجمالي المصروفات:</strong> {formatCurrency(reportData.summary?.total_expenses ?? reportData.summary?.totalExpenses ?? 0)}</div>
                  <div><strong>مستخلصات المقاولين:</strong> {formatCurrency(reportData.summary?.total_subcontractor ?? reportData.summary?.totalSubcontractor ?? 0)}</div>
                  <div><strong>صافي الأرباح/التدفق:</strong> {formatCurrency(reportData.summary?.net_cash_flow ?? reportData.summary?.netCashFlow ?? 0)}</div>
                </div>

                <table className="print-table">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>نوع الحركة</th>
                      <th>البيان / الوصف</th>
                      <th>المشروع / الجهة</th>
                      <th style={{ textAlign: 'left' }}>المبلغ ({currencySymbol})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.transactions?.map((t: any, idx: number) => (
                      <tr key={idx}>
                        <td>{t.date ? new Date(t.date).toLocaleDateString('ar-EG') : '-'}</td>
                        <td>{t.type === 'revenue' ? 'إيراد' : 'مصروف'}</td>
                        <td>{t.title || t.description}</td>
                        <td>{t.project_name || '-'}</td>
                        <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{formatCurrency(t.amount || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="print-footer" style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between' }}>
                  <div className="print-signature-box">
                    <div>إعداد المحاسب المالي</div>
                    <div className="print-signature-line"></div>
                  </div>
                  <div className="print-signature-box">
                    <div>مراجعة المدير المالي</div>
                    <div className="print-signature-line"></div>
                  </div>
                  <div className="print-signature-box">
                    <div>اعتماد مدير النظام</div>
                    <div className="print-signature-line"></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}


      {/* ======================== TAB: PETTY CASH TRACKER ======================== */}
      {activeTab === 'petty_cash' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">💵 إدارة العُهَد النقدية للمهندسين (Petty Cash Tracker)</div>
              <div className="page-description">تسليم وتتبع العُهد النقدية لمهندسي المواقع، رفع صور الفواتير أونلاين بالموبايل، والاعتماد والتوزيع الآلي على ميزانيات المشاريع</div>
            </div>
            <div className="page-header-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                onClick={() => {
                  const printWin = window.open('', '_blank', 'width=1200,height=800');
                  if (!printWin) { alert('يرجى السماح بالنوافذ المنبثقة'); return; }
                  const catMap: Record<string,string> = { material: 'مواد', labor: 'عمالة', subcontractor: 'مقاول', equipment: 'معدات', transport: 'نقل', overhead: 'تكاليف عامة', other: 'أخرى' };
                  const fmt = (v: any) => Number(v || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 });
                  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('ar-EG', { calendar: 'gregory', year: 'numeric', month: '2-digit', day: '2-digit' }) : '-';
                  const custRows = pettyCustodies.map((c: any, i: number) => `
                    <tr style="background:${i%2===0?'#f8fafc':'#fff'}">
                      <td style="text-align:center;font-weight:700">${i+1}</td>
                      <td style="font-family:monospace;font-weight:700;color:#1e40af">${c.custody_number}</td>
                      <td style="font-weight:600">${c.engineer_name || '-'}</td>
                      <td>${c.project_name || 'عام'}</td>
                      <td>${fmtDate(c.issue_date)}</td>
                      <td style="font-weight:700;color:#1e3a8a;text-align:left">${fmt(c.amount_given)}</td>
                      <td style="color:#dc2626;text-align:left">${fmt(c.amount_spent)}</td>
                      <td style="font-weight:700;color:#16a34a;text-align:left">${fmt(c.amount_remaining)}</td>
                      <td style="text-align:center"><span style="padding:2px 10px;border-radius:20px;background:#dcfce7;color:#166534;font-size:0.8rem;font-weight:700">نشطة</span></td>
                    </tr>`).join('');
                  const claimRows = pettyClaims.map((c: any, i: number) => `
                    <tr style="background:${i%2===0?'#f8fafc':'#fff'}">
                      <td style="text-align:center;font-weight:700">${i+1}</td>
                      <td style="font-family:monospace;font-weight:700;color:#4f46e5">${c.claim_number}</td>
                      <td style="font-weight:600">${c.engineer_name || '-'}</td>
                      <td>${c.description}</td>
                      <td>${catMap[c.category] || c.category}</td>
                      <td>${c.project_name || 'غير محدد'}</td>
                      <td>${fmtDate(c.claim_date)}</td>
                      <td style="font-weight:700;color:#1e3a8a;text-align:left">${fmt(c.amount)}</td>
                      <td style="text-align:center"><span style="padding:2px 10px;border-radius:20px;font-size:0.8rem;font-weight:700;
                        background:${c.status==='approved'?'#dcfce7':c.status==='rejected'?'#fee2e2':'#fef9c3'};
                        color:${c.status==='approved'?'#166534':c.status==='rejected'?'#991b1b':'#854d0e'}">
                        ${c.status==='approved'?'✅ معتمدة':c.status==='rejected'?'رفض':'قيد مراجعة'}</span></td>
                    </tr>`).join('');
                  const now = new Date().toLocaleDateString('ar-EG', {calendar:'gregory',year:'numeric',month:'long',day:'numeric'});
                  const totalGiven = fmt(pettyCustodies.reduce((a: number, c: any) => a + Number(c.amount_given||0), 0));
                  const totalSpent = fmt(pettyCustodies.reduce((a: number, c: any) => a + Number(c.amount_spent||0), 0));
                  const totalRemaining = fmt(pettyCustodies.reduce((a: number, c: any) => a + Number(c.amount_remaining||0), 0));
                  const totalClaims = fmt(pettyClaims.reduce((a: number, c: any) => a + Number(c.amount||0), 0));
                  printWin.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>كشف العُهَد النقدية</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#111827;font-size:11px;direction:rtl}
.header{border-bottom:3px solid #1e293b;padding-bottom:12px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-start}
.co{font-size:17px;font-weight:800;color:#1e293b}.co-sub{font-size:11px;color:#64748b;margin-top:3px}
.rep-title{font-size:14px;font-weight:700;color:#4f46e5;text-align:left}.rep-date{font-size:11px;color:#64748b;text-align:left;margin-top:3px}
.stats{display:flex;gap:12px;margin-bottom:14px}.stat-box{border:1px solid #e2e8f0;border-radius:6px;padding:7px 14px;flex:1;text-align:center;background:#f8fafc}
.stat-num{font-size:17px;font-weight:800;color:#1e40af}.stat-lbl{font-size:10px;color:#64748b;margin-top:2px}
.section-title{background:#1e293b;color:#fff;padding:6px 10px;font-size:12px;font-weight:700;margin:16px 0 8px 0;border-radius:4px}
table{width:100%;border-collapse:collapse;font-size:10px}thead tr{background:#334155;color:#fff}
th{padding:6px 5px;text-align:right;font-weight:700;border:1px solid #475569}
td{padding:5px;border:1px solid #e2e8f0;vertical-align:middle}
.footer{margin-top:16px;border-top:1px solid #e2e8f0;padding-top:8px;display:flex;justify-content:space-between;color:#94a3b8;font-size:10px}
@media print{@page{size:A4 landscape;margin:10mm}}</style></head><body>
<div class="header">
  <div><div class="co">شركة الرايق للمقاولات الكهروميكانيكية</div><div class="co-sub">إدارة المالية — كشف العُهَد النقدية (Petty Cash)</div></div>
  <div><div class="rep-title">💵 كشف العُهَد النقدية للمهندسين</div><div class="rep-date">تاريخ الإصدار: ${now}</div></div>
</div>
<div class="stats">
  <div class="stat-box"><div class="stat-num">${totalGiven}</div><div class="stat-lbl">إجمالي العُهد المسلمة</div></div>
  <div class="stat-box"><div class="stat-num" style="color:#dc2626">${totalSpent}</div><div class="stat-lbl">المصروف المعتمد</div></div>
  <div class="stat-box"><div class="stat-num" style="color:#16a34a">${totalRemaining}</div><div class="stat-lbl">الرصيد المتبقي</div></div>
  <div class="stat-box"><div class="stat-num" style="color:#4f46e5">${totalClaims}</div><div class="stat-lbl">إجمالي الفواتير</div></div>
  <div class="stat-box"><div class="stat-num">${pettyClaims.filter((c: any) => c.status==='pending').length}</div><div class="stat-lbl">قيد المراجعة</div></div>
</div>
<div class="section-title">👷‍♂️ عُهد المهندسين - رصيد العُهد النقدية</div>
<table><thead><tr>
  <th style="width:3%;text-align:center">#</th><th style="width:9%">رقم العُهدة</th>
  <th style="width:14%">المهندس المستلم</th><th style="width:12%">المشروع</th>
  <th style="width:9%">تاريخ الصرف</th><th style="width:10%;text-align:left">المسلم</th>
  <th style="width:10%;text-align:left">المصروف</th><th style="width:10%;text-align:left">المتبقي</th>
  <th style="width:8%;text-align:center">الحالة</th>
</tr></thead><tbody>${custRows}</tbody></table>
<div class="section-title">🧾 فواتير وإيصالات العُهد المرفوعة</div>
<table><thead><tr>
  <th style="width:3%;text-align:center">#</th><th style="width:8%">رقم الفاتورة</th>
  <th style="width:11%">المهندس</th><th style="width:16%">البيان</th>
  <th style="width:8%">التصنيف</th><th style="width:12%">المشروع</th>
  <th style="width:9%">التاريخ</th><th style="width:9%;text-align:left">المبلغ</th>
  <th style="width:9%;text-align:center">الحالة</th>
</tr></thead><tbody>${claimRows}</tbody></table>
<div class="footer">
  <span>إجمالي العُهد: ${pettyCustodies.length} | إجمالي الفواتير: ${pettyClaims.length}</span>
  <span>نظام الرايق — طباعة: ${now}</span>
</div></body></html>`);
                  printWin.document.close();
                  setTimeout(() => { printWin.focus(); printWin.print(); }, 400);
                }}
              >
                🖨️ طباعة كشف العُهد
              </button>
              {!isReadOnly && <button className="btn btn-secondary" onClick={() => setShowClaimModal(true)}>📸 رفع فاتورة عُهدة من الموقع</button>}
              {!isReadOnly && <button className="btn btn-primary" onClick={() => setShowCustodyModal(true)}>+ تسليم عُهدة نقدية لمهندس</button>}
            </div>
          </div>

          <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card primary">
              <div className="stat-card-icon">💵</div>
              <div className="stat-value">{formatCurrency(pettyCustodies.reduce((acc, c) => acc + Number(c.amount_given || 0), 0))}</div>
              <div className="stat-label">إجمالي العُهَد النقدية المسلمة</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-card-icon">🧾</div>
              <div className="stat-value">{formatCurrency(pettyCustodies.reduce((acc, c) => acc + Number(c.amount_spent || 0), 0))}</div>
              <div className="stat-label">المصروف والمعتمد من العُهَد</div>
            </div>
            <div className="stat-card success">
              <div className="stat-card-icon">🏦</div>
              <div className="stat-value">{formatCurrency(pettyCustodies.reduce((acc, c) => acc + Number(c.amount_remaining || 0), 0))}</div>
              <div className="stat-label">الرصيد الصافي المتبقي بعُهدة المهندسين</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-card-icon">⏳</div>
              <div className="stat-value">{pettyClaims.filter(c => c.status === 'pending').length}</div>
              <div className="stat-label">فواتير قيد مراجعة الاعتماد والترحيل</div>
            </div>
          </div>

          {/* Table 1: Engineer Custodies Float */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>👷‍♂️ رصيد العُهَد النقدية للمهندسين بالمواقف</span>
              <button className="btn btn-outline btn-sm" onClick={() => setShowCustodyModal(true)}>+ صرف عُهدة جديدة</button>
            </div>
            {pettyLoading ? (
              <div className="empty-state">
                <div className="loading-spinner" style={{ width: '32px', height: '32px', margin: '0 auto' }} />
                <div className="empty-state-title" style={{ marginTop: '1rem' }}>جاري تحميل بيانات العُهَد...</div>
              </div>
            ) : pettyCustodies.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💵</div>
                <div className="empty-state-title">لا توجد عُهد نقدية مسلمة لمهندسين حالياً</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم العُهدة</th>
                      <th>المهندس المستلم</th>
                      <th>المشروع المرتبط</th>
                      <th>تاريخ الصرف</th>
                      <th>المبلغ المسلم</th>
                      <th>المصروف المعتمد</th>
                      <th>الرصيد المتبقي</th>
                      <th>الحالة</th>
                      <th style={{ textAlign: 'center' }}>تعديل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pettyCustodies.map((cust: any) => (
                      <tr key={cust.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{cust.custody_number}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cust.engineer_name}</td>
                        <td>{cust.project_name || 'عام / غير مرتبط بمشروع'}</td>
                        <td>{new Date(cust.issue_date).toLocaleDateString('ar-EG', { calendar: 'gregory', year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                        <td style={{ fontWeight: 700, color: '#1e3a8a' }}>{formatCurrency(cust.amount_given)}</td>
                        <td style={{ color: '#dc2626' }}>{formatCurrency(cust.amount_spent)}</td>
                        <td style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(cust.amount_remaining)}</td>
                        <td><span className="badge badge-success">نشطة ومستمرة</span></td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleOpenEditCustody(cust)}
                            style={{ color: 'var(--brand-primary-light)' }}
                          >✏️ تعديل</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Table 2: Submitted Petty Cash Claims & Auditing */}
          <div className="card">
            <div style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🧾 فواتير وإيصالات العُهَد المرفوعة بالموبايل (دورة الاعتماد وتوزيع الميزانية)</span>
              <button className="btn btn-primary btn-sm" onClick={() => setShowClaimModal(true)}>📸 رفع فاتورة جديدة</button>
            </div>
            {pettyClaims.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📸</div>
                <div className="empty-state-title">لا توجد فواتير عُهد مرفوعة حالياً</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم الفاتورة</th>
                      <th>المهندس</th>
                      <th>بيان الفاتورة والتكلفة</th>
                      <th>المشروع الموزع عليه</th>
                      <th>التاريخ</th>
                      <th>صورة الإيصال الورقي</th>
                      <th>المبلغ</th>
                      <th>الحالة</th>
                      <th style={{ textAlign: 'center' }}>إجراء الاعتماد والتوزيع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pettyClaims.map((claim: any) => (
                      <tr key={claim.id}>
                        <td style={{ fontWeight: 700 }}>{claim.claim_number}</td>
                        <td style={{ fontWeight: 600 }}>{claim.engineer_name}</td>
                        <td>{claim.description}</td>
                        <td style={{ fontWeight: 600, color: 'var(--brand-primary-light)' }}>{claim.project_name || 'غير محدد'}</td>
                        <td>{new Date(claim.claim_date).toLocaleDateString('ar-EG')}</td>
                        <td>
                          {claim.receipt_image_url ? (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => setSelectedReceiptUrl(claim.receipt_image_url)}
                            >
                              🖼️ معاينة الصورة
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>بدون صورة إيصال</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 700, color: '#1e3a8a' }}>{formatCurrency(claim.amount)}</td>
                        <td>
                          {claim.status === 'approved' ? (
                            <span className="badge badge-success">✅ معتمدة وموزعة</span>
                          ) : claim.status === 'rejected' ? (
                            <span className="badge badge-danger">🔴 مرفوضة</span>
                          ) : (
                            <span className="badge badge-warning">⏳ قيد مراجعة الاعتماد</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {claim.status === 'pending' ? (
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  if (claim.receipt_image_url) {
                                    setSelectedReceiptUrl(claim.receipt_image_url);
                                  } else {
                                    handleOpenEditClaim(claim);
                                  }
                                }}
                                style={{ color: claim.receipt_image_url ? 'var(--brand-primary)' : 'var(--text-muted)' }}
                                title={claim.receipt_image_url ? 'معاينة صورة الفاتورة/الإيصال' : 'إضافة/رفع صورة الفاتورة'}
                              >
                                📷 {claim.receipt_image_url ? 'معاينة الصورة' : 'إضافة صورة'}
                              </button>
                              {!isReadOnly && <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleOpenEditClaim(claim)}
                                style={{ color: 'var(--brand-primary-light)' }}
                              >✏️ تعديل</button>}
                              {isManagerOrAdmin ? (
                                <>
                                  <button
                                    className="btn btn-success btn-sm"
                                    onClick={() => handleApproveOrRejectClaim(claim.id, 'approve')}
                                    title="اعتماد الفاتورة وتخصيصها كـ مصروف مباشر في ميزانية المشروع"
                                  >
                                    ✅ اعتماد
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleApproveOrRejectClaim(claim.id, 'reject')}
                                  >
                                    🔴 رفض
                                  </button>
                                </>
                              ) : (
                                <span className="badge badge-warning" style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }} title="الفاتورة المرفوعة بانتظار موافقة واعتماد المدير العام">
                                  ⏳ بانتظار اعتماد المدير العام
                                </span>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  if (claim.receipt_image_url) {
                                    setSelectedReceiptUrl(claim.receipt_image_url);
                                  } else {
                                    handleOpenEditClaim(claim);
                                  }
                                }}
                                style={{ color: claim.receipt_image_url ? 'var(--brand-primary)' : 'var(--text-muted)' }}
                                title={claim.receipt_image_url ? 'معاينة صورة الفاتورة/الإيصال' : 'إضافة/رفع صورة الفاتورة'}
                              >
                                📷 {claim.receipt_image_url ? 'معاينة الصورة' : 'إضافة صورة'}
                              </button>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleOpenEditClaim(claim)}
                                style={{ color: 'var(--brand-primary-light)' }}
                              >✏️ تعديل</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================== MODAL: EDIT CUSTODY ======================== */}
      {showEditCustodyModal && editingCustody && (
        <div className="modal-overlay" onClick={() => setShowEditCustodyModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">✏️ تعديل بيانات العُهدة النقدية — {editingCustody.custody_number}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEditCustodyModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdateCustody}>
              <div className="form-grid form-grid-2">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label required">المهندس المستلم</label>
                  <select className="form-control" required value={editCustodyForm.engineer_id} onChange={e => setEditCustodyForm({...editCustodyForm, engineer_id: e.target.value})}>
                    <option value="">-- اختر مهندس --</option>
                    {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.job_title || 'موظف'})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">مبلغ العُهدة</label>
                  <input className="form-control" type="number" step="any" required value={editCustodyForm.amount_given}
                    onChange={e => setEditCustodyForm({...editCustodyForm, amount_given: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ الصرف</label>
                  <input className="form-control" type="date" value={editCustodyForm.issue_date}
                    onChange={e => setEditCustodyForm({...editCustodyForm, issue_date: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">المشروع</label>
                  <select className="form-control" value={editCustodyForm.project_id} onChange={e => setEditCustodyForm({...editCustodyForm, project_id: e.target.value})}>
                    <option value="">عام / غير مرتبط بمشروع</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">ملاحظات</label>
                  <textarea className="form-control" rows={2} value={editCustodyForm.notes}
                    onChange={e => setEditCustodyForm({...editCustodyForm, notes: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowEditCustodyModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: EDIT CLAIM ======================== */}
      {showEditClaimModal && editingClaim && (
        <div className="modal-overlay" onClick={() => setShowEditClaimModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">✏️ تعديل بيانات الفاتورة — {editingClaim.claim_number}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEditClaimModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdateClaim}>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label required">المهندس</label>
                  <select className="form-control" required value={editClaimForm.engineer_id} onChange={e => setEditClaimForm({...editClaimForm, engineer_id: e.target.value})}>
                    <option value="">-- اختر --</option>
                    {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">التصنيف</label>
                  <select className="form-control" value={editClaimForm.category} onChange={e => setEditClaimForm({...editClaimForm, category: e.target.value})}>
                    <option value="material">مواد</option>
                    <option value="labor">عمالة</option>
                    <option value="subcontractor">مقاول فرعي</option>
                    <option value="equipment">معدات</option>
                    <option value="transport">نقل</option>
                    <option value="overhead">تكاليف عامة</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label required">بيان الفاتورة</label>
                  <input className="form-control" required value={editClaimForm.description}
                    onChange={e => setEditClaimForm({...editClaimForm, description: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label required">المبلغ</label>
                  <input className="form-control" type="number" step="any" required value={editClaimForm.amount}
                    onChange={e => setEditClaimForm({...editClaimForm, amount: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ الفاتورة</label>
                  <input className="form-control" type="date" value={editClaimForm.claim_date}
                    onChange={e => setEditClaimForm({...editClaimForm, claim_date: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">المشروع</label>
                  <select className="form-control" value={editClaimForm.project_id} onChange={e => setEditClaimForm({...editClaimForm, project_id: e.target.value})}>
                    <option value="">غير محدد</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">ملاحظات</label>
                  <textarea className="form-control" rows={2} value={editClaimForm.notes}
                    onChange={e => setEditClaimForm({...editClaimForm, notes: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">📷 صورة الفاتورة / الإيصال الورقي (من كاميرا الموبايل)</label>
                  <input
                    className="form-control"
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditClaimForm({...editClaimForm, receipt_image_url: reader.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {editClaimForm.receipt_image_url && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img src={editClaimForm.receipt_image_url} alt="معاينة الإيصال" style={{ maxHeight: '110px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                      <button
                        type="button"
                        className="btn btn-outline btn-sm text-danger"
                        onClick={() => setEditClaimForm({...editClaimForm, receipt_image_url: ''})}
                      >
                        🗑️ إزالة الصورة
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowEditClaimModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {showDebtModal && (
        <div className="modal-overlay" onClick={() => setShowDebtModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🏛️ تسجيل التزام مالي أو تمويل مشروع جديد</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowDebtModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateDebt}>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label required">اسم الدائن / المقرض</label>
                  <input
                    className="form-control"
                    required
                    value={debtForm.creditor_name}
                    onChange={e => setDebtForm({ ...debtForm, creditor_name: e.target.value })}
                    placeholder="مثال: البنك الأهلي، المورد فلان..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">نوع الالتزام المالي</label>
                  <select
                    className="form-control"
                    required
                    value={debtForm.debt_type}
                    onChange={e => setDebtForm({ ...debtForm, debt_type: e.target.value })}
                  >
                    <option value="project_finance">قرض خارجي لتمويل تشغيل مشروع</option>
                    <option value="subcontractor_ipc">مستخلص مستحق لمقاول باطن</option>
                    <option value="supplier_invoice">فاتورة مستحقة لمورد مواد</option>
                    <option value="other">التزام مالي إداري آخر</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">المشروع المرتبط/الممول</label>
                  <select
                    className="form-control"
                    value={debtForm.project_id}
                    onChange={e => setDebtForm({ ...debtForm, project_id: e.target.value })}
                  >
                    <option value="">لا يوجد مشروع مرتبط...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">المبلغ الإجمالي ({currencySymbol})</label>
                  <input
                    className="form-control"
                    type="number"
                    required
                    value={debtForm.amount}
                    onChange={e => setDebtForm({ ...debtForm, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ الاستحقاق/السداد</label>
                  <input
                    className="form-control"
                    type="date"
                    value={debtForm.due_date}
                    onChange={e => setDebtForm({ ...debtForm, due_date: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">ملاحظات إضافية وشروط السداد</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={debtForm.notes}
                    onChange={e => setDebtForm({ ...debtForm, notes: e.target.value })}
                    placeholder="شروط تسوية الدين، أو ربطه بمستخلص المالك..."
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowDebtModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 حفظ المديونية</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: ADD CLIENT IPC ======================== */}
      {showIpcModal && (
        <div className="modal-overlay" onClick={() => {
          setShowIpcModal(false);
          setEditingIpc(null);
          setIpcItems([]);
          setIpcForm({
            project_id: '', ipc_number: '', period_from: '', period_to: '',
            items_total: '', vat_percentage: '14', retention_percentage: '10', advance_deduction_percentage: '0', wht_percentage: '1', notes: '', previous_payments: ''
          });
        }}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingIpc ? '✏️ تعديل مستخلص عميل' : '📄 إصدار مستخلص عميل جديد'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => {
                setShowIpcModal(false);
                setEditingIpc(null);
                setIpcItems([]);
                setIpcForm({
                  project_id: '', ipc_number: '', period_from: '', period_to: '',
                  items_total: '', vat_percentage: '14', retention_percentage: '10', advance_deduction_percentage: '0', wht_percentage: '1', notes: '', previous_payments: ''
                });
              }}>✕</button>
            </div>
            <form onSubmit={handleCreateIpc}>
              <div className="modal-body">
              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label required">المشروع</label>
                  <select className="form-control" required value={ipcForm.project_id} onChange={e => setIpcForm({...ipcForm, project_id: e.target.value})}>
                    <option value="">اختر المشروع...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">رقم المستخلص (اختياري)</label>
                  <input className="form-control" value={ipcForm.ipc_number} onChange={e => setIpcForm({...ipcForm, ipc_number: e.target.value})} placeholder="توليد تلقائي تسلسلي (مثال: IPC-0001)" />
                </div>
                <div className="form-group">
                  <label className="form-label">الفترة من</label>
                  <input className="form-control" type="date" value={ipcForm.period_from} onChange={e => setIpcForm({...ipcForm, period_from: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">الفترة إلى</label>
                  <input className="form-control" type="date" value={ipcForm.period_to} onChange={e => setIpcForm({...ipcForm, period_to: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label required">إجمالي قيمة الأعمال ({currencySymbol})</label>
                  <input className="form-control" type="number" required value={ipcForm.items_total} onChange={e => setIpcForm({...ipcForm, items_total: e.target.value})} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">نسبة ضريبة القيمة المضافة %</label>
                  <input className="form-control" type="number" value={ipcForm.vat_percentage} onChange={e => setIpcForm({...ipcForm, vat_percentage: e.target.value})} placeholder="14" />
                </div>
                <div className="form-group">
                  <label className="form-label">نسبة استقطاع الضمان %</label>
                  <input className="form-control" type="number" value={ipcForm.retention_percentage} onChange={e => setIpcForm({...ipcForm, retention_percentage: e.target.value})} placeholder="10" />
                </div>
                <div className="form-group">
                  <label className="form-label">خصم الدفعة المقدمة %</label>
                  <input className="form-control" type="number" value={ipcForm.advance_deduction_percentage} onChange={e => setIpcForm({...ipcForm, advance_deduction_percentage: e.target.value})} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">خصم ضريبة أرباح تجارية وصناعية (WHT) %</label>
                  <input className="form-control" type="number" value={ipcForm.wht_percentage} onChange={e => setIpcForm({...ipcForm, wht_percentage: e.target.value})} placeholder="1" />
                </div>
                <div className="form-group">
                  <label className="form-label">الدفعات السابقة ({currencySymbol})</label>
                  <input className="form-control" type="number" value={ipcForm.previous_payments} onChange={e => setIpcForm({...ipcForm, previous_payments: e.target.value})} placeholder="0.00" />
                </div>
                {editingIpc && (
                  <div className="form-group">
                    <label className="form-label required">حالة المستخلص</label>
                    <select className="form-control" required value={editingIpc.status} onChange={e => setEditingIpc({...editingIpc, status: e.target.value})}>
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group" style={{ gridColumn: 'span 3' }}>
                  <label className="form-label">ملاحظات</label>
                  <textarea className="form-control" value={ipcForm.notes} onChange={e => setIpcForm({...ipcForm, notes: e.target.value})} placeholder="ملاحظات المستخلص..." rows={2} />
                </div>

                {/* Items detail section */}
                <div style={{ gridColumn: 'span 3', borderTop: '1px solid var(--border-normal)', paddingTop: '1.25rem', marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>📋 تفاصيل بنود الأعمال والكميات المعتمدة</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className="btn btn-outline btn-sm" onClick={handleLoadProjectBoq}>
                        📥 سحب البنود من مقايسة المشروع (BOQ)
                      </button>
                      <button type="button" className="btn btn-outline btn-sm text-primary" onClick={() => {
                        setIpcItems([...ipcItems, {
                          description: '',
                          unit: 'قطعة',
                          contract_quantity: 0,
                          previous_quantity: 0,
                          current_quantity: 0,
                          unit_rate: 0
                        }]);
                      }}>
                        ➕ إضافة بند أعمال يدوي
                      </button>
                    </div>
                  </div>

                  {ipcItems.length === 0 ? (
                    <div className="empty-state" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.01)', border: '1px dashed var(--border-normal)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>لا توجد بنود أعمال مضافة للمستخلص حتى الآن. يمكنك سحب البنود من مقايسة المشروع بالزر أعلاه أو إضافتها يدوياً.</div>
                    </div>
                  ) : (
                    <div className="table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      <table className="data-table" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th>البند / الوصف</th>
                            <th style={{ width: '80px' }}>الوحدة</th>
                            <th style={{ width: '100px' }}>كمية المقايسة</th>
                            <th style={{ width: '100px' }}>الكمية السابقة</th>
                            <th style={{ width: '100px' }}>الكمية الحالية</th>
                            <th style={{ width: '100px' }}>سعر الفئة</th>
                            <th style={{ width: '110px' }}>الإجمالي الحالي</th>
                            <th style={{ width: '40px' }}>حذف</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ipcItems.map((item, idx) => {
                            const lineTotal = Number(item.current_quantity || 0) * Number(item.unit_rate || 0);
                            return (
                              <tr key={idx}>
                                <td>
                                  <input className="form-control form-control-sm" style={{ width: '100%' }} value={item.description} onChange={e => {
                                    const next = [...ipcItems];
                                    next[idx].description = e.target.value;
                                    setIpcItems(next);
                                  }} required placeholder="اسم البند..." />
                                </td>
                                <td>
                                  <input className="form-control form-control-sm" style={{ width: '100%' }} value={item.unit} onChange={e => {
                                    const next = [...ipcItems];
                                    next[idx].unit = e.target.value;
                                    setIpcItems(next);
                                  }} required placeholder="متر/قطعة" />
                                </td>
                                <td>
                                  <input className="form-control form-control-sm" type="number" style={{ width: '100%' }} value={item.contract_quantity} onChange={e => {
                                    const next = [...ipcItems];
                                    next[idx].contract_quantity = e.target.value;
                                    setIpcItems(next);
                                  }} />
                                </td>
                                <td>
                                  <input className="form-control form-control-sm" type="number" style={{ width: '100%' }} value={item.previous_quantity} onChange={e => {
                                    const next = [...ipcItems];
                                    next[idx].previous_quantity = e.target.value;
                                    setIpcItems(next);
                                  }} />
                                </td>
                                <td>
                                  <input className="form-control form-control-sm" type="number" style={{ width: '100%' }} value={item.current_quantity} onChange={e => {
                                    const next = [...ipcItems];
                                    next[idx].current_quantity = e.target.value;
                                    setIpcItems(next);
                                  }} required />
                                </td>
                                <td>
                                  <input className="form-control form-control-sm" type="number" style={{ width: '100%' }} value={item.unit_rate} onChange={e => {
                                    const next = [...ipcItems];
                                    next[idx].unit_rate = e.target.value;
                                    setIpcItems(next);
                                  }} required />
                                </td>
                                <td style={{ fontWeight: 600 }}>{formatCurrency(lineTotal)}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <button type="button" className="btn btn-ghost text-danger btn-sm" style={{ padding: '0.25rem' }} onClick={() => {
                                    setIpcItems(ipcItems.filter((_, i) => i !== idx));
                                  }}>✕</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {ipcForm.items_total && (
                  <div className="alert alert-info" style={{ marginTop: '0.75rem', gridColumn: 'span 3' }}>
                    {(() => {
                      const itemsTotal = Number(ipcForm.items_total || 0);
                      const prevPayments = Number(ipcForm.previous_payments || 0);
                      const currentWork = itemsTotal > prevPayments ? (itemsTotal - prevPayments) : itemsTotal;
                      const vat = currentWork * (Number(ipcForm.vat_percentage || 0) / 100);
                      const retention = currentWork * (Number(ipcForm.retention_percentage || 0) / 100);
                      const advance = currentWork * (Number(ipcForm.advance_deduction_percentage || 0) / 100);
                      const wht = currentWork * (Number(ipcForm.wht_percentage || 0) / 100);
                      const netPayable = currentWork - retention - advance - wht + vat;
                      
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                          <div><strong>قيمة الأعمال الحالية:</strong> {formatCurrency(currentWork)}</div>
                          <div><strong>استقطاع الضمان ({ipcForm.retention_percentage}%):</strong> {formatCurrency(retention)}</div>
                          <div><strong>خصم الدفعة المقدمة ({ipcForm.advance_deduction_percentage}%):</strong> {formatCurrency(advance)}</div>
                          <div><strong>ضريبة الخصم من المنبع WHT ({ipcForm.wht_percentage}%):</strong> {formatCurrency(wht)}</div>
                          <div><strong>ضريبة القيمة المضافة ({ipcForm.vat_percentage}%):</strong> {formatCurrency(vat)}</div>
                          <div style={{ borderTop: '1px solid rgba(0,0,0,0.1)', gridColumn: 'span 3', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                            <strong style={{ fontSize: '1.05rem', color: 'var(--brand-primary)' }}>الصافي المستحق الصرف:</strong> <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-primary)' }}>{formatCurrency(netPayable)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => {
                  setShowIpcModal(false);
                  setEditingIpc(null);
                  setIpcItems([]);
                  setIpcForm({
                    project_id: '', ipc_number: '', period_from: '', period_to: '',
                    items_total: '', vat_percentage: '14', retention_percentage: '10', advance_deduction_percentage: '0', wht_percentage: '1', notes: '', previous_payments: ''
                  });
                }}>إلغاء</button>
                <button type="submit" className="btn btn-primary">{editingIpc ? '💾 حفظ التعديلات' : '💾 رفع المستخلص'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: ADD EXPENSE ======================== */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🧾 تسجيل مصروف للموقع</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowExpenseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateExpense}>
              <div className="form-grid form-grid-3">
                <div className="form-group col-span-3">
                  <label className="form-label required">المشروع المستهدف</label>
                  <select className="form-control" required value={expenseForm.project_id} onChange={e => setExpenseForm({...expenseForm, project_id: e.target.value})}>
                    <option value="">اختر المشروع...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">فئة المصروف</label>
                  <select className="form-control" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>
                    {Object.entries(categoryLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">المبلغ المالي ({currencySymbol})</label>
                  <input className="form-control" type="number" required value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الفاتورة</label>
                  <input className="form-control" value={expenseForm.invoice_number} onChange={e => setExpenseForm({...expenseForm, invoice_number: e.target.value})} placeholder="INV-xxx" />
                </div>
                <div className="form-group col-span-3">
                  <label className="form-label">المورد/الجهة المستلمة</label>
                  <input className="form-control" value={expenseForm.supplier} onChange={e => setExpenseForm({...expenseForm, supplier: e.target.value})} placeholder="شركة التوريد..." />
                </div>
                <div className="form-group col-span-3">
                  <label className="form-label required">الوصف والتفاصيل</label>
                  <textarea className="form-control" required value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} placeholder="شراء مواسير حديد 2 بوصة، مصنعيات لحام موقع العليا..." rows={2} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowExpenseModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 تسجيل التكلفة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== PRINT MODAL ======================== */}
      {printIpc && (
        <div className="modal-overlay print-modal-overlay" onClick={() => setPrintIpc(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '2rem' }}>
          <div className="modal modal-xl print-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', background: '#fff', maxHeight: '92vh', overflowY: 'auto', borderRadius: '12px', padding: '2rem', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            <div className="modal-header print-actions" style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={() => setPrintIpc(null)}>✕ إغلاق المعاينة</button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => handleExportSingleIpcExcel(printIpc)}>📊 تصدير إلى Excel (.xlsx)</button>
                <button className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة / حفظ كـ PDF</button>
              </div>
            </div>
            
            {/* The printable sheet with A4 Template */}
            <PrintA4Template
              companyInfo={companyInfo}
              documentTitle="مستخلص مستحقات عميل (مالك المشروع)"
              refNumber={printIpc.ipc_number}
              documentSubtitle={`المشروع: ${printIpc.project_name}`}
              date={printIpc.ipc_date ? new Date(printIpc.ipc_date).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : new Date().toLocaleDateString('ar-EG', { calendar: 'gregory' })}
            >
              <div className="print-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '110px' }}>رقم المستخلص:</span>
                  <span>{printIpc.ipc_number}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '110px' }}>اسم المشروع:</span>
                  <span>{printIpc.project_name}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '110px' }}>تاريخ الإصدار:</span>
                  <span>{new Date(printIpc.ipc_date).toLocaleDateString('ar-EG', { calendar: 'gregory' })}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '110px' }}>الفترة المالية:</span>
                  <span>
                    {printIpc.period_from && printIpc.period_to 
                      ? `من ${new Date(printIpc.period_from).toLocaleDateString('ar-EG', { calendar: 'gregory' })} إلى ${new Date(printIpc.period_to).toLocaleDateString('ar-EG', { calendar: 'gregory' })}` 
                      : 'غير محددة'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '110px' }}>حالة المستخلص:</span>
                  <span>{statusLabels[printIpc.status] || printIpc.status}</span>
                </div>
              </div>

              {(() => {
                const totalWork = Number(printIpc.items_total || 0);
                const prevPayments = Number(printIpc.previous_payments || 0);
                const currentNetWork = totalWork > prevPayments ? (totalWork - prevPayments) : totalWork;
                const advAmount = Number(printIpc.advance_deduction_amount || (currentNetWork * (Number(printIpc.advance_deduction_percentage || 0) / 100)));
                const retAmount = Number(printIpc.retention_amount || (currentNetWork * (Number(printIpc.retention_percentage || 5) / 100)));
                const whtAmount = Number(printIpc.wht_amount || (currentNetWork * (Number(printIpc.wht_percentage || 1) / 100)));
                const totalDeductions = advAmount + retAmount + whtAmount;
                const netBeforeVat = currentNetWork - totalDeductions;
                const vatAmount = Number(printIpc.vat_amount || (currentNetWork * (Number(printIpc.vat_percentage || 14) / 100)));
                const finalNetPayable = netBeforeVat + vatAmount;

                return (
                  <>
                    {/* Detailed business items and quantities */}
                    {printIpcItems.length > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 'bold', color: '#1e293b', borderBottom: '2px solid #1e3a8a', paddingBottom: '0.25rem', textAlign: 'right' }}>
                          📋 جدول تفاصيل بنود الأعمال والكميات المعتمدة
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              <th style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'right' }}>البند / الوصف</th>
                              <th style={{ border: '1px solid #cbd5e1', padding: '0.5rem', width: '60px', textAlign: 'center' }}>الوحدة</th>
                              <th style={{ border: '1px solid #cbd5e1', padding: '0.5rem', width: '80px', textAlign: 'center' }}>كمية المقايسة</th>
                              <th style={{ border: '1px solid #cbd5e1', padding: '0.5rem', width: '80px', textAlign: 'center' }}>الكمية السابقة</th>
                              <th style={{ border: '1px solid #cbd5e1', padding: '0.5rem', width: '80px', textAlign: 'center' }}>الكمية الحالية</th>
                              <th style={{ border: '1px solid #cbd5e1', padding: '0.5rem', width: '80px', textAlign: 'center' }}>إجمالي الكمية</th>
                              <th style={{ border: '1px solid #cbd5e1', padding: '0.5rem', width: '90px', textAlign: 'center' }}>سعر الفئة ({currencySymbol})</th>
                              <th style={{ border: '1px solid #cbd5e1', padding: '0.5rem', width: '110px', textAlign: 'left' }}>القيمة الحالية ({currencySymbol})</th>
                            </tr>
                          </thead>
                          <tbody>
                            {printIpcItems.map((item, idx) => {
                              const lineTotal = Number(item.current_quantity || 0) * Number(item.unit_rate || 0);
                              const totalQty = Number(item.previous_quantity || 0) + Number(item.current_quantity || 0);
                              return (
                                <tr key={item.id || idx}>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'right' }}>{item.description}</td>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'center' }}>{item.unit}</td>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'center' }}>{Number(item.contract_quantity) || '-'}</td>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'center' }}>{Number(item.previous_quantity) || 0}</td>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'center', fontWeight: 'bold' }}>{Number(item.current_quantity) || 0}</td>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'center' }}>{totalQty}</td>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'center' }}>{formatCurrency(item.unit_rate)}</td>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'left', fontWeight: 'bold' }}>{formatCurrency(lineTotal)}</td>
                                </tr>
                              );
                            })}
                            <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                              <td colSpan={7} style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'right' }}>إجمالي قيمة البنود المنجزة للمستخلص الحالي</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'left' }}>{formatCurrency(totalWork)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.625rem', textAlign: 'right' }}>بيان التسوية المالية والاستقطاعات</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.625rem', width: '120px', textAlign: 'center' }}>النسبة %</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.625rem', width: '200px', textAlign: 'left' }}>المبلغ ({currencySymbol})</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>إجمالي قيمة الأعمال المنجزة حتى تاريخه تراكمياً</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'center' }}>-</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left' }}>{formatCurrency(totalWork)}</td>
                        </tr>
                        {prevPayments > 0 && (
                          <tr>
                            <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>(يطرح) إجمالي المستخلصات السابقة الصرف</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'center' }}>-</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left', color: '#dc2626' }}>({formatCurrency(prevPayments)})</td>
                          </tr>
                        )}
                        <tr style={{ backgroundColor: '#eff6ff', fontWeight: 'bold' }}>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>صافي قيمة الأعمال للمستخلص الحالي (الخام)</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'center' }}>-</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left', color: '#1e3a8a' }}>{formatCurrency(currentNetWork)}</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>(يطرح) استرداد الدفعة المقدمة</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'center' }}>{printIpc.advance_deduction_percentage || 0}%</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left', color: '#dc2626' }}>({formatCurrency(advAmount)})</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>(يطرح) خصم ضمان أعمال (Retentions - تُرد عند التسليم)</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'center' }}>{printIpc.retention_percentage || 5}%</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left', color: '#dc2626' }}>({formatCurrency(retAmount)})</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>(يطرح) خصم ضريبة أرباح تجارية وصناعية (WHT)</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'center' }}>{printIpc.wht_percentage || 1}%</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left', color: '#dc2626' }}>({formatCurrency(whtAmount)})</td>
                        </tr>
                        <tr style={{ backgroundColor: '#fef2f2', fontWeight: 600 }}>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>إجمالي الخصومات والاستقطاعات المخصومة</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'center' }}>-</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left', color: '#dc2626' }}>({formatCurrency(totalDeductions)})</td>
                        </tr>
                        <tr style={{ fontWeight: 'bold' }}>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>الصافي المستحق قبل ضريبة القيمة المضافة</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'center' }}>-</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left' }}>{formatCurrency(netBeforeVat)}</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem' }}>(يضاف) ضريبة القيمة المضافة (VAT)</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'center' }}>{printIpc.vat_percentage || 14}%</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', textAlign: 'left', color: '#16a34a' }}>+{formatCurrency(vatAmount)}</td>
                        </tr>
                        <tr style={{ backgroundColor: '#1e3a8a', color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>
                          <td style={{ border: '2px solid #1e3a8a', padding: '0.75rem' }}>إجمالي المبلغ الصافي المطالب به لشركة الرايق (المبلغ النهائي)</td>
                          <td style={{ border: '2px solid #1e3a8a', padding: '0.75rem', textAlign: 'center' }}>-</td>
                          <td style={{ border: '2px solid #1e3a8a', padding: '0.75rem', textAlign: 'left' }}>{formatCurrency(finalNetPayable)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Official Triple Signatures */}
                    <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid #cbd5e1' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b' }}>إعداد / شركة الرايق للمقاولات</div>
                        <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #94a3b8' }}>التوقيع والتاريخ</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b' }}>مراجعة / المهندس الاستشاري</div>
                        <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #94a3b8' }}>التوقيع والتاريخ</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b' }}>اعتماد / العميل (المالك)</div>
                        <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #94a3b8' }}>التوقيع والتاريخ</div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {printIpc.notes && (
                <div style={{ marginTop: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: '#1e293b' }}>ملاحظات وشروط المستخلص:</div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>{printIpc.notes}</p>
                </div>
              )}
            </PrintA4Template>

          </div>
        </div>
      )}

      {/* ======================== FINANCIAL REPORT PRINT MODAL ======================== */}
      {showPrintReportModal && (
        <div className="modal-overlay print-modal-overlay" onClick={() => setShowPrintReportModal(false)}>
          <div className="modal modal-xl print-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', background: 'var(--card-bg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header print-actions" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <div className="modal-title">🖨️ معاينة طباعة التقرير المالي الشامل</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة التقرير الآن</button>
                <button className="btn btn-ghost" onClick={() => setShowPrintReportModal(false)}>إغلاق</button>
              </div>
            </div>

            <div className="print-container" style={{ direction: 'rtl', padding: '2rem', background: '#fff', color: '#000', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <style dangerouslySetInnerHTML={{ __html: `
                @page {
                  size: A4 portrait;
                  margin: 10mm;
                }
                @media print {
                  html, body {
                    background: #fff !important;
                    color: #000 !important;
                    height: auto !important;
                    overflow: visible !important;
                  }
                  body * {
                    visibility: hidden !important;
                  }
                  .print-container, .print-container * {
                    visibility: visible !important;
                  }
                  .print-container {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    background: #fff !important;
                    color: #000 !important;
                  }
                  .print-modal-overlay {
                    position: static !important;
                    background: transparent !important;
                    padding: 0 !important;
                    backdrop-filter: none !important;
                    display: block !important;
                  }
                  .print-modal-content {
                    max-height: none !important;
                    overflow: visible !important;
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    max-width: 100% !important;
                  }
                  .print-actions {
                    display: none !important;
                  }
                }
              ` }} />

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#000', fontWeight: 700 }}>{companyInfo?.name_ar || 'مؤسسة الرايق للمقاولات الكهروميكانيكية'}</h2>
                  <div style={{ fontSize: '0.85rem', color: '#444', marginTop: '0.25rem' }}>
                    سجل تجاري: {companyInfo?.cr_number || '١٠١٠١٢٣٤٥٦'} | الرقم الضريبي: {companyInfo?.vat_number || '٣٠٠٠١٢٣٤٥٦٠٠٠٠٣'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#444' }}>العنوان: {companyInfo?.address || 'القاهرة، مصر'} | الهاتف: {companyInfo?.phone || '+20-100-000-0000'}</div>
                </div>
                <img src="/logo.jpg" alt="Logo" style={{ width: '85px', height: '85px', objectFit: 'contain' }} />
              </div>

              {/* Report Title */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', textDecoration: 'underline', color: '#000', fontWeight: 700 }}>تقرير الكشف المالي الشامل وتدفقات الحسابات</h3>
                <div style={{ fontSize: '0.9rem', color: '#555', marginTop: '0.4rem' }}>
                  فترة التقرير: <strong>{reportPeriod === 'daily' ? 'تقرير يومي' : reportPeriod === 'weekly' ? 'تقرير أسبوعي' : reportPeriod === 'monthly' ? 'تقرير شهري' : 'تقرير فترة مخصصة'}</strong> (تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')})
                </div>
              </div>

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ border: '1px solid #10b981', padding: '0.75rem', borderRadius: '6px', background: '#f0fdf4', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>إجمالي الإيرادات</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#15803d', marginTop: '0.25rem' }}>{formatCurrency(reportData?.summary?.total_revenues || 0)}</div>
                </div>
                <div style={{ border: '1px solid #ef4444', padding: '0.75rem', borderRadius: '6px', background: '#fef2f2', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 600 }}>إجمالي المصروفات</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#b91c1c', marginTop: '0.25rem' }}>{formatCurrency(reportData?.summary?.total_expenses || 0)}</div>
                </div>
                <div style={{ border: '1px solid #eab308', padding: '0.75rem', borderRadius: '6px', background: '#fefce8', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#854d0e', fontWeight: 600 }}>مستخلصات المقاولين</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a16207', marginTop: '0.25rem' }}>{formatCurrency(reportData?.summary?.total_subcontractor || 0)}</div>
                </div>
                <div style={{ border: '1px solid #3b82f6', padding: '0.75rem', borderRadius: '6px', background: '#eff6ff', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>صافي الأرباح والتدفق</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d4ed8', marginTop: '0.25rem' }}>{formatCurrency(reportData?.summary?.net_cash_flow || 0)}</div>
                </div>
              </div>

              {/* Breakdown Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'right' }}>التاريخ</th>
                    <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'right' }}>نوع الحركة</th>
                    <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'right' }}>البيان / الوصف</th>
                    <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'right' }}>المشروع / الجهة</th>
                    <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'left' }}>المبلغ ({currencySymbol})</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData?.transactions?.map((t: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ border: '1px solid #d1d5db', padding: '0.4rem' }}>{t.date ? new Date(t.date).toLocaleDateString('ar-EG') : '-'}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '0.4rem', fontWeight: 600, color: t.type === 'revenue' ? '#16a34a' : '#dc2626' }}>
                        {t.type === 'revenue' ? 'إيراد / تحصيل' : t.type === 'expense' ? 'مصروف' : 'مستخلص مقاول'}
                      </td>
                      <td style={{ border: '1px solid #d1d5db', padding: '0.4rem', fontWeight: 600 }}>{t.title || t.description}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '0.4rem' }}>{t.project_name || '-'}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '0.4rem', textAlign: 'left', fontWeight: 700, color: t.type === 'revenue' ? '#16a34a' : '#dc2626' }}>
                        {t.type === 'revenue' ? '+' : '-'}{formatCurrency(t.amount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-around', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ textAlign: 'center', width: '40%' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>توقيع المحاسب المالي</div>
                  <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #9ca3af' }}></div>
                </div>
                <div style={{ textAlign: 'center', width: '40%' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>اعتماد المدير العام</div>
                  <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #9ca3af' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================== NEW MULTI-REPORT PRINT MODAL ======================== */}
      {showPrintModal && printReportData && (
        <div className="modal-overlay print-modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="modal modal-xl print-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', background: 'var(--card-bg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header print-actions" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <div className="modal-title">🖨️ معاينة طباعة التقرير التفصيلي</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {activeReportType === 'debts_report' && printReportData?.debts && (
                  <button className="btn btn-secondary" onClick={() => handleExportDebtsExcel(printReportData.debts)}>📊 تصدير إلى Excel (.xlsx)</button>
                )}
                <button className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة التقرير الآن</button>
                <button className="btn btn-ghost" onClick={() => setShowPrintModal(false)}>إغلاق</button>
              </div>
            </div>

            <div className="print-container" style={{ direction: 'rtl', padding: '2.5rem', background: '#fff', color: '#000', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <style dangerouslySetInnerHTML={{ __html: `
                @page {
                  size: A4 portrait;
                  margin: 10mm;
                }
                @media print {
                  html, body {
                    background: #fff !important;
                    color: #000 !important;
                    height: auto !important;
                    overflow: visible !important;
                  }
                  body * {
                    visibility: hidden !important;
                  }
                  .print-container, .print-container * {
                    visibility: visible !important;
                  }
                  .print-container {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    background: #fff !important;
                    color: #000 !important;
                  }
                  .print-modal-overlay {
                    position: static !important;
                    background: transparent !important;
                    padding: 0 !important;
                    backdrop-filter: none !important;
                    display: block !important;
                  }
                  .print-modal-content {
                    max-height: none !important;
                    overflow: visible !important;
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    max-width: 100% !important;
                  }
                  .print-actions {
                    display: none !important;
                  }
                }
                .print-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 1rem;
                }
                .print-table th, .print-table td {
                  border: 1px solid #000;
                  padding: 8px;
                  text-align: right;
                  font-size: 0.9rem;
                }
                .print-table th {
                  background: #f3f4f6 !important;
                  font-weight: bold;
                }
              ` }} />

              {/* Company Letterhead */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#000', fontWeight: 700 }}>{companyInfo?.name_ar || 'مؤسسة الرايق للمقاولات الكهروميكانيكية'}</h2>
                  <div style={{ fontSize: '0.85rem', color: '#444', marginTop: '0.25rem' }}>
                    سجل تجاري: {companyInfo?.cr_number || '١٠١٠١٢٣٤٥٦'} | الرقم الضريبي: {companyInfo?.vat_number || '٣٠٠٠١٢٣٤٥٦٠٠٠٠٣'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#444' }}>العنوان: {companyInfo?.address || 'القاهرة، مصر'} | الهاتف: {companyInfo?.phone || '+20-100-000-0000'}</div>
                </div>
                <img src="/logo.jpg" alt="Logo" style={{ width: '85px', height: '85px', objectFit: 'contain' }} />
              </div>

              {/* Title Block */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ textDecoration: 'underline', fontSize: '1.3rem', margin: 0 }}>
                  {activeReportType === 'project_detail' && 'تقرير كشف حساب ومشروع تفصيلي'}
                  {activeReportType === 'projects_summary' && 'تقرير ملخص وحالة جميع المشاريع'}
                  {activeReportType === 'project_expenses' && 'تقرير مصروفات وتكاليف مشروع تفصيلي'}
                  {activeReportType === 'all_workers' && 'كشف رواتب ويوميات العمالة'}
                  {activeReportType === 'worker_ledger' && 'كشف حساب تسوية مستحقات عامل'}
                  {activeReportType === 'worker_attendance' && 'سجل حضور وحركة يوميات عامل'}
                  {activeReportType === 'supervisors' && 'كشف رواتب المشرفين والكادر الإداري'}
                  {activeReportType === 'payroll_report' && `مسير رواتب الموظفين لشهر ${reportMonthFilter}/${reportYearFilter}`}
                  {activeReportType === 'all_equipments' && 'تقرير حركة وجرد العهد والمعدات'}
                  {activeReportType === 'equipment_expenses' && 'تقرير مصروفات وتشغيل المعدات'}
                  {activeReportType === 'daily_log' && `تقرير الحركة والقيود اليومية`}
                  {activeReportType === 'monthly_log' && `تقرير الحركة والقيود الشهرية`}
                  {activeReportType === 'range_log' && `تقرير الحركة والقيود المالية للفترة المحددة`}
                  {activeReportType === 'revenues' && 'تقرير إجمالي التحصيلات والإيرادات'}
                  {activeReportType === 'profits' && 'تقرير الأرباح والخسائر والمؤشرات المالية'}
                  {activeReportType === 'cashbox' && 'تقرير حركة الخزينة والصندوق بالكامل'}
                  {activeReportType === 'debts_report' && '🏛️ تقرير مديونيات المؤسسة وقروض تمويل المشاريع'}
                </h3>
                <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.25rem' }}>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
              </div>

              {/* Report Body rendering */}

              {/* 1. Project Detail */}
              {activeReportType === 'project_detail' && printReportData.project && (
                <div>
                  <h4 style={{ margin: '0.5rem 0', fontWeight: 'bold' }}>بيانات المشروع:</h4>
                  <table className="print-table" style={{ marginBottom: '1.5rem' }}>
                    <tbody>
                      <tr>
                        <th>اسم المشروع</th>
                        <td>{printReportData.project.name}</td>
                        <th>العميل</th>
                        <td>{printReportData.project.client_name || '-'}</td>
                      </tr>
                      <tr>
                        <th>قيمة التعاقد</th>
                        <td>{formatCurrency(printReportData.project.contract_value)}</td>
                        <th>طريقة الدفع</th>
                        <td>{printReportData.project.payment_type === 'once' ? 'دفعة واحدة' : 'على دفعات'}</td>
                      </tr>
                      <tr>
                        <th>حالة المشروع</th>
                        <td>{printReportData.project.status === 'active' ? 'نشط' : 'مكتمل'}</td>
                        <th>الموقع</th>
                        <td>{printReportData.project.location || '-'}</td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 style={{ margin: '0.5rem 0', fontWeight: 'bold' }}>المؤشرات المالية للمشروع:</h4>
                  {(() => {
                    const totalExps = printReportData.expenses.reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);
                    const totalReceived = printReportData.ipcs.reduce((acc: number, i: any) => acc + Number(i.net_payable || 0), 0);
                    const contractVal = Number(printReportData.project.contract_value || 0);
                    const netMargin = contractVal - totalExps;
                    return (
                      <table className="print-table" style={{ marginBottom: '1.5rem' }}>
                        <thead>
                          <tr>
                            <th>إجمالي المصروفات الفعلي</th>
                            <th>المبالغ المستلمة من العميل</th>
                            <th>الأرباح المتوقعة (قيمة العقد - المنصرف)</th>
                            <th>نسبة الربحية</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ color: '#dc2626', fontWeight: 'bold' }}>{formatCurrency(totalExps)}</td>
                            <td style={{ color: '#16a34a', fontWeight: 'bold' }}>{formatCurrency(totalReceived)}</td>
                            <td style={{ fontWeight: 'bold', color: netMargin >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(netMargin)}</td>
                            <td style={{ fontWeight: 'bold' }}>{contractVal > 0 ? ((netMargin / contractVal) * 100).toFixed(1) + '%' : '0%'}</td>
                          </tr>
                        </tbody>
                      </table>
                    );
                  })()}

                  <h4 style={{ margin: '0.5rem 0', fontWeight: 'bold' }}>تفاصيل المصروفات التراكمية للمشروع:</h4>
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th>التاريخ</th>
                        <th>التصنيف</th>
                        <th>البيان / الوصف</th>
                        <th>المورد / المستلم</th>
                        <th>المبلغ ({currencySymbol})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printReportData.expenses.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center' }}>لا توجد مصروفات مسجلة</td></tr>
                      ) : (
                        printReportData.expenses.map((e: any, idx: number) => (
                          <tr key={idx}>
                            <td>{new Date(e.expense_date).toLocaleDateString('ar-EG')}</td>
                            <td>{e.category}</td>
                            <td>{e.description}</td>
                            <td>{e.supplier || '-'}</td>
                            <td style={{ fontWeight: 'bold' }}>{formatCurrency(e.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 2. Projects Summary */}
              {activeReportType === 'projects_summary' && (
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>اسم المشروع</th>
                      <th>العميل</th>
                      <th>الموقع</th>
                      <th>قيمة العقد</th>
                      <th>طريقة الدفع</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printReportData.projects.map((p: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                        <td>{p.client_name || '-'}</td>
                        <td>{p.location || '-'}</td>
                        <td style={{ fontWeight: 'bold' }}>{formatCurrency(p.contract_value)}</td>
                        <td>{p.payment_type === 'once' ? 'دفعة واحدة' : 'على دفعات'}</td>
                        <td>{p.status === 'active' ? 'نشط' : 'مكتمل'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 3. Project Expenses */}
              {activeReportType === 'project_expenses' && (
                <div>
                  <h4 style={{ marginBottom: '0.5rem' }}>بيان مصروفات المشروع: {printReportData.project?.name}</h4>
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th>التاريخ</th>
                        <th>التصنيف</th>
                        <th>البيان</th>
                        <th>المورد / الجهة</th>
                        <th>المبلغ ({currencySymbol})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printReportData.expenses.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center' }}>لا توجد مصروفات</td></tr>
                      ) : (
                        printReportData.expenses.map((e: any, idx: number) => (
                          <tr key={idx}>
                            <td>{new Date(e.expense_date).toLocaleDateString('ar-EG')}</td>
                            <td>{e.category}</td>
                            <td>{e.description}</td>
                            <td>{e.supplier || '-'}</td>
                            <td style={{ fontWeight: 'bold' }}>{formatCurrency(e.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 4. All Workers & 7. Supervisors */}
              {(activeReportType === 'all_workers' || activeReportType === 'supervisors') && (
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>الرقم الوظيفي</th>
                      <th>اسم الموظف</th>
                      <th>المسمى الوظيفي</th>
                      <th>نوع التوظيف</th>
                      <th>الراتب الأساسي/اليومية</th>
                      <th>رقم الهاتف</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printReportData.employees.map((e: any, idx: number) => (
                      <tr key={idx}>
                        <td>{e.employee_number}</td>
                        <td style={{ fontWeight: 'bold' }}>{e.full_name}</td>
                        <td>{e.job_title}</td>
                        <td>{e.employment_type === 'daily' ? 'يومية' : 'شهري'}</td>
                        <td style={{ fontWeight: 'bold' }}>{formatCurrency(e.base_salary)}</td>
                        <td>{e.phone || '-'}</td>
                        <td>{e.status === 'active' ? 'نشط' : 'غير نشط'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 5. Worker Ledger */}
              {activeReportType === 'worker_ledger' && printReportData.employee && (
                <div>
                  <table className="print-table" style={{ marginBottom: '1.5rem' }}>
                    <tbody>
                      <tr>
                        <th>اسم العامل</th>
                        <td style={{ fontWeight: 'bold' }}>{printReportData.employee.full_name}</td>
                        <th>المسمى الوظيفي</th>
                        <td>{printReportData.employee.job_title}</td>
                      </tr>
                      <tr>
                        <th>الرقم الوظيفي</th>
                        <td>{printReportData.employee.employee_number}</td>
                        <th>فترة الحساب</th>
                        <td>من {reportStartDate || 'البداية'} إلى {reportEndDate || 'اليوم'}</td>
                      </tr>
                    </tbody>
                  </table>

                  {(() => {
                    const baseDaily = Number(printReportData.employee.base_salary || 0);
                    const isDaily = printReportData.employee.employment_type === 'daily';
                    const dailyRate = isDaily ? baseDaily : (baseDaily / 30);
                    
                    const presentDays = printReportData.attendance.filter((a: any) => a.attendance_type === 'present' || a.attendance_type === 'late').length;
                    const halfDays = printReportData.attendance.filter((a: any) => a.attendance_type === 'half_day').length;
                    
                    const totalOtHours = printReportData.attendance.reduce((acc: number, a: any) => acc + Number(a.overtime_hours || 0), 0);
                    const wagesEarned = (presentDays * dailyRate) + (halfDays * (dailyRate / 2));
                    const otEarned = totalOtHours * 25; // 25 per hour
                    const totalEarned = wagesEarned + otEarned;

                    const totalLoans = printReportData.loans.reduce((acc: number, l: any) => acc + Number(l.amount || 0), 0);
                    const paidLoans = printReportData.loans.reduce((acc: number, l: any) => acc + Number(l.paid_amount || 0), 0);
                    const remainingLoans = totalLoans - paidLoans;

                    const netDue = totalEarned - remainingLoans;

                    return (
                      <>
                        <h4 style={{ margin: '0.5rem 0', fontWeight: 'bold' }}>ملخص تسوية الحساب المالي:</h4>
                        <table className="print-table" style={{ marginBottom: '1.5rem' }}>
                          <thead>
                            <tr>
                              <th>أيام الحضور (يومية كاملة)</th>
                              <th>أيام الحضور (نصف يومية)</th>
                              <th>ساعات العمل الإضافي</th>
                              <th>إجمالي الأجور المستحقة</th>
                              <th>سُلف وقروض متبقية</th>
                              <th>صافي المبلغ المستحق للصرف</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>{presentDays} أيام</td>
                              <td>{halfDays} أيام</td>
                              <td>{totalOtHours} ساعات</td>
                              <td style={{ color: '#16a34a', fontWeight: 'bold' }}>{formatCurrency(totalEarned)}</td>
                              <td style={{ color: '#dc2626', fontWeight: 'bold' }}>{formatCurrency(remainingLoans)}</td>
                              <td style={{ fontWeight: 'bold', fontSize: '1.05rem', textDecoration: 'underline' }}>{formatCurrency(netDue)}</td>
                            </tr>
                          </tbody>
                        </table>

                        <h4 style={{ margin: '0.5rem 0', fontWeight: 'bold' }}>سجل تفاصيل الحضور خلال الفترة:</h4>
                        <table className="print-table">
                          <thead>
                            <tr>
                              <th>التاريخ</th>
                              <th>المشروع / الموقع</th>
                              <th>حالة الحضور</th>
                              <th>ساعات إضافي</th>
                              <th>أجر اليومية</th>
                            </tr>
                          </thead>
                          <tbody>
                            {printReportData.attendance.map((a: any, idx: number) => {
                              let dayCost = 0;
                              if (a.attendance_type === 'present' || a.attendance_type === 'late') {
                                dayCost = dailyRate + (Number(a.overtime_hours || 0) * 25);
                              } else if (a.attendance_type === 'half_day') {
                                dayCost = (dailyRate / 2) + (Number(a.overtime_hours || 0) * 25);
                              }
                              return (
                                <tr key={idx}>
                                  <td>{new Date(a.attendance_date).toLocaleDateString('ar-EG')}</td>
                                  <td>{a.project_name || 'المكتب الرئيسي'}</td>
                                  <td>
                                    {a.attendance_type === 'present' ? 'حاضر' : a.attendance_type === 'half_day' ? 'نصف يومية' : a.attendance_type === 'late' ? 'متأخر' : 'غياب'}
                                  </td>
                                  <td>{a.overtime_hours || 0} س</td>
                                  <td style={{ fontWeight: 'bold' }}>{formatCurrency(dayCost)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* 6. Worker Attendance */}
              {activeReportType === 'worker_attendance' && printReportData.employee && (
                <div>
                  <h4 style={{ marginBottom: '0.5rem' }}>حضور الموظف: {printReportData.employee.full_name} ({printReportData.employee.job_title})</h4>
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th>التاريخ</th>
                        <th>المشروع / الموقع</th>
                        <th>الحالة</th>
                        <th>وقت الدخول</th>
                        <th>وقت الخروج</th>
                        <th>ساعات إضافي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printReportData.attendance.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center' }}>لا توجد سجلات حضور مسجلة</td></tr>
                      ) : (
                        printReportData.attendance.map((a: any, idx: number) => (
                          <tr key={idx}>
                            <td>{new Date(a.attendance_date).toLocaleDateString('ar-EG')}</td>
                            <td>{a.project_name || 'المكتب الرئيسي'}</td>
                            <td>{a.attendance_type === 'present' ? 'حاضر' : a.attendance_type === 'late' ? 'متأخر' : 'غياب'}</td>
                            <td>{formatTimeDisplay(a.check_in_time)}</td>
                            <td>{formatTimeDisplay(a.check_out_time)}</td>
                            <td style={{ fontWeight: 'bold' }}>{a.overtime_hours || 0} ساعة</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 8. Payroll Report */}
              {activeReportType === 'payroll_report' && (
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>اسم الموظف</th>
                      <th>الراتب الأساسي</th>
                      <th>البدلات (سكن+نقل)</th>
                      <th>أجر الإضافي</th>
                      <th>الخصومات</th>
                      <th>صافي الراتب المستحق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printReportData.payroll.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center' }}>لا توجد بيانات مسيرة لهذا الشهر</td></tr>
                    ) : (
                      printReportData.payroll.map((p: any, idx: number) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 'bold' }}>{p.employee_name}</td>
                          <td>{formatCurrency(p.base_salary)}</td>
                          <td>{formatCurrency(Number(p.housing_allowance || 0) + Number(p.transport_allowance || 0))}</td>
                          <td style={{ color: '#16a34a' }}>+{formatCurrency(p.overtime_amount)}</td>
                          <td style={{ color: '#dc2626' }}>-{formatCurrency(p.deductions)}</td>
                          <td style={{ fontWeight: 'bold' }}>{formatCurrency(p.net_salary)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* 9. All Equipments & 10. Equipment Expenses */}
              {(activeReportType === 'all_equipments' || activeReportType === 'equipment_expenses') && (
                <div>
                  <h4 style={{ margin: '0.5rem 0', fontWeight: 'bold' }}>حالة العهد والمعدات الفنية:</h4>
                  <table className="print-table" style={{ marginBottom: '1.5rem' }}>
                    <thead>
                      <tr>
                        <th>كود العهدة</th>
                        <th>اسم العهدة / المعدة</th>
                        <th>الماركة</th>
                        <th>المستلم الحالي</th>
                        <th>الموقع الحالي</th>
                        <th>الحالة الفنية</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printReportData.assets.map((a: any, idx: number) => (
                        <tr key={idx}>
                          <td>{a.asset_code}</td>
                          <td style={{ fontWeight: 'bold' }}>{a.asset_name}</td>
                          <td>{a.brand || '-'}</td>
                          <td>{a.employee_name || 'بالمستودع'}</td>
                          <td>{a.project_name || '-'}</td>
                          <td>{a.condition}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <h4 style={{ margin: '0.5rem 0', fontWeight: 'bold' }}>سجل مصروفات وتشغيل المعدات:</h4>
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th>التاريخ</th>
                        <th>المعدة / التفاصيل</th>
                        <th>الوصف / المستلم</th>
                        <th>المبلغ ({currencySymbol})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printReportData.expenses.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center' }}>لا توجد مصروفات مسجلة للمعدات</td></tr>
                      ) : (
                        printReportData.expenses.map((e: any, idx: number) => (
                          <tr key={idx}>
                            <td>{new Date(e.expense_date).toLocaleDateString('ar-EG')}</td>
                            <td style={{ fontWeight: 'bold' }}>{e.supplier || 'مصروف عام معدات'}</td>
                            <td>{e.description}</td>
                            <td style={{ fontWeight: 'bold', color: '#dc2626' }}>{formatCurrency(e.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 11. Daily / Monthly / Range Logs */}
              {(activeReportType === 'daily_log' || activeReportType === 'monthly_log' || activeReportType === 'range_log') && (
                <div>
                  <h4 style={{ marginBottom: '0.5rem' }}>بيان العمليات والقيود المالية المنجزة:</h4>
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th>التاريخ</th>
                        <th>النوع</th>
                        <th>البيان / الوصف</th>
                        <th>المبلغ ({currencySymbol})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printReportData.expenses.map((e: any, idx: number) => (
                        <tr key={idx}>
                          <td>{new Date(e.expense_date).toLocaleDateString('ar-EG')}</td>
                          <td style={{ color: '#dc2626', fontWeight: 600 }}>مصروفات 🔴</td>
                          <td>{e.description} ({e.category})</td>
                          <td style={{ fontWeight: 'bold' }}>-{formatCurrency(e.amount)}</td>
                        </tr>
                      ))}
                      {printReportData.ipcs.map((i: any, idx: number) => (
                        <tr key={idx}>
                          <td>{new Date(i.ipc_date || new Date()).toLocaleDateString('ar-EG')}</td>
                          <td style={{ color: '#16a34a', fontWeight: 600 }}>إيراد / مستخلص عميل 🟢</td>
                          <td>{i.notes || `مستخلص رقم ${i.ipc_number || ''}`}</td>
                          <td style={{ fontWeight: 'bold', color: '#16a34a' }}>+{formatCurrency(i.net_payable)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 14. Revenues, 15. Profits, 16. Treasury */}
              {(activeReportType === 'revenues' || activeReportType === 'profits' || activeReportType === 'cashbox') && printReportData.report && (
                <div>
                  <table className="print-table" style={{ marginBottom: '1.5rem' }}>
                    <thead>
                      <tr>
                        <th>البند المالي</th>
                        <th>الرصيد والقيمة بالـ ({currencySymbol})</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th>إجمالي المقبوضات والإيرادات</th>
                        <td style={{ color: '#16a34a', fontWeight: 'bold' }}>{formatCurrency(printReportData.report.summary?.total_revenues ?? printReportData.report.summary?.totalRevenues ?? 0)}</td>
                      </tr>
                      <tr>
                        <th>إجمالي النفقات والمصروفات</th>
                        <td style={{ color: '#dc2626', fontWeight: 'bold' }}>{formatCurrency(printReportData.report.summary?.total_expenses ?? printReportData.report.summary?.totalExpenses ?? 0)}</td>
                      </tr>
                      <tr>
                        <th>تمويلات مقاولي الباطن المسددة</th>
                        <td style={{ color: '#f59e0b', fontWeight: 'bold' }}>{formatCurrency(printReportData.report.summary?.total_subcontractor ?? printReportData.report.summary?.totalSubcontractor ?? 0)}</td>
                      </tr>
                      <tr style={{ background: '#f0fdf4', fontSize: '1.1rem' }}>
                        <th>صافي أرباح ورصيد الصندوق المتاح</th>
                        <td style={{ fontWeight: 'bold', color: '#16a34a' }}>{formatCurrency(printReportData.report.summary?.net_cash_flow ?? printReportData.report.summary?.netCashFlow ?? 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* 17. Debts & Project Financing Report */}
              {activeReportType === 'debts_report' && printReportData.debts && (
                <div>
                  {/* Summary Box */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.25rem', border: '1px solid #000', padding: '0.75rem', borderRadius: '4px', background: '#f8fafc' }}>
                    <div><strong>إجمالي التزامات والتمويل:</strong> {formatCurrency(printReportData.debts.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0))}</div>
                    <div><strong>إجمالي المسدد:</strong> <span style={{ color: '#16a34a' }}>{formatCurrency(printReportData.debts.reduce((sum: number, d: any) => sum + Number(d.paid_amount || 0), 0))}</span></div>
                    <div><strong>المتبقي المطلوب سداده:</strong> <span style={{ color: '#dc2626' }}>{formatCurrency(printReportData.debts.reduce((sum: number, d: any) => sum + (Number(d.amount || 0) - Number(d.paid_amount || 0)), 0))}</span></div>
                    <div><strong>عدد السجلات والالتزامات:</strong> {printReportData.debts.length} بند</div>
                  </div>

                  <table className="print-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'center', width: '35px' }}>م</th>
                        <th>الجهة الدائنة / المقرض</th>
                        <th>نوع الالتزام</th>
                        <th>المشروع الممول / المرتبط</th>
                        <th>القيمة الإجمالية ({currencySymbol})</th>
                        <th>تاريخ الاستحقاق</th>
                        <th>المسدد ({currencySymbol})</th>
                        <th>المتبقي ({currencySymbol})</th>
                        <th style={{ textAlign: 'center' }}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printReportData.debts.length === 0 ? (
                        <tr><td colSpan={9} style={{ textAlign: 'center' }}>لا توجد مديونيات أو قروض مسجلة لهذه الفئة</td></tr>
                      ) : (
                        printReportData.debts.map((d: any, idx: number) => {
                          const remaining = Number(d.amount || 0) - Number(d.paid_amount || 0);
                          const debtTypeMap: Record<string, string> = { project_finance: 'قرض تمويل مشروع', subcontractor_ipc: 'مستخلص مقاول باطن', supplier_invoice: 'فاتورة توريد', other: 'التزام آخر' };
                          const statusMap: Record<string, string> = { paid: 'مسدد بالكامل', partially_paid: 'مسدد جزئياً', unpaid: 'غير مسدد' };
                          return (
                            <tr key={idx}>
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                              <td style={{ fontWeight: 'bold' }}>{d.creditor_name}</td>
                              <td>{debtTypeMap[d.debt_type] || d.debt_type}</td>
                              <td>{d.project_name || 'عام / غير محدد'}</td>
                              <td style={{ fontWeight: 'bold' }}>{formatCurrency(d.amount)}</td>
                              <td>{d.due_date ? new Date(d.due_date).toLocaleDateString('ar-EG', { calendar: 'gregory' }) : '-'}</td>
                              <td style={{ color: '#16a34a', fontWeight: 'bold' }}>{formatCurrency(d.paid_amount)}</td>
                              <td style={{ color: '#dc2626', fontWeight: 'bold' }}>{formatCurrency(remaining)}</td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{statusMap[d.status] || d.status}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Signatures */}
              <div style={{ marginTop: '3.5rem', display: 'flex', justifyContent: 'space-around', paddingTop: '1rem', borderTop: '1px solid #000' }}>
                <div style={{ textAlign: 'center', width: '40%' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>توقيع المسؤول المالي</div>
                  <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #000' }}></div>
                </div>
                <div style={{ textAlign: 'center', width: '40%' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>اعتماد وتوقيع المدير العام</div>
                  <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #000' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================== MODAL: ISSUE CUSTODY ======================== */}
      {showCustodyModal && (
        <div className="modal-overlay" onClick={() => setShowCustodyModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">💵 تسليم عُهدة نقدية لمهندس الموقع</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCustodyModal(false)}>✕</button>
            </div>
            <form onSubmit={handleIssueCustody}>
              <div className="form-grid form-grid-2">
                <div className="form-group col-span-2">
                  <label className="form-label required">مهندس الموقع المستلم العُهدة</label>
                  <select className="form-control" required value={custodyForm.engineer_id} onChange={e => setCustodyForm({...custodyForm, engineer_id: e.target.value})}>
                    <option value="">-- اختر المهندس --</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.job_title})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">المبلغ النقدية المسلمة ({currencySymbol})</label>
                  <input className="form-control" type="number" step="any" required value={custodyForm.amount} onChange={e => setCustodyForm({...custodyForm, amount: e.target.value})} placeholder="5000..." />
                </div>
                <div className="form-group">
                  <label className="form-label">المشروع المرتبط (اختياري)</label>
                  <select className="form-control" value={custodyForm.project_id} onChange={e => setCustodyForm({...custodyForm, project_id: e.target.value})}>
                    <option value="">عُهدة عامة (غير مخصصة لمشروع بعينه)</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">ملاحظات تسليم العُهدة</label>
                  <textarea className="form-control" rows={2} value={custodyForm.notes} onChange={e => setCustodyForm({...custodyForm, notes: e.target.value})} placeholder="تسليم نقدية لمصاريف النثريات ومستلزمات الموقع طارئة..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCustodyModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 تسليم العُهدة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: SUBMIT CLAIM WITH RECEIPT PHOTO ======================== */}
      {showClaimModal && (
        <div className="modal-overlay" onClick={() => setShowClaimModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📸 رفع فاتورة / إيصال عُهدة نقدية بالموبايل</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowClaimModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitClaim}>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label required">المهندس مقدم الفاتورة</label>
                  <select className="form-control" required value={claimForm.engineer_id} onChange={e => setClaimForm({...claimForm, engineer_id: e.target.value})}>
                    <option value="">-- اختر المهندس --</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">المشروع المراد تحميل التكلفة عليه</label>
                  <select className="form-control" required value={claimForm.project_id} onChange={e => setClaimForm({...claimForm, project_id: e.target.value})}>
                    <option value="">-- اختر المشروع --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label required">الوصف والبيان بالفاتورة</label>
                  <input className="form-control" required value={claimForm.description} onChange={e => setClaimForm({...claimForm, description: e.target.value})} placeholder="شراء صمامات طارئة / نقل عمالة / أدوات حفر..." />
                </div>
                <div className="form-group">
                  <label className="form-label required">مبلغ الفاتورة ({currencySymbol})</label>
                  <input className="form-control" type="number" step="any" required value={claimForm.amount} onChange={e => setClaimForm({...claimForm, amount: e.target.value})} placeholder="250..." />
                </div>
                <div className="form-group">
                  <label className="form-label">بند المصروف</label>
                  <select className="form-control" value={claimForm.category} onChange={e => setClaimForm({...claimForm, category: e.target.value})}>
                    <option value="material">مواد وخامات مباشرة</option>
                    <option value="transport">نقل وشحن ومواصلات</option>
                    <option value="equipment">عَدَد وأدوات صيانة</option>
                    <option value="labor">إعاشات ومكافآت عمالة</option>
                    <option value="overhead">نثريات ومصروفات إدارية</option>
                    <option value="other">مصروفات أخرى</option>
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">📷 صورة الفاتورة / الإيصال الورقي (من كاميرا الموبايل)</label>
                  <input
                    className="form-control"
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setClaimForm({...claimForm, receipt_image_url: reader.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {claimForm.receipt_image_url && (
                    <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                      <img src={claimForm.receipt_image_url} alt="معاينة الإيصال" style={{ maxHeight: '120px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowClaimModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">📸 إرسال الفاتورة للاعتماد والتوزيع</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: VIEW RECEIPT PHOTO ======================== */}
      {selectedReceiptUrl && (
        <div className="modal-overlay" onClick={() => setSelectedReceiptUrl(null)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🖼️ معاينة صورة الإيصال الورقي للفاتورة</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedReceiptUrl(null)}>✕</button>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <img src={selectedReceiptUrl} alt="صورة الفاتورة المرفوعة" style={{ maxWidth: '100%', maxHeight: '450px', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setSelectedReceiptUrl(null)}>إغلاق المعاينة</button>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
