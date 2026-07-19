'use client';

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';
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

type TabType = 'ipc' | 'expenses' | 'cashflow' | 'debts' | 'reports';

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setCurrencySymbol(localStorage.getItem('system_currency_symbol') || 'ج.م');
    }
  }, []);

  const [activeTab, setActiveTab] = useState<TabType>('ipc');

  useEffect(() => {
    const syncTab = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab && ['ipc', 'expenses', 'cashflow', 'debts', 'reports'].includes(tab)) {
          setActiveTab(tab as TabType);
        }
      }
    };
    syncTab();
    const interval = setInterval(syncTab, 200);
    return () => clearInterval(interval);
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

  // Forms
  const [ipcForm, setIpcForm] = useState({
    project_id: '', ipc_number: '', period_from: '', period_to: '',
    items_total: '', vat_percentage: '15', retention_percentage: '10', notes: '', previous_payments: ''
  });

  const [expenseForm, setExpenseForm] = useState({
    project_id: '', category: 'material', description: '', amount: '', supplier: '', invoice_number: ''
  });

  const [debtForm, setDebtForm] = useState({
    creditor_name: '', debt_type: 'project_finance', project_id: '', amount: '', due_date: '', notes: ''
  });


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
      setCashflow(data && Array.isArray(data.data) ? data.data : []);
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
      const validTabs: TabType[] = ['ipc', 'expenses', 'cashflow', 'debts', 'reports'];
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
    if (activeTab === 'reports') fetchFinancialReport();
  }, [activeTab, fetchIPCs, fetchExpenses, fetchCashflow, fetchDebts, fetchFinancialReport]);

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
          previous_payments: Number(ipcForm.previous_payments) || 0,
          notes: ipcForm.notes || '',
          status: editingIpc ? editingIpc.status : 'draft'
        })
      });
      if (res.ok) {
        setShowIpcModal(false);
        setEditingIpc(null);
        setIpcForm({
          project_id: '', ipc_number: '', period_from: '', period_to: '',
          items_total: '', vat_percentage: '15', retention_percentage: '10', notes: '', previous_payments: ''
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

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: expenseForm.project_id || null,
          category: expenseForm.category,
          description: expenseForm.description || '',
          expense_date: new Date().toISOString().split('T')[0],
          amount: Number(expenseForm.amount) || 0,
          vendor: expenseForm.supplier || null,
          invoice_number: expenseForm.invoice_number || null
        })
      });
      if (res.ok) {
        setShowExpenseModal(false);
        setExpenseForm({
          project_id: '', category: 'material', description: '', amount: '', supplier: '', invoice_number: ''
        });
        fetchExpenses();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء إضافة المصروف: ${errData.error || 'فشلت عملية الإضافة'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
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
        <button className={`tab-btn ${activeTab === 'ipc' ? 'active' : ''}`} onClick={() => setActiveTab('ipc')}>📄 مستخلصات العميل</button>
        <button className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>🧾 مصروفات المشاريع</button>
        <button className={`tab-btn ${activeTab === 'cashflow' ? 'active' : ''}`} onClick={() => setActiveTab('cashflow')}>📈 التدفق النقدي والربحية</button>
        <button className={`tab-btn ${activeTab === 'debts' ? 'active' : ''}`} onClick={() => setActiveTab('debts')}>🏛️ المديونيات وتمويل المشاريع</button>
        <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>📊 التقارير المالية والطباعة</button>
      </div>


      {/* ======================== TAB: CLIENT IPCs ======================== */}
      {activeTab === 'ipc' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">📄 مستخلصات العميل المعتمدة</div>
              <div className="page-description">إصدار ومتابعة مستحقات الشركة لدى ملاك المشاريع بناءً على الكميات المعتمدة</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowIpcModal(true)}>+ إصدار مستخلص جديد</button>
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
                        <td>{new Date(ipc.ipc_date).toLocaleDateString('ar-SA')}</td>
                        <td>{formatCurrency(ipc.items_total)}</td>
                        <td>{formatCurrency(ipc.vat_amount)}</td>
                        <td style={{ color: 'var(--status-warning)' }}>{formatCurrency(ipc.retention_amount)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--status-success)' }}>{formatCurrency(ipc.net_payable)}</td>
                        <td><span className={`badge ${statusBadge[ipc.status] || 'badge-muted'}`}>{statusLabels[ipc.status] || ipc.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-ghost text-primary btn-sm"
                              onClick={() => {
                                setEditingIpc(ipc);
                                setIpcForm({
                                  project_id: ipc.project_id || '',
                                  ipc_number: ipc.ipc_number,
                                  period_from: ipc.period_from ? new Date(ipc.period_from).toISOString().split('T')[0] : '',
                                  period_to: ipc.period_to ? new Date(ipc.period_to).toISOString().split('T')[0] : '',
                                  items_total: ipc.items_total,
                                  vat_percentage: ipc.vat_percentage || '15',
                                  retention_percentage: ipc.retention_percentage || '10',
                                  notes: ipc.notes || '',
                                  previous_payments: ipc.previous_payments || ''
                                });
                                setShowIpcModal(true);
                              }}
                              title="تعديل"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-ghost text-success btn-sm"
                              onClick={() => setPrintIpc(ipc)}
                              title="طباعة"
                            >
                              🖨️
                            </button>
                            <button
                              className="btn btn-ghost text-danger btn-sm"
                              onClick={() => handleDeleteIPC(ipc.id)}
                              title="حذف"
                            >
                              🗑️
                            </button>
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
              <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)}>+ تسجيل مصروف جديد</button>
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
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id}>
                        <td>{new Date(e.expense_date).toLocaleDateString('ar-SA')}</td>
                        <td style={{ fontWeight: 600 }}>{e.project_name}</td>
                        <td><span className="badge badge-purple">{categoryLabels[e.category] || e.category}</span></td>
                        <td style={{ color: 'var(--text-primary)' }}>{e.description}</td>
                        <td>{e.supplier || '-'}</td>
                        <td>{e.invoice_number || '-'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--status-danger)' }}>{formatCurrency(e.amount)}</td>
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
            <button className="btn btn-primary" onClick={() => setShowDebtModal(true)}>➕ تسجيل التزام / قرض جديد</button>
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
                          <td>{d.due_date ? new Date(d.due_date).toLocaleDateString('ar-SA') : '-'}</td>
                          <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{formatCurrency(d.paid_amount)}</td>
                          <td style={{ color: 'var(--status-danger)', fontWeight: 600 }}>{formatCurrency(remaining)}</td>
                          <td>
                            <span className={`badge ${d.status === 'paid' ? 'badge-success' : d.status === 'partially_paid' ? 'badge-warning' : 'badge-danger'}`}>
                              {d.status === 'paid' ? 'مسدد بالكامل' : d.status === 'partially_paid' ? 'مسدد جزئياً' : 'غير مسدد'}
                            </span>
                          </td>
                          <td>
                            {d.status !== 'paid' && (
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
                    {formatCurrency(reportData.summary?.total_revenues || 0)}
                  </div>
                  <div className="stat-label">إجمالي الإيرادات والتحصيلات ({currencySymbol})</div>
                </div>

                <div className="stat-card danger">
                  <div className="stat-card-icon">💸</div>
                  <div className="stat-value" style={{ fontSize: '1.4rem' }}>
                    {formatCurrency(reportData.summary?.total_expenses || 0)}
                  </div>
                  <div className="stat-label">إجمالي المصروفات والنفقات ({currencySymbol})</div>
                </div>

                <div className="stat-card warning">
                  <div className="stat-card-icon">🤝</div>
                  <div className="stat-value" style={{ fontSize: '1.4rem' }}>
                    {formatCurrency(reportData.summary?.total_subcontractor || 0)}
                  </div>
                  <div className="stat-label">مستخلصات مقاولي الباطن ({currencySymbol})</div>
                </div>

                <div className="stat-card purple">
                  <div className="stat-card-icon">⚖️</div>
                  <div className="stat-value" style={{ fontSize: '1.4rem', color: (reportData.summary?.net_cash_flow || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                    {formatCurrency(reportData.summary?.net_cash_flow || 0)}
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
                  <div><strong>إجمالي الإيرادات:</strong> {formatCurrency(reportData.summary?.total_revenues || 0)}</div>
                  <div><strong>إجمالي المصروفات:</strong> {formatCurrency(reportData.summary?.total_expenses || 0)}</div>
                  <div><strong>مستخلصات المقاولين:</strong> {formatCurrency(reportData.summary?.total_subcontractor || 0)}</div>
                  <div><strong>صافي الأرباح/التدفق:</strong> {formatCurrency(reportData.summary?.net_cash_flow || 0)}</div>
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


      {/* ======================== MODAL: ADD DEBT ======================== */}
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
          setIpcForm({
            project_id: '', ipc_number: '', period_from: '', period_to: '',
            items_total: '', vat_percentage: '15', retention_percentage: '10', notes: '', previous_payments: ''
          });
        }}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingIpc ? '✏️ تعديل مستخلص عميل' : '📄 إصدار مستخلص عميل جديد'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => {
                setShowIpcModal(false);
                setEditingIpc(null);
                setIpcForm({
                  project_id: '', ipc_number: '', period_from: '', period_to: '',
                  items_total: '', vat_percentage: '15', retention_percentage: '10', notes: '', previous_payments: ''
                });
              }}>✕</button>
            </div>
            <form onSubmit={handleCreateIpc}>
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
                  <input className="form-control" type="number" value={ipcForm.vat_percentage} onChange={e => setIpcForm({...ipcForm, vat_percentage: e.target.value})} placeholder="15" />
                </div>
                <div className="form-group">
                  <label className="form-label">نسبة استقطاع الضمان %</label>
                  <input className="form-control" type="number" value={ipcForm.retention_percentage} onChange={e => setIpcForm({...ipcForm, retention_percentage: e.target.value})} placeholder="10" />
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
                {ipcForm.items_total && (
                  <div className="alert alert-info" style={{ marginTop: '0.75rem', gridColumn: 'span 3' }}>
                    💡 <strong>الصافي التقديري المستحق:</strong> {formatCurrency(
                      Number(ipcForm.items_total) + 
                      (Number(ipcForm.items_total) * (Number(ipcForm.vat_percentage || 0) / 100)) - 
                      (Number(ipcForm.items_total) * (Number(ipcForm.retention_percentage || 0) / 100)) - 
                      Number(ipcForm.previous_payments || 0)
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => {
                  setShowIpcModal(false);
                  setEditingIpc(null);
                  setIpcForm({
                    project_id: '', ipc_number: '', period_from: '', period_to: '',
                    items_total: '', vat_percentage: '15', retention_percentage: '10', notes: '', previous_payments: ''
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
        <div className="modal-overlay print-modal-overlay" onClick={() => setPrintIpc(null)}>
          <div className="modal modal-xl print-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', background: 'var(--card-bg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header print-actions" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <div className="modal-title">🖨️ معاينة طباعة المستخلص</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة المستخلص</button>
                <button className="btn btn-ghost" onClick={() => setPrintIpc(null)}>إغلاق</button>
              </div>
            </div>
            
            {/* The printable sheet */}
            <div className="print-container" style={{ direction: 'rtl', padding: '1.5rem', background: '#fff', color: '#000', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minHeight: 'auto' }}>
              {/* Style element inside to style print */}
              <style dangerouslySetInnerHTML={{ __html: `
                @page {
                  size: A4;
                  margin: 10mm;
                }
                @media print {
                  html, body {
                    height: 99%;
                    overflow: hidden;
                  }
                  body * {
                    visibility: hidden;
                  }
                  .print-container, .print-container * {
                    visibility: visible !important;
                  }
                  .print-container {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
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
                    animation: none !important;
                  }
                  .print-actions, .modal-header, .tabs, .sidebar, .header, .btn, .nav, .modal-overlay:not(.print-modal-overlay) {
                    display: none !important;
                  }
                }
                .print-header {
                  display: flex;
                  justify-content: space-between;
                  border-bottom: 2px solid #000;
                  padding-bottom: 0.5rem;
                  margin-bottom: 1rem;
                }
                .print-company-info {
                  text-align: right;
                }
                .print-company-title {
                  font-size: 1.25rem;
                  font-weight: bold;
                  margin-bottom: 0.25rem;
                }
                .print-document-title {
                  font-size: 1.5rem;
                  font-weight: bold;
                  text-align: center;
                  margin: 1rem 0;
                  text-decoration: underline;
                }
                .print-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 0.75rem;
                  margin-bottom: 1.25rem;
                  font-size: 0.95rem;
                }
                .print-grid-item {
                  display: flex;
                  gap: 0.5rem;
                }
                .print-grid-label {
                  font-weight: bold;
                  min-width: 110px;
                }
                .print-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 1.25rem;
                }
                .print-table th, .print-table td {
                  border: 1px solid #000;
                  padding: 0.5rem 0.75rem;
                  text-align: right;
                  font-size: 0.95rem;
                }
                .print-table th {
                  background-color: #f2f2f2;
                  font-weight: bold;
                }
                .print-footer {
                  margin-top: 2.5rem;
                  display: flex;
                  justify-content: space-between;
                }
                .print-signature-box {
                  text-align: center;
                  width: 200px;
                  font-size: 0.95rem;
                }
                .print-signature-line {
                  margin-top: 2.5rem;
                  border-top: 1px dashed #000;
                }
              ` }} />

              <div className="print-header">
                <div className="print-company-info">
                  <div className="print-company-title">{companyInfo?.name_ar || 'الرايق للمقاولات الكهروميكانيكية'}</div>
                  <div>سجل تجاري: {companyInfo?.cr_number || '١٠١٠١٢٣٤٥٦'}</div>
                  <div>الرقم الضريبي: {companyInfo?.vat_number || '٣٠٠٠١٢٣٤٥٦٠٠٠٠٣'}</div>
                </div>
                <div style={{ textAlign: 'left', fontSize: '0.9rem' }}>
                  <div>العنوان: {companyInfo?.address || 'القاهرة، مصر'}</div>
                  <div>الهاتف: {companyInfo?.phone || '+20-100-000-0000'}</div>
                  <div>البريد: {companyInfo?.email || 'info@alrayeq.com'}</div>
                </div>
              </div>

              <div className="print-document-title">مستخلص مستحقات عميل</div>

              <div className="print-grid">
                <div className="print-grid-item">
                  <span className="print-grid-label">رقم المستخلص:</span>
                  <span>{printIpc.ipc_number}</span>
                </div>
                <div className="print-grid-item">
                  <span className="print-grid-label">المشروع:</span>
                  <span>{printIpc.project_name}</span>
                </div>
                <div className="print-grid-item">
                  <span className="print-grid-label">تاريخ الإصدار:</span>
                  <span>{new Date(printIpc.ipc_date).toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="print-grid-item">
                  <span className="print-grid-label">الفترة المالية:</span>
                  <span>
                    {printIpc.period_from && printIpc.period_to 
                      ? `من ${new Date(printIpc.period_from).toLocaleDateString('ar-EG')} إلى ${new Date(printIpc.period_to).toLocaleDateString('ar-EG')}` 
                      : 'غير محددة'}
                  </span>
                </div>
                <div className="print-grid-item">
                  <span className="print-grid-label">حالة المستخلص:</span>
                  <span>{statusLabels[printIpc.status] || printIpc.status}</span>
                </div>
              </div>

              <table className="print-table">
                <thead>
                  <tr>
                    <th>الوصف</th>
                    <th style={{ width: '200px', textAlign: 'left' }}>القيمة ({currencySymbol})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>إجمالي قيمة الأعمال المنجزة خلال الفترة</td>
                    <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{formatCurrency(printIpc.items_total)}</td>
                  </tr>
                  <tr>
                    <td>ضريبة القيمة المضافة ({printIpc.vat_percentage || 15}%)</td>
                    <td style={{ textAlign: 'left' }}>{formatCurrency(printIpc.vat_amount)}</td>
                  </tr>
                  <tr>
                    <td>استقطاع الضمان المالي ({printIpc.retention_percentage || 10}%)</td>
                    <td style={{ textAlign: 'left', color: '#c00' }}>{formatCurrency(printIpc.retention_amount)}</td>
                  </tr>
                  {Number(printIpc.previous_payments) > 0 && (
                    <tr>
                      <td>خصم دفعات سابقة</td>
                      <td style={{ textAlign: 'left', color: '#c00' }}>{formatCurrency(printIpc.previous_payments || 0)}</td>
                    </tr>
                  )}
                  <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                    <td>الصافي المطلوب صرفه للمؤسسة</td>
                    <td style={{ textAlign: 'left', fontSize: '1.2rem', color: '#080' }}>
                      {formatCurrency(
                        Number(printIpc.items_total) + 
                        Number(printIpc.vat_amount) - 
                        Number(printIpc.retention_amount) - 
                        Number(printIpc.previous_payments || 0)
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              {printIpc.notes && (
                <div style={{ marginTop: '1.5rem', border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>ملاحظات:</div>
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>{printIpc.notes}</p>
                </div>
              )}

              <div className="print-footer">
                <div className="print-signature-box">
                  <div>المهندس المشرف</div>
                  <div className="print-signature-line"></div>
                </div>
                <div className="print-signature-box">
                  <div>المدير المالي</div>
                  <div className="print-signature-line"></div>
                </div>
                <div className="print-signature-box">
                  <div>اعتماد الاستشاري / العميل</div>
                  <div className="print-signature-line"></div>
                </div>
              </div>
            </div>
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
              <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>إعداد المحاسب المالي</div>
                  <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #9ca3af' }}></div>
                </div>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>مراجعة المدير المالي</div>
                  <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #9ca3af' }}></div>
                </div>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>اعتماد مدير النظام</div>
                  <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #9ca3af' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
