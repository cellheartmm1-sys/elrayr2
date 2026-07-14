'use client';

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';

type TabType = 'requests' | 'submittals' | 'inventory';

interface MaterialRequest {
  id: string; request_number: string; project_name: string; requested_by_name: string;
  request_date: string; required_date: string; priority: string; status: string;
}

interface MaterialSubmittal {
  id: string; submittal_number: string; project_name: string; item_description: string;
  brand: string; model: string; submitted_date: string; consultant_name: string; status: string;
}

interface InventoryItem {
  id: string; description: string; warehouse_name: string; unit: string;
  current_quantity: string; min_quantity: string; unit_cost: string; category: string;
}

const statusLabels: Record<string, string> = {
  pending: 'قيد المراجعة', approved: 'تمت الموافقة', rejected: 'مرفوض',
  purchased: 'تم الشراء', received: 'تم الاستلام بالموقع'
};
const statusBadge: Record<string, string> = {
  pending: 'badge-warning', approved: 'badge-purple', rejected: 'badge-danger',
  purchased: 'badge-info', received: 'badge-success'
};

const priorityLabels: Record<string, string> = { urgent: 'عاجل جداً 🚨', high: 'مرتفع', normal: 'عادي', low: 'منخفض' };
const priorityBadge: Record<string, string> = { urgent: 'badge-danger', high: 'badge-warning', normal: 'badge-primary', low: 'badge-muted' };

const submittalStatusLabels: Record<string, string> = {
  pending: 'تحت الدراسة لدى الاستشاري', approved: 'معتمد بالكامل',
  approved_as_noted: 'معتمد مع ملاحظات', rejected: 'مرفوض كلياً ❌', resubmit: 'إعادة تقديم'
};
const submittalStatusBadge: Record<string, string> = {
  pending: 'badge-warning', approved: 'badge-success',
  approved_as_noted: 'badge-primary', rejected: 'badge-danger', resubmit: 'badge-purple'
};

function formatNumber(val: string | number) {
  return Number(val).toLocaleString('ar-SA');
}

