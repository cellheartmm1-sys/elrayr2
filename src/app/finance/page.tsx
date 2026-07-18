'use client';

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
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

type TabType = 'ipc' | 'expenses' | 'cashflow';

interface IPC {
  id: string; ipc_number: string; project_name: string; ipc_date: string;
  items_total: string; vat_amount: string; retention_amount: string; net_payable: string; status: string;
}

interface Expense {
  id: string; expense_date: string; project_name: string;
  category: string; description: string; amount: string; supplier: string; invoice_number: string;
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

function formatCurrency(val: string | number) {
  return Number(val).toLocaleString('ar-EG') + ' ج.م';
}

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<TabType>('ipc');
  const [ipcs, setIpcs] = useState<IPC[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashflow, setCashflow] = useState<CashFlowItem[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [showIpcModal, setShowIpcModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Filters
  const [projectFilter, setProjectFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Forms
  const [ipcForm, setIpcForm] = useState({
    project_id: '', ipc_number: '', period_from: '', period_to: '',
    items_total: '', vat_percentage: '15', retention_percentage: '10', notes: ''
  });

  const [expenseForm, setExpenseForm] = useState({
    project_id: '', category: 'material', description: '', amount: '', supplier: '', invoice_number: ''
  });

  const fetchIPCs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (projectFilter) params.set('project_id', projectFilter);
    if (statusFilter) params.set('status', statusFilter);
    try {
      const res = await fetch(`/api/finance/ipc?${params}`);
      const data = await res.json();
      setIpcs(Array.isArray(data) ? data : []);
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
      setExpenses(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [projectFilter, categoryFilter]);

  const fetchCashflow = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/cashflow');
      const data = await res.json();
      setCashflow(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, []);

  const fetchProjectsList = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data);
  };

  useEffect(() => {
    fetchProjectsList();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as TabType;
      const validTabs: TabType[] = ['ipc', 'expenses', 'cashflow'];
      if (tab && validTabs.includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'ipc') fetchIPCs();
    if (activeTab === 'expenses') fetchExpenses();
    if (activeTab === 'cashflow') fetchCashflow();
  }, [activeTab, fetchIPCs, fetchExpenses, fetchCashflow]);

  const handleCreateIpc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/finance/ipc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ipcForm)
      });
      if (res.ok) {
        setShowIpcModal(false);
        fetchIPCs();
      }
    } catch (err) { console.error(err); }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm)
      });
      if (res.ok) {
        setShowExpenseModal(false);
        fetchExpenses();
      }
    } catch (err) { console.error(err); }
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
        label: 'الإيرادات المحصلة (ج.م)',
        data: cashflow.map(c => c.income),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'إجمالي المصروفات (ج.م)',
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
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(totalInvoiced)}</div>
              <div className="stat-label">إجمالي المرفوع للعملاء</div>
            </div>
            <div className="stat-card success">
              <div className="stat-card-icon">💸</div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(totalCollected)}</div>
              <div className="stat-label">المبالغ المحصلة فعلياً</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-card-icon">⏳</div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(totalUncollected)}</div>
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
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(totalExpensesSum)}</div>
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

      {/* ======================== MODAL: ADD CLIENT IPC ======================== */}
      {showIpcModal && (
        <div className="modal-overlay" onClick={() => setShowIpcModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📄 إصدار مستخلص عميل جديد</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowIpcModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateIpc}>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label required">المشروع</label>
                  <select className="form-control" required value={ipcForm.project_id} onChange={e => setIpcForm({...ipcForm, project_id: e.target.value})}>
                    <option value="">اختر المشروع...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">رقم المستخلص</label>
                  <input className="form-control" required value={ipcForm.ipc_number} onChange={e => setIpcForm({...ipcForm, ipc_number: e.target.value})} placeholder="IPC-CL-001" />
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
                  <label className="form-label required">إجمالي قيمة الأعمال المنفذة (ج.م)</label>
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
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowIpcModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 رفع المستخلص</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: ADD EXPENSE ======================== */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🧾 تسجيل مصروف للموقع</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowExpenseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateExpense}>
              <div className="form-grid form-grid-2">
                <div className="form-group col-span-2">
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
                  <label className="form-label required">المبلغ المالي (ج.م)</label>
                  <input className="form-control" type="number" required value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الفاتورة</label>
                  <input className="form-control" value={expenseForm.invoice_number} onChange={e => setExpenseForm({...expenseForm, invoice_number: e.target.value})} placeholder="INV-xxx" />
                </div>
                <div className="form-group">
                  <label className="form-label">المورد/الجهة المستلمة</label>
                  <input className="form-control" value={expenseForm.supplier} onChange={e => setExpenseForm({...expenseForm, supplier: e.target.value})} placeholder="شركة التوريد..." />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label required">الوصف والتفاصيل</label>
                  <textarea className="form-control" required value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} placeholder="شراء مواسير حديد 2 بوصة، مصنعيات لحام موقع العليا..." />
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
    </AppLayout>
  );
}
