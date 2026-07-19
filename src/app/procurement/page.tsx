'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';

type TabType = 'requests' | 'submittals' | 'inventory' | 'warehouses';

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
  const lastTabRef = useRef<string | null>(null);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    lastTabRef.current = tab;
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `${window.location.pathname}?tab=${tab}`);
    }
  };

  useEffect(() => {
    const syncTab = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab && tab !== lastTabRef.current && ['requests', 'submittals', 'inventory', 'warehouses'].includes(tab)) {
          lastTabRef.current = tab;
          setActiveTab(tab as TabType);
        }
      }
    };
    syncTab();
    const interval = setInterval(syncTab, 200);
    return () => clearInterval(interval);
  }, []);
  const [currencySymbol, setCurrencySymbol] = useState('ج.م');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrencySymbol(localStorage.getItem('system_currency_symbol') || 'ج.م');
    }
  }, []);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [submittals, setSubmittals] = useState<MaterialSubmittal[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [requestItems, setRequestItems] = useState<Array<{ item_name: string; quantity: number; unit: string; estimated_unit_cost: number }>>([
    { item_name: '', quantity: 1, unit: 'قطعة', estimated_unit_cost: 0 }
  ]);
  
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
    project_id: '', warehouse_id: '', required_date: '', priority: 'normal', requested_by: '', notes: ''
  });

  const [submittalForm, setSubmittalForm] = useState({
    project_id: '', submittal_number: '', title: '', item_description: '', brand: '', model: '',
    origin: '', consultant_name: '', submitted_by: '', status: 'pending'
  });

  const [inventoryForm, setInventoryForm] = useState({
    warehouse_id: '', description: '', unit: 'قطعة', current_quantity: '', min_quantity: '', unit_cost: ''
  });

  // Warehouse CRUD states
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any | null>(null);
  const [warehouseForm, setWarehouseForm] = useState({
    name: '', location: '', project_id: ''
  });

  // Inventory editing states
  const [editingInventoryItem, setEditingInventoryItem] = useState<any | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (projectFilter) params.set('project_id', projectFilter);
    if (statusFilter) params.set('status', statusFilter);
    try {
      const res = await fetch(`/api/procurement/requests?${params}`);
      const data = await res.json();
      setRequests(data && Array.isArray(data.data) ? data.data : []);
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
      setSubmittals(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, [projectFilter, statusFilter]);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (lowStockFilter) params.set('low_stock', 'true');
    try {
      const res = await fetch(`/api/procurement/inventory?${params}`);
      const data = await res.json();
      // inventory API returns array directly (not wrapped in {data:[]})
      setInventory(Array.isArray(data) ? data : (data?.data ?? []));
    } finally { setLoading(false); }
  }, [lowStockFilter]);

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/warehouses');
      const data = await res.json();
      setWarehouses(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (err) {
      console.error('fetchWarehouses error:', err);
    }
  };

  const fetchFiltersData = async () => {
    try {
      const [prjRes, empRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/employees')
      ]);
      const prjData = await prjRes.json();
      const empData = await empRes.json();
      setProjects(Array.isArray(prjData) ? prjData : (prjData?.data ?? []));
      setEmployees(Array.isArray(empData) ? empData : (empData?.data ?? []));
      await fetchWarehouses();
    } catch (err) {
      console.error('fetchFiltersData error:', err);
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    if (activeTab === 'requests') fetchRequests();
    if (activeTab === 'submittals') fetchSubmittals();
    if (activeTab === 'inventory') fetchInventory();
    if (activeTab === 'warehouses') fetchWarehouses();
  }, [activeTab, fetchRequests, fetchSubmittals, fetchInventory]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate items list
      const validItems = requestItems.filter(item => item.item_name.trim() !== '');
      if (validItems.length === 0) {
        alert('الرجاء إضافة صنف واحد على الأقل يحتوي على اسم المادة.');
        return;
      }

      const res = await fetch('/api/procurement/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: requestForm.project_id || null,
          warehouse_id: requestForm.warehouse_id || null,
          required_date: requestForm.required_date || null,
          priority: requestForm.priority,
          requested_by: requestForm.requested_by,
          notes: requestForm.notes || '',
          items: validItems.map(item => ({
            item_name: item.item_name,
            quantity: Number(item.quantity) || 1,
            unit: item.unit || 'قطعة',
            estimated_unit_cost: Number(item.estimated_unit_cost) || 0
          }))
        })
      });
      if (res.ok) {
        setShowRequestModal(false);
        setRequestForm({ project_id: '', warehouse_id: '', required_date: '', priority: 'normal', requested_by: '', notes: '' });
        setRequestItems([{ item_name: '', quantity: 1, unit: 'قطعة', estimated_unit_cost: 0 }]);
        fetchRequests();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء إرسال طلب المواد: ${errData.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleCreateSubmittal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/procurement/submittals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: submittalForm.project_id || null,
          submittal_number: submittalForm.submittal_number || null,
          item_description: submittalForm.item_description || submittalForm.title,
          brand: submittalForm.brand || null,
          model: submittalForm.model || null,
          origin: submittalForm.origin || null,
          consultant_name: submittalForm.consultant_name || null,
          submitted_by: submittalForm.submitted_by,
          submitted_date: new Date().toISOString().split('T')[0]
        })
      });
      if (res.ok) {
        setShowSubmittalModal(false);
        setSubmittalForm({
          project_id: '', submittal_number: '', title: '', item_description: '', brand: '', model: '',
          origin: '', consultant_name: '', submitted_by: '', status: 'pending'
        });
        fetchSubmittals();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء إضافة الاعتماد: ${errData.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/procurement/inventory';
      const method = editingInventoryItem ? 'PUT' : 'POST';
      const body = {
        id: editingInventoryItem?.id,
        warehouse_id: inventoryForm.warehouse_id,
        description: inventoryForm.description,
        unit: inventoryForm.unit || 'قطعة',
        current_quantity: Number(inventoryForm.current_quantity) || 0,
        min_quantity: Number(inventoryForm.min_quantity) || 0,
        unit_cost: Number(inventoryForm.unit_cost) || 0
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowInventoryModal(false);
        setInventoryForm({
          warehouse_id: '', description: '', unit: 'قطعة', current_quantity: '', min_quantity: '', unit_cost: ''
        });
        setEditingInventoryItem(null);
        fetchInventory();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء حفظ الجرد: ${errData.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleDeleteInventory = async (itemId: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا الصنف من الجرد نهائياً؟')) return;
    try {
      const res = await fetch(`/api/procurement/inventory?id=${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInventory();
      } else {
        alert('❌ فشل حذف الصنف.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/warehouses';
      const method = editingWarehouse ? 'PUT' : 'POST';
      const body = {
        id: editingWarehouse?.id,
        name: warehouseForm.name,
        location: warehouseForm.location,
        project_id: warehouseForm.project_id || null
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowWarehouseModal(false);
        setWarehouseForm({ name: '', location: '', project_id: '' });
        setEditingWarehouse(null);
        fetchWarehouses();
      } else {
        const err = await res.json();
        alert(`❌ فشل حفظ المستودع: ${err.error || 'خطأ غير معروف'}`);
      }
    } catch (err: any) {
      alert(`❌ خطأ في الاتصال بالخادم: ${err.message}`);
    }
  };

  const handleDeleteWarehouse = async (warehouseId: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا المستودع نهائياً؟')) return;
    try {
      const res = await fetch(`/api/warehouses?id=${warehouseId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchWarehouses();
      } else {
        alert('❌ فشل حذف المستودع.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditInventory = (item: any) => {
    setEditingInventoryItem(item);
    setInventoryForm({
      warehouse_id: item.warehouse_id || '',
      description: item.description || '',
      unit: item.unit || 'قطعة',
      current_quantity: String(item.current_quantity || '0'),
      min_quantity: String(item.min_quantity || '10'),
      unit_cost: String(item.unit_cost || '0')
    });
    setShowInventoryModal(true);
  };

  const handleOpenCreateInventory = () => {
    setEditingInventoryItem(null);
    setInventoryForm({
      warehouse_id: '',
      description: '',
      unit: 'قطعة',
      current_quantity: '',
      min_quantity: '',
      unit_cost: ''
    });
    setShowInventoryModal(true);
  };

  const handleOpenEditWarehouse = (wh: any) => {
    setEditingWarehouse(wh);
    setWarehouseForm({
      name: wh.name || '',
      location: wh.location || '',
      project_id: wh.project_id || ''
    });
    setShowWarehouseModal(true);
  };

  const handleOpenCreateWarehouse = () => {
    setEditingWarehouse(null);
    setWarehouseForm({
      name: '',
      location: '',
      project_id: ''
    });
    setShowWarehouseModal(true);
  };

  // KPIs
  const totalItemsCount = inventory.length;
  const lowStockCount = inventory.filter(i => Number(i.current_quantity) <= Number(i.min_quantity)).length;

  return (
    <AppLayout title="المشتريات والمخازن" subtitle="إدارة طلبات شراء المواد، اعتمادات الاستشاريين، وتتبع المخزون في المواقع" icon="📦">
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => handleTabChange('requests')}>📋 طلبات توريد المواد</button>
        <button className={`tab-btn ${activeTab === 'submittals' ? 'active' : ''}`} onClick={() => handleTabChange('submittals')}>📜 اعتمادات الاستشاريين</button>
        <button className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => handleTabChange('inventory')}>📦 مخازن وجرد المواقع</button>
        <button className={`tab-btn ${activeTab === 'warehouses' ? 'active' : ''}`} onClick={() => handleTabChange('warehouses')}>🏢 إدارة المستودعات والمخازن ({warehouses.length})</button>
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
              <button className="btn btn-primary" onClick={handleOpenCreateInventory}>+ جرد مادة جديدة بالمخزن</button>
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
                      <th style={{ textAlign: 'center', width: '120px' }}>العمليات</th>
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
                          <td>{formatCurrency(i.unit_cost)}</td>
                          <td>
                            <span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`}>
                              {isLow ? 'مخزون منخفض ⚠️' : 'كافٍ'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                              <button className="btn btn-outline btn-sm" onClick={() => handleOpenEditInventory(i)} title="تعديل الصنف">✏️</button>
                              <button className="btn btn-outline btn-sm text-danger" onClick={() => handleDeleteInventory(i.id)} title="حذف الصنف">🗑️</button>
                            </div>
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

      {/* ======================== TAB: WAREHOUSES ======================== */}
      {activeTab === 'warehouses' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">🏢 إدارة المستودعات ومخازن الشركة</div>
              <div className="page-description">تعريف وتعديل المستودعات المركزية ومخازن المواقع وربطها بالمشاريع</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={handleOpenCreateWarehouse}>+ إضافة مستودع جديد</button>
            </div>
          </div>

          <div className="card">
            {warehouses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏢</div>
                <div className="empty-state-title">لا توجد مستودعات مسجلة حالياً</div>
                <button className="btn btn-primary" onClick={handleOpenCreateWarehouse} style={{ marginTop: '1rem' }}>إضافة أول مستودع</button>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>اسم المستودع</th>
                      <th>موقع المستودع / العنوان</th>
                      <th>المشروع المرتبط</th>
                      <th style={{ textAlign: 'center', width: '150px' }}>العمليات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warehouses.map((wh: any) => (
                      <tr key={wh.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{wh.name}</td>
                        <td>{wh.location || '-'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--brand-primary-light)' }}>
                          {wh.project_name || 'مستودع مركزي (غير مرتبط بمشروع)'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => handleOpenEditWarehouse(wh)}>✏️ تعديل</button>
                            <button className="btn btn-outline btn-sm text-danger" onClick={() => handleDeleteWarehouse(wh.id)}>🗑️ حذف</button>
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

      {/* ======================== MODAL: ADD REQUEST ======================== */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📋 إنشاء طلب مواد للموقع</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowRequestModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateRequest}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* Row 1: Project + Warehouse */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label required">المشروع / الموقع المستلم</label>
                    <select className="form-control" required value={requestForm.project_id} onChange={e => setRequestForm({...requestForm, project_id: e.target.value})}>
                      <option value="">اختر المشروع...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label required">المخزن المرتبط</label>
                    <select className="form-control" required value={requestForm.warehouse_id} onChange={e => setRequestForm({...requestForm, warehouse_id: e.target.value})}>
                      <option value="">اختر المخزن...</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Row 2: Engineer + Date + Priority */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label required">المهندس طالب المواد (مقدم الطلب)</label>
                    <select className="form-control" required value={requestForm.requested_by} onChange={e => setRequestForm({ ...requestForm, requested_by: e.target.value })}>
                      <option value="">اختر المهندس...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.role === 'admin' ? 'مدير نظام' : emp.role === 'engineer' ? 'مهندس موقع' : 'مستخدم'})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label required">تاريخ التوريد</label>
                    <input className="form-control" type="date" required value={requestForm.required_date} onChange={e => setRequestForm({...requestForm, required_date: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">الأولوية</label>
                    <select className="form-control" value={requestForm.priority} onChange={e => setRequestForm({...requestForm, priority: e.target.value})}>
                      <option value="normal">عادي</option>
                      <option value="high">مرتفع</option>
                      <option value="urgent">عاجل جداً 🚨</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Items Table */}
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label className="form-label required" style={{ margin: 0, fontWeight: 700 }}>📋 الأصناف والمواد المطلوبة</label>
                    <button type="button" className="btn btn-ghost btn-sm text-primary" onClick={() => setRequestItems([...requestItems, { item_name: '', quantity: 1, unit: 'قطعة', estimated_unit_cost: 0 }])}>
                      ➕ إضافة صنف
                    </button>
                  </div>
                  <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th>اسم المادة المطلوب شراؤها</th>
                        <th style={{ width: '90px' }}>الكمية</th>
                        <th style={{ width: '110px' }}>الوحدة</th>
                        <th style={{ width: '120px' }}>السعر التقديري</th>
                        <th style={{ width: '50px' }}>حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <input className="form-control form-control-sm" style={{ width: '100%' }} required value={item.item_name} onChange={e => { const n = [...requestItems]; n[idx].item_name = e.target.value; setRequestItems(n); }} placeholder="مثال: ماسورة حريق 4 بوصة..." />
                          </td>
                          <td>
                            <input className="form-control form-control-sm" style={{ width: '100%' }} type="number" required min="1" value={item.quantity} onChange={e => { const n = [...requestItems]; n[idx].quantity = Number(e.target.value); setRequestItems(n); }} />
                          </td>
                          <td>
                            <input className="form-control form-control-sm" style={{ width: '100%' }} value={item.unit} onChange={e => { const n = [...requestItems]; n[idx].unit = e.target.value; setRequestItems(n); }} placeholder="قطعة / متر" />
                          </td>
                          <td>
                            <input className="form-control form-control-sm" style={{ width: '100%' }} type="number" value={item.estimated_unit_cost} onChange={e => { const n = [...requestItems]; n[idx].estimated_unit_cost = Number(e.target.value); setRequestItems(n); }} placeholder="0.00" />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button type="button" className="btn btn-ghost text-danger btn-sm" style={{ padding: '0.25rem' }} disabled={requestItems.length === 1} onClick={() => setRequestItems(requestItems.filter((_, i) => i !== idx))}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Row 4: Notes */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">ملاحظات عامة حول التوريد</label>
                  <textarea className="form-control" value={requestForm.notes} onChange={e => setRequestForm({...requestForm, notes: e.target.value})} placeholder="أية ملاحظات إضافية حول التوريد والتسليم..." rows={2} />
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
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📜 تقديم اعتماد مادة للاستشاري</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowSubmittalModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSubmittal}>
              <div className="form-grid form-grid-3">
                <div className="form-group col-span-3">
                  <label className="form-label required">عنوان تقديم الاعتماد (المادة المستهدفة)</label>
                  <input
                    className="form-control"
                    required
                    value={submittalForm.title}
                    onChange={e => setSubmittalForm({ ...submittalForm, title: e.target.value })}
                    placeholder="مثال: اعتماد مضخات الحريق ماركة Armstrong..."
                  />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label required">المهندس مقدم طلب الاعتماد</label>
                  <select
                    className="form-control"
                    required
                    value={submittalForm.submitted_by}
                    onChange={e => setSubmittalForm({ ...submittalForm, submitted_by: e.target.value })}
                  >
                    <option value="">اختر المهندس...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.role === 'admin' ? 'مدير نظام' : emp.role === 'engineer' ? 'مهندس موقع' : 'مستخدم'})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">رقم الاعتماد الفريد</label>
                  <input className="form-control" required value={submittalForm.submittal_number} onChange={e => setSubmittalForm({...submittalForm, submittal_number: e.target.value})} placeholder="SUB-ELR-xxx" />
                </div>
                <div className="form-group">
                  <label className="form-label required">المشروع</label>
                  <select className="form-control" required value={submittalForm.project_id} onChange={e => setSubmittalForm({...submittalForm, project_id: e.target.value})}>
                    <option value="">اختر المشروع...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label required">اسم استشاري المشروع</label>
                  <input className="form-control" required value={submittalForm.consultant_name} onChange={e => setSubmittalForm({...submittalForm, consultant_name: e.target.value})} placeholder="مكتب دار الهندسة..." />
                </div>
                <div className="form-group col-span-3">
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
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingInventoryItem ? '📐 تعديل جرد صنف بالمخزن' : '📦 جرد مادة بمخزن الموقع'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowInventoryModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveInventory}>
              <div className="form-grid form-grid-3">
                <div className="form-group col-span-3">
                  <label className="form-label required">المستودع / مخزن الموقع المستهدف</label>
                  <select className="form-control" required value={inventoryForm.warehouse_id} onChange={e => setInventoryForm({...inventoryForm, warehouse_id: e.target.value})}>
                    <option value="">اختر المخزن...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="form-group col-span-3">
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
                <div className="form-group col-span-3">
                  <label className="form-label">تكلفة وحدة المادة ({currencySymbol})</label>
                  <input className="form-control" type="number" value={inventoryForm.unit_cost} onChange={e => setInventoryForm({...inventoryForm, unit_cost: e.target.value})} placeholder="0.00" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowInventoryModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">
                  {editingInventoryItem ? '💾 حفظ التعديل' : '💾 حفظ الجرد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: ADD / EDIT WAREHOUSE ======================== */}
      {showWarehouseModal && (
        <div className="modal-overlay" onClick={() => setShowWarehouseModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingWarehouse ? '📐 تعديل بيانات المستودع' : '🏢 إضافة مستودع جديد'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowWarehouseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveWarehouse}>
              <div className="form-grid form-grid-3">
                <div className="form-group col-span-2">
                  <label className="form-label required">اسم المستودع</label>
                  <input 
                    className="form-control" 
                    required 
                    value={warehouseForm.name} 
                    onChange={e => setWarehouseForm({...warehouseForm, name: e.target.value})} 
                    placeholder="مثال: مستودع أكتوبر المركزي، مخزن موقع برج راية..." 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">العنوان / الموقع</label>
                  <input 
                    className="form-control" 
                    value={warehouseForm.location} 
                    onChange={e => setWarehouseForm({...warehouseForm, location: e.target.value})} 
                    placeholder="الجيزة، التجمع..." 
                  />
                </div>
                <div className="form-group col-span-3">
                  <label className="form-label">المشروع المرتبط (اختياري)</label>
                  <select 
                    className="form-control" 
                    value={warehouseForm.project_id} 
                    onChange={e => setWarehouseForm({...warehouseForm, project_id: e.target.value})}
                  >
                    <option value="">مستودع مركزي عام (غير مرتبط بمشروع)</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowWarehouseModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">
                  {editingWarehouse ? '💾 حفظ التعديلات' : '💾 إضافة المستودع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