export default function ProcurementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('requests');
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [submittals, setSubmittals] = useState<MaterialSubmittal[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  
  const [loading, setLoading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSubmittalModal, setShowSubmittalModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  // Filters
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Forms
  const [requestForm, setRequestForm] = useState({
    project_id: '', warehouse_id: '', required_date: '', priority: 'normal', notes: ''
  });

  const [submittalForm, setSubmittalForm] = useState({
    project_id: '', submittal_number: '', item_description: '', brand: '', model: '',
    origin: '', consultant_name: '', status: 'pending'
  });

  const [inventoryForm, setInventoryForm] = useState({
    warehouse_id: '', description: '', unit: 'قطعة', current_quantity: '', min_quantity: '', unit_cost: ''
  });

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (projectFilter) params.set('project_id', projectFilter);
    if (statusFilter) params.set('status', statusFilter);
    try {
      const res = await fetch(`/api/procurement/requests?${params}`);
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [projectFilter, statusFilter]);

  const fetchSubmittals = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (projectFilter) params.set('project_id', projectFilter);
    if (statusFilter) params.set('status', statusFilter);
    try {
      const res = await fetch(`/api/procurement/submittals?${params}`);
      const data = await res.json();
      setSubmittals(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [projectFilter, statusFilter]);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (lowStockFilter) params.set('low_stock', 'true');
    try {
      const res = await fetch(`/api/procurement/inventory?${params}`);
      const data = await res.json();
      setInventory(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [lowStockFilter]);

  const fetchFiltersData = async () => {
    const [prjRes, whRes] = await Promise.all([
      fetch('/api/projects'),
      fetch('/api/dashboard') // Get general dashboard data that contains basic info
    ]);
    const prjData = await prjRes.json();
    setProjects(prjData);
    
    // Create mock warehouses based on projects for select input
    if (Array.isArray(prjData)) {
      setWarehouses(prjData.map(p => ({ id: p.id, name: `مستودع موقع: ${p.name}` })));
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    if (activeTab === 'requests') fetchRequests();
    if (activeTab === 'submittals') fetchSubmittals();
    if (activeTab === 'inventory') fetchInventory();
  }, [activeTab, fetchRequests, fetchSubmittals, fetchInventory]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/procurement/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestForm)
      });
      if (res.ok) {
        setShowRequestModal(false);
        fetchRequests();
      }
    } catch (err) { console.error(err); }
  };

  const handleCreateSubmittal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/procurement/submittals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submittalForm)
      });
      if (res.ok) {
        setShowSubmittalModal(false);
        fetchSubmittals();
      }
    } catch (err) { console.error(err); }
  };

  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/procurement/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inventoryForm)
      });
      if (res.ok) {
        setShowInventoryModal(false);
        fetchInventory();
      }
    } catch (err) { console.error(err); }
  };

  // KPIs
  const totalItemsCount = inventory.length;
  const lowStockCount = inventory.filter(i => Number(i.current_quantity) <= Number(i.min_quantity)).length;

  return (
    <AppLayout title="المشتريات والمخازن" subtitle="إدارة طلبات شراء المواد، اعتمادات الاستشاريين، وتتبع المخزون في المواقع" icon="📦">
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>📋 طلبات المواد</button>
        <button className={`tab-btn ${activeTab === 'submittals' ? 'active' : ''}`} onClick={() => setActiveTab('submittals')}>📜 اعتمادات الاستشاريين</button>
        <button className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>📦 مخازن المواقع والمستودعات</button>
      </div>

      {/* ======================== TAB: REQUESTS ======================== */}
      {activeTab === 'requests' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">📋 طلبات توريد المواد للمشاريع</div>
              <div className="page-description">طلبات شراء وتوريد الأنابيب، الرشاشات، الصمامات والمحابس للمواقع</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowRequestModal(true)}>+ إنشاء طلب مواد جديد</button>
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
            ) : requests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">لا توجد طلبات مواد نشطة</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم الطلب</th>
                      <th>المشروع / الموقع</th>
                      <th>المطلوب بواسطة</th>
                      <th>تاريخ الطلب</th>
                      <th>تاريخ الحاجة المتوقع</th>
                      <th>الأولوية</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700 }}>{r.request_number}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.project_name}</td>
                        <td>{r.requested_by_name}</td>
                        <td>{new Date(r.request_date).toLocaleDateString('ar-SA')}</td>
                        <td>{new Date(r.required_date).toLocaleDateString('ar-SA')}</td>
                        <td><span className={`badge ${priorityBadge[r.priority] || 'badge-muted'}`}>{priorityLabels[r.priority] || r.priority}</span></td>
                        <td><span className={`badge ${statusBadge[r.status] || 'badge-muted'}`}>{statusLabels[r.status] || r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================== TAB: SUBMITTALS ======================== */}
      {activeTab === 'submittals' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">📜 اعتمادات المواد والمعدات (Material Submittals)</div>
              <div className="page-description">تتبع حالة موافقات الاستشاريين والمشرفين على عينات المضخات والمواسير والرشاشات قبل الشراء</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowSubmittalModal(true)}>+ تقديم عينة جديدة للاعتماد</button>
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : submittals.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📜</div>
                <div className="empty-state-title">لا توجد اعتمادات مواد مسجلة</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم التقديم</th>
                      <th>المشروع</th>
                      <th>وصف المادة والشركة المصنعة</th>
                      <th>العلامة التجارية</th>
                      <th>الموديل</th>
                      <th>تاريخ التقديم</th>
                      <th>اسم الاستشاري</th>
                      <th>حالة الاعتماد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submittals.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 700 }}>{s.submittal_number}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.project_name}</td>
                        <td style={{ color: 'var(--text-primary)' }}>{s.item_description}</td>
                        <td>{s.brand || '-'}</td>
                        <td>{s.model || '-'}</td>
                        <td>{new Date(s.submitted_date).toLocaleDateString('ar-SA')}</td>
                        <td>{s.consultant_name || '-'}</td>
                        <td><span className={`badge ${submittalStatusBadge[s.status] || 'badge-muted'}`}>{submittalStatusLabels[s.status] || s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================== TAB: INVENTORY ======================== */}
      {activeTab === 'inventory' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">📦 مخازن وجرد مستودعات المواقع</div>
              <div className="page-description">مراقبة كميات قطع الغيار والمواسير والرشاشات والصمامات والمضخات المتوفرة في كل مستودع موقع</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowInventoryModal(true)}>+ جرد مادة جديدة بالمخزن</button>
            </div>
          </div>

          <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card">
              <div className="stat-card-icon">📦</div>
              <div className="stat-value">{totalItemsCount}</div>
              <div className="stat-label">أصناف مسجلة بالمخازن</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-card-icon">⚠️</div>
              <div className="stat-value">{lowStockCount}</div>
              <div className="stat-label">أصناف مخزونها منخفض (تحت الحد الأدنى)</div>
            </div>
          </div>

          <div className="filter-bar">
            <label className="flex items-center gap-2" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={lowStockFilter} onChange={e => setLowStockFilter(e.target.checked)} />
              <span>إظهار المواد منخفضة المخزون فقط ⚠️</span>
            </label>
          </div>

          <div className="card">
            {loading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : inventory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📦</div>
                <div className="empty-state-title">لا توجد مواد مسجلة في المخزن المحدد</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>اسم المادة</th>
                      <th>المخزن / الموقع</th>
                      <th>الوحدة</th>
                      <th>الكمية المتوفرة حالياً</th>
                      <th>الحد الأدنى للطلب</th>
                      <th>التكلفة التقريبية للوحدة</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(i => {
                      const isLow = Number(i.current_quantity) <= Number(i.min_quantity);
                      return (
                        <tr key={i.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{i.description}</td>
                          <td>{i.warehouse_name}</td>
                          <td>{i.unit}</td>
                          <td style={{ fontWeight: 700, color: isLow ? 'var(--status-danger)' : 'var(--text-primary)' }}>
                            {formatNumber(i.current_quantity)}
                          </td>
                          <td>{formatNumber(i.min_quantity)}</td>
                          <td>{formatNumber(i.unit_cost)} ج.م</td>
                          <td>
                            <span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`}>
                              {isLow ? 'مخزون منخفض ⚠️' : 'كافٍ'}
                            </span>
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

      {/* ======================== MODAL: ADD REQUEST ======================== */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📋 إنشاء طلب مواد للموقع</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowRequestModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateRequest}>
              <div className="form-grid form-grid-2">
                <div className="form-group col-span-2">
                  <label className="form-label required">المشروع / الموقع المستلم</label>
                  <select className="form-control" required value={requestForm.project_id} onChange={e => setRequestForm({...requestForm, project_id: e.target.value})}>
                    <option value="">اختر المشروع...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label required">المخزن المرتبط بالمشروع</label>
                  <select className="form-control" required value={requestForm.warehouse_id} onChange={e => setRequestForm({...requestForm, warehouse_id: e.target.value})}>
                    <option value="">اختر المخزن...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">تاريخ التوريد المطلوب</label>
                  <input className="form-control" type="date" required value={requestForm.required_date} onChange={e => setRequestForm({...requestForm, required_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">الأولوية</label>
                  <select className="form-control" value={requestForm.priority} onChange={e => setRequestForm({...requestForm, priority: e.target.value})}>
                    <option value="normal">عادي</option>
                    <option value="high">مرتفع</option>
                    <option value="urgent">عاجل جداً 🚨</option>
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">ملاحظات وكميات المواد المطلوبة بالتفصيل</label>
                  <textarea className="form-control" value={requestForm.notes} onChange={e => setRequestForm({...requestForm, notes: e.target.value})} placeholder="الرجاء شراء مواسير حريق 4 بوصة عدد 50 حبة مع 100 رشاش رأس معلق K5.6..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowRequestModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 إرسال الطلب</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: ADD SUBMITTAL ======================== */}
      {showSubmittalModal && (
        <div className="modal-overlay" onClick={() => setShowSubmittalModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📜 تقديم اعتماد مادة للاستشاري</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowSubmittalModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSubmittal}>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label required">المشروع</label>
                  <select className="form-control" required value={submittalForm.project_id} onChange={e => setSubmittalForm({...submittalForm, project_id: e.target.value})}>
                    <option value="">اختر المشروع...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">رقم الاعتماد الفريد</label>
                  <input className="form-control" required value={submittalForm.submittal_number} onChange={e => setSubmittalForm({...submittalForm, submittal_number: e.target.value})} placeholder="SUB-ELR-xxx" />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label required">وصف المادة / تفاصيل العينة</label>
                  <input className="form-control" required value={submittalForm.item_description} onChange={e => setSubmittalForm({...submittalForm, item_description: e.target.value})} placeholder="مضخة حريق كهربائية مع لوحة التحكم..." />
                </div>
                <div className="form-group">
                  <label className="form-label">الشركة المصنعة / العلامة التجارية</label>
                  <input className="form-control" value={submittalForm.brand} onChange={e => setSubmittalForm({...submittalForm, brand: e.target.value})} placeholder="Armstrong / Patterson" />
                </div>
                <div className="form-group">
                  <label className="form-label">الموديل</label>
                  <input className="form-control" value={submittalForm.model} onChange={e => setSubmittalForm({...submittalForm, model: e.target.value})} placeholder="Model-X" />
                </div>
                <div className="form-group">
                  <label className="form-label">بلد المنشأ</label>
                  <input className="form-control" value={submittalForm.origin} onChange={e => setSubmittalForm({...submittalForm, origin: e.target.value})} placeholder="الولايات المتحدة / إيطاليا" />
                </div>
                <div className="form-group">
                  <label className="form-label required">اسم استشاري المشروع المشرف</label>
                  <input className="form-control" required value={submittalForm.consultant_name} onChange={e => setSubmittalForm({...submittalForm, consultant_name: e.target.value})} placeholder="مكتب دار الهندسة..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowSubmittalModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 تقديم عينة الاعتماد</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: ADD INVENTORY ======================== */}
      {showInventoryModal && (
        <div className="modal-overlay" onClick={() => setShowInventoryModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📦 جرد مادة بمخزن الموقع</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowInventoryModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateInventory}>
              <div className="form-grid form-grid-2">
                <div className="form-group col-span-2">
                  <label className="form-label required">المستودع / مخزن الموقع المستهدف</label>
                  <select className="form-control" required value={inventoryForm.warehouse_id} onChange={e => setInventoryForm({...inventoryForm, warehouse_id: e.target.value})}>
                    <option value="">اختر المخزن...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label required">وصف المادة / الصنف</label>
                  <input className="form-control" required value={inventoryForm.description} onChange={e => setInventoryForm({...inventoryForm, description: e.target.value})} placeholder="مواسير حديد 2 بوصة Sch40..." />
                </div>
                <div className="form-group">
                  <label className="form-label required">الوحدة</label>
                  <input className="form-control" required value={inventoryForm.unit} onChange={e => setInventoryForm({...inventoryForm, unit: e.target.value})} placeholder="متر طولي / قطعة" />
                </div>
                <div className="form-group">
                  <label className="form-label required">الكمية المتوفرة الحالية</label>
                  <input className="form-control" type="number" required value={inventoryForm.current_quantity} onChange={e => setInventoryForm({...inventoryForm, current_quantity: e.target.value})} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label required">الحد الأدنى لإعادة الطلب</label>
                  <input className="form-control" type="number" required value={inventoryForm.min_quantity} onChange={e => setInventoryForm({...inventoryForm, min_quantity: e.target.value})} placeholder="10" />
                </div>
                <div className="form-group">
                  <label className="form-label">تكلفة وحدة المادة (ج.م)</label>
                  <input className="form-control" type="number" value={inventoryForm.unit_cost} onChange={e => setInventoryForm({...inventoryForm, unit_cost: e.target.value})} placeholder="0.00" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowInventoryModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 حفظ الجرد</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
