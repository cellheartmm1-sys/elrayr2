'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';

type TabType = 'requests' | 'submittals' | 'inventory' | 'warehouses' | 'material_issues' | 'transfers';

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
  warehouse_id?: string;
  sale_price?: string;
  location_in_warehouse?: string;
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
        if (tab && tab !== lastTabRef.current && ['requests', 'submittals', 'inventory', 'warehouses', 'material_issues', 'transfers'].includes(tab)) {
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
  const [inventoryWarehouseFilter, setInventoryWarehouseFilter] = useState('');

  // Edit Request State
  const [editingRequest, setEditingRequest] = useState<MaterialRequest | null>(null);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [requestEditForm, setRequestEditForm] = useState({
    priority: 'normal',
    status: 'pending',
    required_date: '',
    notes: ''
  });

  const handleOpenEditRequest = (req: any) => {
    setEditingRequest(req);
    setRequestEditForm({
      priority: req.priority || 'normal',
      status: req.status || 'pending',
      required_date: req.required_date ? new Date(req.required_date).toISOString().split('T')[0] : '',
      notes: req.notes || ''
    });
    setShowEditRequestModal(true);
  };

  const handleSaveRequestEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;
    try {
      const res = await fetch('/api/procurement/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRequest.id,
          ...requestEditForm
        })
      });
      if (res.ok) {
        setShowEditRequestModal(false);
        alert('✅ تم تعديل طلب المواد بنجاح!');
        fetchRequests();
      } else {
        const err = await res.json();
        alert(`❌ فشل التعديل: ${err.error || 'حدث خطأ'}`);
      }
    } catch (e) {
      console.error(e);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleQuickRequestStatusChange = async (req: MaterialRequest, newStatus: string) => {
    try {
      const res = await fetch('/api/procurement/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: req.id, status: newStatus })
      });
      if (res.ok) {
        alert('✅ تم تغيير حالة طلب المواد بنجاح!');
        fetchRequests();
      } else {
        const err = await res.json();
        alert(`❌ فشل تغيير الحالة: ${err.error || 'حدث خطأ'}`);
      }
    } catch (e) {
      console.error(e);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف طلب توريد المواد هذا؟')) return;
    try {
      const res = await fetch(`/api/procurement/requests?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('✅ تم حذف طلب توريد المواد بنجاح!');
        fetchRequests();
      } else {
        const err = await res.json();
        alert(`❌ فشل الحذف: ${err.error || 'حدث خطأ'}`);
      }
    } catch (e) {
      console.error(e);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  // Forms
  const [requestForm, setRequestForm] = useState({
    project_id: '', warehouse_id: '', required_date: '', priority: 'normal', requested_by: '', notes: ''
  });

  const [submittalForm, setSubmittalForm] = useState({
    project_id: '', submittal_number: '', title: '', item_description: '', brand: '', model: '',
    origin: '', consultant_name: '', submitted_by: '', status: 'pending'
  });

  const [inventoryForm, setInventoryForm] = useState({
    warehouse_id: '', description: '', unit: 'قطعة', current_quantity: '', min_quantity: '', unit_cost: '', sale_price: ''
  });

  // Warehouse CRUD states
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any | null>(null);
  const [warehouseForm, setWarehouseForm] = useState({
    name: '', location: '', project_id: ''
  });

  // Inventory editing states
  const [editingInventoryItem, setEditingInventoryItem] = useState<any | null>(null);
  
  // Selected Warehouse detailed view state
  const [selectedWarehouse, setSelectedWarehouse] = useState<any | null>(null);
  const [warehouseSubTab, setWarehouseSubTab] = useState<'items' | 'supply' | 'history' | 'audit' | 'report'>('items');

  const [supplyForm, setSupplyForm] = useState({
    project_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    notes: '',
    items: [] as Array<{ inventory_item_id: string, description: string, quantity: number, unit_cost: number, unit: string }>
  });

  const [auditForm, setAuditForm] = useState({
    inventory_item_id: '',
    new_quantity: '',
    reason: ''
  });

  const handleSaveSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplyForm.project_id || supplyForm.items.length === 0) {
      alert('⚠️ يرجى اختيار المشروع وإضافة صنف واحد على الأقل.');
      return;
    }
    // Validate quantities are available
    for (const item of supplyForm.items) {
      const invItem = inventory.find(i => i.id === item.inventory_item_id);
      if (invItem && Number(invItem.current_quantity) < item.quantity) {
        alert(`❌ الكمية المطلوبة من "${item.description}" غير متوفرة بالمستودع. (المتاح: ${invItem.current_quantity})`);
        return;
      }
    }

    try {
      const res = await fetch('/api/procurement/material-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: supplyForm.project_id,
          warehouse_id: selectedWarehouse.id,
          issue_date: supplyForm.issue_date,
          notes: supplyForm.notes,
          items: supplyForm.items.map(i => ({
            inventory_item_id: i.inventory_item_id,
            item_description: i.description,
            quantity: i.quantity,
            unit_cost: i.unit_cost,
            unit: i.unit
          }))
        })
      });
      if (res.ok) {
        alert('✅ تم توريد وصرف الخامات للمشروع وقيد التكلفة بنجاح!');
        // Refresh inventory & close/reset supply form
        fetchInventory();
        setSupplyForm({
          project_id: '',
          issue_date: new Date().toISOString().split('T')[0],
          notes: '',
          items: []
        });
        setWarehouseSubTab('items');
      } else {
        const err = await res.json();
        alert(`❌ فشل صرف المواد: ${err.error || 'خطأ غير معروف'}`);
      }
    } catch (err: any) {
      alert(`❌ خطأ: ${err.message}`);
    }
  };

  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditForm.inventory_item_id || auditForm.new_quantity === '') {
      alert('⚠️ يرجى اختيار الصنف وتحديد الكمية الجديدة.');
      return;
    }
    const itemToUpdate = inventory.find(i => i.id === auditForm.inventory_item_id);
    if (!itemToUpdate) return;

    try {
      const res = await fetch('/api/procurement/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: itemToUpdate.id,
          warehouse_id: itemToUpdate.warehouse_id,
          description: itemToUpdate.description,
          unit: itemToUpdate.unit,
          current_quantity: Number(auditForm.new_quantity),
          min_quantity: itemToUpdate.min_quantity,
          unit_cost: itemToUpdate.unit_cost,
          sale_price: itemToUpdate.sale_price,
          location_in_warehouse: itemToUpdate.location_in_warehouse
        })
      });
      if (res.ok) {
        alert('✅ تم تعديل الكمية وإثبات حركة الجرد بنجاح!');
        fetchInventory();
        setAuditForm({ inventory_item_id: '', new_quantity: '', reason: '' });
        setWarehouseSubTab('items');
      } else {
        alert('❌ فشل تعديل الكمية.');
      }
    } catch (err: any) {
      alert(`❌ خطأ: ${err.message}`);
    }
  };

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
    if (inventoryWarehouseFilter) params.set('warehouse_id', inventoryWarehouseFilter);
    try {
      const res = await fetch(`/api/procurement/inventory?${params}`);
      const data = await res.json();
      // inventory API returns array directly (not wrapped in {data:[]})
      setInventory(Array.isArray(data) ? data : (data?.data ?? []));
    } finally { setLoading(false); }
  }, [lowStockFilter, inventoryWarehouseFilter]);

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

  const [materialIssues, setMaterialIssues] = useState<any[]>([]);
  const [warehouseTransfers, setWarehouseTransfers] = useState<any[]>([]);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const [issueForm, setIssueForm] = useState({
    project_id: '',
    warehouse_id: '',
    notes: '',
    items: [{ inventory_item_id: '', item_description: '', quantity: 1, unit: 'وحدة', unit_cost: 0 }]
  });

  const [transferForm, setTransferForm] = useState({
    from_warehouse_id: '',
    to_warehouse_id: '',
    notes: '',
    items: [{ inventory_item_id: '', item_description: '', quantity: 1, unit: 'وحدة', unit_cost: 0 }]
  });

  const fetchMaterialIssues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/procurement/material-issues');
      const data = await res.json();
      setMaterialIssues(data?.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchWarehouseTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/procurement/transfers');
      const data = await res.json();
      setWarehouseTransfers(data?.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    if (activeTab === 'requests') fetchRequests();
    if (activeTab === 'submittals') fetchSubmittals();
    if (activeTab === 'inventory') fetchInventory();
    if (activeTab === 'warehouses') fetchWarehouses();
    if (activeTab === 'material_issues') fetchMaterialIssues();
    if (activeTab === 'transfers') fetchWarehouseTransfers();
  }, [activeTab, fetchRequests, fetchSubmittals, fetchInventory, fetchMaterialIssues, fetchWarehouseTransfers]);

  const handleCreateMaterialIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.project_id || !issueForm.warehouse_id) {
      alert('⚠️ إجبارياً: يرجى اختيار المشروع والمخزن المورد الخامات منه');
      return;
    }
    const validItems = issueForm.items.filter(i => i.item_description.trim() !== '' && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      alert('⚠️ يرجى إدخال صنف واحد على الأقل بكمية صحيحة');
      return;
    }

    try {
      const res = await fetch('/api/procurement/material-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: issueForm.project_id,
          warehouse_id: issueForm.warehouse_id,
          notes: issueForm.notes,
          items: validItems
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowIssueModal(false);
        setIssueForm({
          project_id: '', warehouse_id: '', notes: '',
          items: [{ inventory_item_id: '', item_description: '', quantity: 1, unit: 'وحدة', unit_cost: 0 }]
        });
        alert(`✅ ${data.message}`);
        fetchMaterialIssues();
        fetchInventory();
      } else {
        alert(`❌ فشل إصدار إذن الصرف: ${data.error || 'حدث خطأ'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleCreateTransferOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.from_warehouse_id || !transferForm.to_warehouse_id) {
      alert('⚠️ يرجى اختيار المخزن المصدر والمخزن المستهدف للتحويل');
      return;
    }
    if (transferForm.from_warehouse_id === transferForm.to_warehouse_id) {
      alert('⚠️ لا يمكن التحويل لنفس المخزن');
      return;
    }
    const validItems = transferForm.items.filter(i => i.item_description.trim() !== '' && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      alert('⚠️ يرجى اختيار أو كتابة صنف واحد على الأقل بكمية صحيحة');
      return;
    }

    try {
      const res = await fetch('/api/procurement/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_warehouse_id: transferForm.from_warehouse_id,
          to_warehouse_id: transferForm.to_warehouse_id,
          notes: transferForm.notes,
          items: validItems
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowTransferModal(false);
        setTransferForm({
          from_warehouse_id: '', to_warehouse_id: '', notes: '',
          items: [{ inventory_item_id: '', item_description: '', quantity: 1, unit: 'وحدة', unit_cost: 0 }]
        });
        alert(`✅ ${data.message}`);
        fetchWarehouseTransfers();
        fetchInventory();
      } else {
        alert(`❌ فشل تنفيذ التحويل: ${data.error || 'حدث خطأ'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

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
        unit_cost: Number(inventoryForm.unit_cost) || 0,
        sale_price: Number(inventoryForm.sale_price) || 0
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowInventoryModal(false);
        setInventoryForm({
          warehouse_id: '', description: '', unit: 'قطعة', current_quantity: '', min_quantity: '', unit_cost: '', sale_price: ''
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
      unit_cost: String(item.unit_cost || '0'),
      sale_price: String(item.sale_price || '0')
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
      unit_cost: '',
      sale_price: ''
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
        <button className={`tab-btn ${activeTab === 'warehouses' ? 'active' : ''}`} onClick={() => handleTabChange('warehouses')}>🏢 إدارة المستودعات ({warehouses.length})</button>
        <button className={`tab-btn ${activeTab === 'material_issues' ? 'active' : ''}`} onClick={() => handleTabChange('material_issues')}>🏗️ إذون صرف خامات لموقع</button>
        <button className={`tab-btn ${activeTab === 'transfers' ? 'active' : ''}`} onClick={() => handleTabChange('transfers')}>🔄 تحويل خامات وعَدَد (Transfers)</button>
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
                      <th style={{ textAlign: 'center' }}>تغيير الحالة</th>
                      <th style={{ textAlign: 'center' }}>العمليات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700 }}>{r.request_number}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.project_name}</td>
                        <td>{r.requested_by_name}</td>
                        <td>{new Date(r.request_date).toLocaleDateString('ar-EG')}</td>
                        <td>{r.required_date ? new Date(r.required_date).toLocaleDateString('ar-EG') : '-'}</td>
                        <td><span className={`badge ${priorityBadge[r.priority] || 'badge-muted'}`}>{priorityLabels[r.priority] || r.priority}</span></td>
                        <td style={{ textAlign: 'center' }}>
                          <select
                            className={`form-control form-control-sm ${statusBadge[r.status] || 'badge-muted'}`}
                            style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', fontWeight: 600, cursor: 'pointer', borderRadius: '100px' }}
                            value={r.status}
                            onChange={(e) => handleQuickRequestStatusChange(r, e.target.value)}
                            title="تغيير حالة طلب المواد فورياً"
                          >
                            <option value="pending">🟡 قيد المراجعة</option>
                            <option value="approved">🟣 تمت الموافقة</option>
                            <option value="purchased">🔵 تم الشراء</option>
                            <option value="received">🟢 تم الاستلام بالموقع</option>
                            <option value="rejected">🔴 مرفوض</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleOpenEditRequest(r)}
                              title="تعديل طلب المواد"
                            >
                              ✏️ تعديل
                            </button>
                            <button
                              className="btn btn-outline btn-sm text-danger"
                              onClick={() => handleDeleteRequest(r.id)}
                              title="حذف طلب المواد"
                            >
                              🗑️ حذف
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
            <div className="stat-card card-kpi-projects">
              <div className="stat-card-icon">📦</div>
              <div className="stat-value">{totalItemsCount}</div>
              <div className="stat-label">أصناف مسجلة بالمخازن</div>
            </div>
            <div className="stat-card card-kpi-tickets">
              <div className="stat-card-icon">⚠️</div>
              <div className="stat-value">{lowStockCount}</div>
              <div className="stat-label">أصناف مخزونها منخفض (تحت الحد الأدنى)</div>
            </div>
          </div>

          <div className="filter-bar" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <select className="form-control" style={{ width: 'auto', minWidth: '220px' }} value={inventoryWarehouseFilter} onChange={e => setInventoryWarehouseFilter(e.target.value)}>
              <option value="">كل المستودعات والمخازن</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <label className="flex items-center gap-2" style={{ cursor: 'pointer', fontSize: '0.875rem', margin: 0, display: 'flex', alignItems: 'center' }}>
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
                      <th>الكمية</th>
                      <th>الحد الأدنى</th>
                      <th>سعر الشراء</th>
                      <th>سعر البيع</th>
                      <th>الحالة</th>
                      <th style={{ textAlign: 'center', width: '120px' }}>العمليات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(i => {
                      const isLow = Number(i.current_quantity) <= Number(i.min_quantity);
                      return (
                        <tr key={i.id} style={{ backgroundColor: isLow ? 'rgba(239, 68, 68, 0.02)' : undefined, borderRight: isLow ? '3px solid var(--status-danger)' : undefined }}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{i.description}</td>
                          <td>{i.warehouse_name}</td>
                          <td>{i.unit}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '95px' }}>
                              <span style={{ fontWeight: 700, color: isLow ? 'var(--status-danger)' : 'var(--text-primary)' }}>
                                {formatNumber(i.current_quantity)}
                              </span>
                              <div style={{ width: '100%', height: '4px', background: 'var(--border-subtle)', borderRadius: '100px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${Math.min(100, (Number(i.current_quantity) / Math.max(1, Number(i.min_quantity))) * 100)}%`, 
                                  height: '100%', 
                                  background: isLow ? 'var(--status-danger)' : 'var(--status-success)' 
                                }} />
                              </div>
                            </div>
                          </td>
                          <td>{formatNumber(i.min_quantity)}</td>
                          <td>{formatCurrency(i.unit_cost)}</td>
                          <td>{formatCurrency(i.sale_price || 0)}</td>
                          <td>
                            <span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              {isLow ? '🚨 تنبيه: مخزون منخفض وتحت حد الطلب' : '✅ كافٍ'}
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

      {activeTab === 'warehouses' && (
        <>
          {selectedWarehouse ? (
            <>
              {/* Back to warehouses list button & Title */}
              <div className="page-header" style={{ marginBottom: '1rem' }}>
                <div className="page-header-left">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setSelectedWarehouse(null)}>
                      ← العودة للمستودعات
                    </button>
                    <div className="page-title" style={{ margin: 0 }}>🏢 مستودع: {selectedWarehouse.name}</div>
                  </div>
                  <div className="page-description" style={{ marginTop: '0.4rem' }}>
                    📍 العنوان: {selectedWarehouse.location || '-'} | 📌 المشروع المرتبط: {selectedWarehouse.project_name || 'مستودع مركزي عام'}
                  </div>
                </div>
                <div className="page-header-actions">
                  <button className="btn btn-primary" onClick={() => {
                    setEditingInventoryItem(null);
                    setInventoryForm({
                      warehouse_id: selectedWarehouse.id,
                      description: '',
                      unit: 'قطعة',
                      current_quantity: '',
                      min_quantity: '10',
                      unit_cost: '',
                      sale_price: ''
                    });
                    setShowInventoryModal(true);
                  }}>
                    ➕ تكويد صنف جديد بالمستودع
                  </button>
                </div>
              </div>

              {/* Warehouse KPI Stats */}
              {(() => {
                const whItems = inventory.filter(item => item.warehouse_id === selectedWarehouse.id);
                const totalCoded = whItems.length;
                const totalCostVal = whItems.reduce((acc, curr) => acc + (Number(curr.current_quantity) * Number(curr.unit_cost || 0)), 0);
                const totalSaleVal = whItems.reduce((acc, curr) => acc + (Number(curr.current_quantity) * Number(curr.sale_price || 0)), 0);
                const netProfitExpected = totalSaleVal - totalCostVal;

                return (
                  <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
                    <div className="stat-card card-kpi-projects">
                      <div className="stat-card-icon">📦</div>
                      <div className="stat-value">{totalCoded}</div>
                      <div className="stat-label">عدد الأصناف المكودة</div>
                    </div>
                    <div className="stat-card card-kpi-contracts">
                      <div className="stat-card-icon">💰</div>
                      <div className="stat-value">{formatCurrency(totalCostVal)}</div>
                      <div className="stat-label">صافي قيمة المشتريات (التكلفة)</div>
                    </div>
                    <div className="stat-card card-kpi-maintenance">
                      <div className="stat-card-icon">📈</div>
                      <div className="stat-value">{formatCurrency(totalSaleVal)}</div>
                      <div className="stat-label">صافي قيمة المبيعات المتوقعة</div>
                    </div>
                    <div className="stat-card card-kpi-employees">
                      <div className="stat-card-icon">📊</div>
                      <div className="stat-value" style={{ color: netProfitExpected >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                        {formatCurrency(netProfitExpected)}
                      </div>
                      <div className="stat-label">العائد التقديري المتوقع للأرباح</div>
                    </div>
                  </div>
                );
              })()}

              {/* Warehouse Sub-Tabs Navigation */}
              <div className="tabs" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <button className={`tab-btn ${warehouseSubTab === 'items' ? 'active' : ''}`} onClick={() => setWarehouseSubTab('items')}>📦 الأصناف المبرمجة وأسعارها</button>
                <button className={`tab-btn ${warehouseSubTab === 'supply' ? 'active' : ''}`} onClick={() => setWarehouseSubTab('supply')}>🏗️ صرف وتوريد لمشروع</button>
                <button className={`tab-btn ${warehouseSubTab === 'history' ? 'active' : ''}`} onClick={() => setWarehouseSubTab('history')}>🔄 حركة وسجل صرف الخامات</button>
                <button className={`tab-btn ${warehouseSubTab === 'audit' ? 'active' : ''}`} onClick={() => setWarehouseSubTab('audit')}>📐 حركة الجرد والتسوية</button>
                <button className={`tab-btn ${warehouseSubTab === 'report' ? 'active' : ''}`} onClick={() => setWarehouseSubTab('report')}>📊 تقرير المخزون والقيمة</button>
              </div>

              {/* Warehouse sub-tab content */}
              <div className="card" style={{ padding: '1.25rem' }}>
                {warehouseSubTab === 'items' && (() => {
                  const whItems = inventory.filter(item => item.warehouse_id === selectedWarehouse.id);
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, fontWeight: 700 }}>الأصناف المتوفرة بـ {selectedWarehouse.name}</h4>
                      </div>
                      {whItems.length === 0 ? (
                        <div className="empty-state">
                          <div className="empty-state-icon">📦</div>
                          <div className="empty-state-title">لا توجد أصناف مكودة حالياً في هذا المستودع</div>
                        </div>
                      ) : (
                        <div className="table-wrapper">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>اسم الصنف / الكود</th>
                                <th>الوحدة</th>
                                <th>الكمية المتوفرة</th>
                                <th>الحد الأدنى للطلب</th>
                                <th>سعر الشراء (التكلفة)</th>
                                <th>سعر البيع المقدر</th>
                                <th>إجمالي قيمة التكلفة</th>
                                <th>إجمالي قيمة البيع</th>
                                <th style={{ textAlign: 'center', width: '100px' }}>العمليات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {whItems.map(item => (
                                <tr key={item.id}>
                                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.description}</td>
                                  <td>{item.unit}</td>
                                  <td style={{ fontWeight: 700, color: Number(item.current_quantity) <= Number(item.min_quantity) ? 'var(--status-danger)' : 'var(--text-primary)' }}>
                                    {formatNumber(item.current_quantity)}
                                  </td>
                                  <td>{formatNumber(item.min_quantity)}</td>
                                  <td>{formatCurrency(item.unit_cost)}</td>
                                  <td>{formatCurrency(item.sale_price || 0)}</td>
                                  <td style={{ fontWeight: 600 }}>{formatCurrency(Number(item.current_quantity) * Number(item.unit_cost))}</td>
                                  <td style={{ fontWeight: 600, color: 'var(--brand-primary-light)' }}>{formatCurrency(Number(item.current_quantity) * Number(item.sale_price || 0))}</td>
                                  <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                      <button className="btn btn-outline btn-sm" onClick={() => handleOpenEditInventory(item)} title="تعديل">✏️</button>
                                      <button className="btn btn-outline btn-sm text-danger" onClick={() => handleDeleteInventory(item.id)} title="حذف">🗑️</button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {warehouseSubTab === 'supply' && (() => {
                  const whItems = inventory.filter(item => item.warehouse_id === selectedWarehouse.id);
                  return (
                    <form onSubmit={handleSaveSupply}>
                      <h4 style={{ marginBottom: '1rem', fontWeight: 700 }}>🏗️ صرف وتوريد خامات لمشروع متعاقد عليه</h4>
                      
                      <div className="form-grid form-grid-3" style={{ marginBottom: '1.25rem' }}>
                        <div className="form-group col-span-2">
                          <label className="form-label required">المشروع المستهدف (المتعاقد عليه)</label>
                          <select className="form-control" required value={supplyForm.project_id} onChange={e => setSupplyForm({ ...supplyForm, project_id: e.target.value })}>
                            <option value="">اختر المشروع...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label required">تاريخ صرف الخامات</label>
                          <input className="form-control" type="date" required value={supplyForm.issue_date} onChange={e => setSupplyForm({ ...supplyForm, issue_date: e.target.value })} />
                        </div>
                      </div>

                      <div style={{ border: '1px solid var(--border-normal)', padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.01)', marginBottom: '1.25rem' }}>
                        <h5 style={{ marginTop: 0, marginBottom: '0.75rem', fontWeight: 600 }}>➕ إضافة أصناف لصرفها وتوريدها للمشروع</h5>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          <div className="form-group" style={{ margin: 0, flex: '2 1 200px' }}>
                            <label className="form-label">اختر الصنف المتوفر بالمستودع</label>
                            <select id="supply_item_select" className="form-control" defaultValue="">
                              <option value="">اختر صنفاً...</option>
                              {whItems.map(i => <option key={i.id} value={i.id}>{i.description} (المتاح: {i.current_quantity})</option>)}
                            </select>
                          </div>
                          <div className="form-group" style={{ margin: 0, flex: '1 1 80px' }}>
                            <label className="form-label">الكمية الصادرة</label>
                            <input id="supply_qty_input" className="form-control" type="number" min="0.001" step="any" placeholder="10" />
                          </div>
                          <button type="button" className="btn btn-outline" style={{ height: '38px' }} onClick={() => {
                            const selectEl = document.getElementById('supply_item_select') as HTMLSelectElement;
                            const qtyEl = document.getElementById('supply_qty_input') as HTMLInputElement;
                            if (!selectEl || !qtyEl || !selectEl.value || !qtyEl.value) {
                              alert('يرجى تحديد الصنف والكمية');
                              return;
                            }
                            const itemId = selectEl.value;
                            const qty = Number(qtyEl.value);
                            const selectedItem = whItems.find(i => i.id === itemId);
                            if (!selectedItem) return;
                            if (Number(selectedItem.current_quantity) < qty) {
                              alert('الكمية المطلوبة أكبر من المتاحة في المستودع!');
                              return;
                            }
                            
                            // Check if already in list
                            if (supplyForm.items.some(i => i.inventory_item_id === itemId)) {
                              alert('هذا الصنف مضاف مسبقاً في القائمة');
                              return;
                            }

                            setSupplyForm({
                              ...supplyForm,
                              items: [...supplyForm.items, {
                                inventory_item_id: selectedItem.id,
                                description: selectedItem.description,
                                quantity: qty,
                                unit_cost: Number(selectedItem.unit_cost || 0),
                                unit: selectedItem.unit
                              }]
                            });
                            // Reset inputs
                            selectEl.value = '';
                            qtyEl.value = '';
                          }}>
                            إضافة صنف للقائمة
                          </button>
                        </div>
                      </div>

                      {/* Items table */}
                      <table className="data-table" style={{ width: '100%', marginBottom: '1.25rem' }}>
                        <thead>
                          <tr>
                            <th>الصنف</th>
                            <th>الكمية</th>
                            <th>الوحدة</th>
                            <th>تكلفة الوحدة</th>
                            <th>إجمالي التكلفة</th>
                            <th>إلغاء</th>
                          </tr>
                        </thead>
                        <tbody>
                          {supplyForm.items.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد أصناف في القائمة حالياً. أضف بعض الأصناف أعلاه.</td>
                            </tr>
                          ) : (
                            supplyForm.items.map((item, index) => (
                              <tr key={index}>
                                <td style={{ fontWeight: 600 }}>{item.description}</td>
                                <td>{formatNumber(item.quantity)}</td>
                                <td>{item.unit}</td>
                                <td>{formatCurrency(item.unit_cost)}</td>
                                <td style={{ fontWeight: 600 }}>{formatCurrency(item.quantity * item.unit_cost)}</td>
                                <td>
                                  <button type="button" className="btn btn-ghost text-danger btn-sm" onClick={() => {
                                    setSupplyForm({
                                      ...supplyForm,
                                      items: supplyForm.items.filter((_, idx) => idx !== index)
                                    });
                                  }}>✕</button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>

                      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label className="form-label">ملاحظات الصرف والتوريد</label>
                        <textarea className="form-control" rows={3} value={supplyForm.notes} onChange={e => setSupplyForm({ ...supplyForm, notes: e.target.value })} placeholder="اكتب أية ملاحظات تفصيلية أو إذن الصرف اليدوي..." />
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-outline" onClick={() => setWarehouseSubTab('items')}>إلغاء</button>
                        <button type="submit" className="btn btn-primary" disabled={supplyForm.items.length === 0}>
                          💾 اعتماد الصرف وتوريد المواد للمشروع
                        </button>
                      </div>
                    </form>
                  );
                })()}

                {warehouseSubTab === 'history' && (() => {
                  const whIssues = materialIssues.filter((mi: any) => mi.warehouse_id === selectedWarehouse.id);
                  return (
                    <div>
                      <h4 style={{ marginBottom: '1rem', fontWeight: 700 }}>🔄 حركة وسجل صرف المواد (Material Issues Log)</h4>
                      {whIssues.length === 0 ? (
                        <div className="empty-state">
                          <div className="empty-state-icon">🔄</div>
                          <div className="empty-state-title">لا توجد عمليات صرف أو توريد مسجلة من هذا المستودع</div>
                        </div>
                      ) : (
                        <div className="table-wrapper">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>رقم إذن الصرف</th>
                                <th>المشروع المستلم</th>
                                <th>تاريخ الصرف</th>
                                <th>عدد الأصناف</th>
                                <th>إجمالي تكلفة الخامات</th>
                                <th>حالة مقايسة BOQ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {whIssues.map((mi: any) => (
                                <tr key={mi.id}>
                                  <td style={{ fontWeight: 700 }}>{mi.issue_number}</td>
                                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mi.project_name}</td>
                                  <td>{new Date(mi.issue_date).toLocaleDateString('ar-SA')}</td>
                                  <td>{mi.items_count} أصناف</td>
                                  <td style={{ fontWeight: 700, color: 'var(--brand-primary-light)' }}>{formatCurrency(mi.total_cost)}</td>
                                  <td>
                                    {mi.boq_warning ? (
                                      <span className="badge badge-danger">🚨 تنبيه: تجاوز كميات المقايسة</span>
                                    ) : (
                                      <span className="badge badge-success">✅ ضمن حدود المقايسة التقديرية</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {warehouseSubTab === 'audit' && (() => {
                  const whItems = inventory.filter(item => item.warehouse_id === selectedWarehouse.id);
                  return (
                    <form onSubmit={handleSaveAudit}>
                      <h4 style={{ marginBottom: '1rem', fontWeight: 700 }}>📐 حركة الجرد وتسوية فروقات المخزون</h4>
                      <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                        استخدم هذا النموذج لإجراء عمليات الجرد الفعلي للمستودع وإثبات الكميات الحقيقية وإجراء تسوية الأرصدة (Stock Adjustments).
                      </p>

                      <div className="form-grid form-grid-3" style={{ marginBottom: '1.25rem' }}>
                        <div className="form-group col-span-2">
                          <label className="form-label required">اختر الصنف المراد تسوية رصيده</label>
                          <select className="form-control" required value={auditForm.inventory_item_id} onChange={e => {
                            const itemId = e.target.value;
                            const selectedItem = whItems.find(i => i.id === itemId);
                            setAuditForm({
                              ...auditForm,
                              inventory_item_id: itemId,
                              new_quantity: selectedItem ? String(selectedItem.current_quantity) : ''
                            });
                          }}>
                            <option value="">اختر صنفاً...</option>
                            {whItems.map(i => <option key={i.id} value={i.id}>{i.description} (الرصيد الدفتري الحالي: {i.current_quantity} {i.unit})</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label required">الكمية الفعلية الجديدة (الجرد)</label>
                          <input className="form-control" type="number" required min="0" value={auditForm.new_quantity} onChange={e => setAuditForm({ ...auditForm, new_quantity: e.target.value })} placeholder="0" />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label className="form-label required">سبب تسوية الجرد / الفروقات</label>
                        <textarea className="form-control" required rows={2} value={auditForm.reason} onChange={e => setAuditForm({ ...auditForm, reason: e.target.value })} placeholder="مثال: جرد دوري شهر يوليو / تلف جزء من المواد / نقص في التوريد..." />
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-outline" onClick={() => setWarehouseSubTab('items')}>إلغاء</button>
                        <button type="submit" className="btn btn-primary">
                          💾 اعتماد تسوية الجرد وتحديث الأرصدة
                        </button>
                      </div>
                    </form>
                  );
                })()}

                {warehouseSubTab === 'report' && (() => {
                  const whItems = inventory.filter(item => item.warehouse_id === selectedWarehouse.id);
                  const totalCostVal = whItems.reduce((acc, curr) => acc + (Number(curr.current_quantity) * Number(curr.unit_cost || 0)), 0);
                  const totalSaleVal = whItems.reduce((acc, curr) => acc + (Number(curr.current_quantity) * Number(curr.sale_price || 0)), 0);
                  
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, fontWeight: 700 }}>📊 تقرير المخزون التفصيلي وصافي قيمة المستودع</h4>
                        <button className="btn btn-outline btn-sm" type="button" onClick={() => {
                          const printWindow = window.open('', '_blank');
                          if (!printWindow) return;
                          
                          const printContent = `
                            <html>
                            <head>
                              <title>تقرير مخزون مستودع - ${selectedWarehouse.name}</title>
                              <style>
                                body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
                                h2 { text-align: center; color: #1e3a8a; }
                                .meta { margin-bottom: 20px; font-size: 0.9rem; color: #555; text-align: center; }
                                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
                                th { background-color: #f2f2f2; color: #333; }
                                .total-row { font-weight: bold; background-color: #fafafa; }
                                .footer { margin-top: 40px; text-align: center; font-size: 0.8rem; color: #888; }
                              </style>
                            </head>
                            <body>
                              <h2>شركة الريق للمقاولات الكهروميكانيكية</h2>
                              <h3>تقرير جرد ومخزون مستودع: ${selectedWarehouse.name}</h3>
                              <div class="meta">
                                تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')} | الموقع: ${selectedWarehouse.location || 'غير محدد'}
                              </div>
                              <table>
                                <thead>
                                  <tr>
                                    <th>م</th>
                                    <th>اسم الصنف / الوصف</th>
                                    <th>الوحدة</th>
                                    <th>الكمية المتوفرة</th>
                                    <th>سعر الشراء (التكلفة)</th>
                                    <th>سعر البيع المقدر</th>
                                    <th>إجمالي تكلفة المشتريات</th>
                                    <th>إجمالي المبيعات المتوقعة</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${whItems.map((item, idx) => `
                                    <tr>
                                      <td>${idx + 1}</td>
                                      <td>${item.description}</td>
                                      <td>${item.unit}</td>
                                      <td>${item.current_quantity}</td>
                                      <td>${item.unit_cost} ج.م</td>
                                      <td>${item.sale_price || 0} ج.م</td>
                                      <td>${(Number(item.current_quantity) * Number(item.unit_cost)).toFixed(2)} ج.م</td>
                                      <td>${(Number(item.current_quantity) * Number(item.sale_price || 0)).toFixed(2)} ج.م</td>
                                    </tr>
                                  `).join('')}
                                  <tr class="total-row">
                                    <td colspan="6" style="text-align: left;">الإجمالي العام:</td>
                                    <td>${totalCostVal.toFixed(2)} ج.م</td>
                                    <td>${totalSaleVal.toFixed(2)} ج.m</td>
                                  </tr>
                                </tbody>
                              </table>
                              <div class="footer">تم إنشاء التقرير آلياً بواسطة نظام الريق لإدارة المشاريع</div>
                            </body>
                            </html>
                          `;
                          printWindow.document.write(printContent);
                          printWindow.document.close();
                          printWindow.print();
                        }}>
                          🖨️ طباعة تقرير المخازن والجرد
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1.25rem' }}>
                        <div style={{ border: '1px solid var(--border-normal)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.01)' }}>
                          <h5 style={{ marginTop: 0, fontWeight: 700, borderBottom: '1px solid var(--border-normal)', paddingBottom: '0.5rem' }}>💰 التقييم المالي للمستودع</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>إجمالي رأس المال المستثمر (سعر الشراء):</span>
                              <strong style={{ fontSize: '1.05rem' }}>{formatCurrency(totalCostVal)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>إجمالي قيمة المبيعات المتوقعة للأرصدة:</span>
                              <strong style={{ fontSize: '1.05rem', color: 'var(--brand-primary-light)' }}>{formatCurrency(totalSaleVal)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                              <span>الأرباح الكامنة التقديرية (صافي الفارق):</span>
                              <strong style={{ fontSize: '1.1rem', color: totalSaleVal - totalCostVal >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                {formatCurrency(totalSaleVal - totalCostVal)}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div style={{ border: '1px solid var(--border-normal)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.01)' }}>
                          <h5 style={{ marginTop: 0, fontWeight: 700, borderBottom: '1px solid var(--border-normal)', paddingBottom: '0.5rem' }}>📊 مؤشرات توزيع المخزون</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>عدد الأصناف المتوفرة:</span>
                              <strong>{whItems.length} صنف</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>أصناف تخطت كمية الأمان (كافٍ):</span>
                              <strong style={{ color: 'var(--status-success)' }}>{whItems.filter(i => Number(i.current_quantity) > Number(i.min_quantity)).length} صنف</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>أصناف تحت حد الطلب (حرجة):</span>
                              <strong style={{ color: 'var(--status-danger)' }}>{whItems.filter(i => Number(i.current_quantity) <= Number(i.min_quantity)).length} صنف ⚠️</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          ) : (
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
                          <th style={{ textAlign: 'center', width: '220px' }}>العمليات</th>
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
                                <button className="btn btn-primary btn-sm" onClick={() => { setSelectedWarehouse(wh); setWarehouseSubTab('items'); }}>👁️ دخول</button>
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
        </>
      )}

      {/* ======================== TAB: MATERIAL ISSUES ======================== */}
      {activeTab === 'material_issues' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">🏗️ إذون صرف خامات ومواد للمواقف والأنشطة</div>
              <div className="page-description">صرف الخامات المسحوبة للمواقع وقيد التكلفة المباشرة وتنبيهات تجاوز كميات المقايسة التقديرية (BOQ)</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowIssueModal(true)}>+ إصدار إذن صرف خامات لموقع</button>
            </div>
          </div>

          <div className="card">
            {materialIssues.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏗️</div>
                <div className="empty-state-title">لا توجد إذون صرف خامات مسجلة حالياً</div>
                <button className="btn btn-primary" onClick={() => setShowIssueModal(true)} style={{ marginTop: '1rem' }}>إصدار أول إذن صرف لموقع</button>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم إذن الصرف</th>
                      <th>المشروع المستلم</th>
                      <th>المخزن المورد</th>
                      <th>التاريخ</th>
                      <th>إجمالي تكلفة الخامات المسحوبة</th>
                      <th>حالة المقايسة التقديرية (BOQ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialIssues.map((mi: any) => (
                      <tr key={mi.id}>
                        <td style={{ fontWeight: 700 }}>{mi.issue_number}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mi.project_name}</td>
                        <td>{mi.warehouse_name}</td>
                        <td>{new Date(mi.issue_date).toLocaleDateString('ar-SA')}</td>
                        <td style={{ fontWeight: 700, color: '#1e3a8a' }}>{formatCurrency(mi.total_cost)}</td>
                        <td>
                          {mi.boq_warning ? (
                            <span className="badge badge-danger" title={mi.warning_message}>🚨 تنبيه: تجاوز كميات المقايسة</span>
                          ) : (
                            <span className="badge badge-success">✅ ضمن حدود المقايسة التقديرية</span>
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

      {/* ======================== TAB: TRANSFERS ======================== */}
      {activeTab === 'transfers' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">🔄 أوامر تحويل الخامات والعَدَد بين المخازن (Transfer Orders)</div>
              <div className="page-description">تحويل الخامات والأدوات والمعدات بين المستودع الرئيسي ومخازن المواقع وتحديث الأرصدة فوراً</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowTransferModal(true)}>+ أمر تحويل جديد بين المخازن</button>
            </div>
          </div>

          <div className="card">
            {warehouseTransfers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔄</div>
                <div className="empty-state-title">لا توجد أوامر تحويل خامات وعَدَد مسجلة حالياً</div>
                <button className="btn btn-primary" onClick={() => setShowTransferModal(true)} style={{ marginTop: '1rem' }}>تنفيذ أول أمر تحويل</button>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم أمر التحويل</th>
                      <th>من المخزن (المصدر)</th>
                      <th>إلى المخزن (المستهدف)</th>
                      <th>تاريخ التحويل</th>
                      <th>عدد الأصناف المحولة</th>
                      <th>حالة أمر التحويل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warehouseTransfers.map((wt: any) => (
                      <tr key={wt.id}>
                        <td style={{ fontWeight: 700 }}>{wt.transfer_number}</td>
                        <td style={{ color: '#dc2626', fontWeight: 600 }}>{wt.from_warehouse_name}</td>
                        <td style={{ color: '#16a34a', fontWeight: 600 }}>{wt.to_warehouse_name}</td>
                        <td>{new Date(wt.transfer_date).toLocaleDateString('ar-SA')}</td>
                        <td style={{ fontWeight: 600 }}>{wt.items_count} صنف</td>
                        <td><span className="badge badge-success">تم التحويل وتحديث الأرصدة بنجاح</span></td>
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
                 <div className="form-group col-span-2">
                  <label className="form-label">سعر الشراء للوحدة (التكلفة) ({currencySymbol})</label>
                  <input className="form-control" type="number" value={inventoryForm.unit_cost} onChange={e => setInventoryForm({...inventoryForm, unit_cost: e.target.value})} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">سعر البيع المقدر للوحدة ({currencySymbol})</label>
                  <input className="form-control" type="number" value={inventoryForm.sale_price} onChange={e => setInventoryForm({...inventoryForm, sale_price: e.target.value})} placeholder="0.00" />
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

      {/* ======================== MODAL: EDIT REQUEST ======================== */}
      {showEditRequestModal && editingRequest && (
        <div className="modal-overlay" onClick={() => setShowEditRequestModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">✏️ تعديل طلب توريد مواد: {editingRequest.request_number}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEditRequestModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveRequestEdit}>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">حالة الطلب</label>
                  <select
                    className="form-control"
                    value={requestEditForm.status}
                    onChange={e => setRequestEditForm({ ...requestEditForm, status: e.target.value })}
                  >
                    <option value="pending">🟡 قيد المراجعة</option>
                    <option value="approved">🟣 تمت الموافقة</option>
                    <option value="purchased">🔵 تم الشراء</option>
                    <option value="received">🟢 تم الاستلام بالموقع</option>
                    <option value="rejected">🔴 مرفوض</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">الأولوية</label>
                  <select
                    className="form-control"
                    value={requestEditForm.priority}
                    onChange={e => setRequestEditForm({ ...requestEditForm, priority: e.target.value })}
                  >
                    <option value="normal">عادي</option>
                    <option value="high">مرتفع</option>
                    <option value="urgent">عاجل جداً 🚨</option>
                    <option value="low">منخفض</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ الحاجة المتوقع</label>
                  <input
                    className="form-control"
                    type="date"
                    value={requestEditForm.required_date}
                    onChange={e => setRequestEditForm({ ...requestEditForm, required_date: e.target.value })}
                  />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">ملاحظات إضافية</label>
                  <textarea
                    className="form-control"
                    value={requestEditForm.notes}
                    onChange={e => setRequestEditForm({ ...requestEditForm, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowEditRequestModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: CREATE MATERIAL ISSUE ======================== */}
      {showIssueModal && (
        <div className="modal-overlay" onClick={() => setShowIssueModal(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🏗️ إصدار إذن صرف خامات ومواد لموقع / مشروع</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowIssueModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateMaterialIssue}>
              <div className="form-grid form-grid-3" style={{ marginBottom: '1.25rem' }}>
                <div className="form-group col-span-2">
                  <label className="form-label required">المشروع المستلم للخامات</label>
                  <select className="form-control" required value={issueForm.project_id} onChange={e => setIssueForm({...issueForm, project_id: e.target.value})}>
                    <option value="">-- اختر المشروع المستهدف --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">المخزن المورد (مصدر الصرف)</label>
                  <select className="form-control" required value={issueForm.warehouse_id} onChange={e => setIssueForm({...issueForm, warehouse_id: e.target.value})}>
                    <option value="">-- اختر المخزن --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📦 بنود الأصناف والخامات المسحوبة:</span>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => {
                  setIssueForm({
                    ...issueForm,
                    items: [...issueForm.items, { inventory_item_id: '', item_description: '', quantity: 1, unit: 'وحدة', unit_cost: 0 }]
                  });
                }}>+ إضافة صنف إضافي</button>
              </div>

              {issueForm.items.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>اختر من رصيد المخزن أو اكتب الوصف:</label>
                    <select
                      className="form-control"
                      value={item.inventory_item_id}
                      onChange={e => {
                        const invItem = inventory.find(i => i.id === e.target.value);
                        const newItems = [...issueForm.items];
                        newItems[idx] = {
                          ...newItems[idx],
                          inventory_item_id: e.target.value,
                          item_description: invItem ? invItem.description : newItems[idx].item_description,
                          unit: invItem ? invItem.unit : newItems[idx].unit,
                          unit_cost: invItem ? Number(invItem.unit_cost || 0) : newItems[idx].unit_cost
                        };
                        setIssueForm({...issueForm, items: newItems});
                      }}
                    >
                      <option value="">-- اختر من مخزون الجرد الحالي --</option>
                      {inventory.map(inv => (
                        <option key={inv.id} value={inv.id}>{inv.description} (متوفر: {inv.current_quantity} {inv.unit} - {formatCurrency(inv.unit_cost)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>الكمية المسحوبة:</label>
                    <input className="form-control" type="number" step="any" required value={item.quantity} onChange={e => {
                      const newItems = [...issueForm.items];
                      newItems[idx].quantity = Number(e.target.value);
                      setIssueForm({...issueForm, items: newItems});
                    }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>سعر الوحدة ({currencySymbol}):</label>
                    <input className="form-control" type="number" step="any" value={item.unit_cost} onChange={e => {
                      const newItems = [...issueForm.items];
                      newItems[idx].unit_cost = Number(e.target.value);
                      setIssueForm({...issueForm, items: newItems});
                    }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>إجمالي الصنف:</label>
                    <div style={{ padding: '0.5rem', fontWeight: 'bold', color: '#1e3a8a' }}>
                      {formatCurrency(Number(item.quantity || 0) * Number(item.unit_cost || 0))}
                    </div>
                  </div>
                  {issueForm.items.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => {
                      const newItems = issueForm.items.filter((_, i) => i !== idx);
                      setIssueForm({...issueForm, items: newItems});
                    }}>🗑️</button>
                  )}
                </div>
              ))}

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">ملاحظات وقيد الصرف</label>
                <textarea className="form-control" rows={2} value={issueForm.notes} onChange={e => setIssueForm({...issueForm, notes: e.target.value})} placeholder="بيانات سائق النقل، ملاحظات الجودة والمقايسة..." />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowIssueModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 إذن الصرف وقيد التكلفة المباشرة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: CREATE TRANSFER ORDER ======================== */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🔄 أمر تحويل خامات وعَدَد بين المخازن (Transfer Order)</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowTransferModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTransferOrder}>
              <div className="form-grid form-grid-2" style={{ marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label required">من المخزن (المصدر)</label>
                  <select className="form-control" required value={transferForm.from_warehouse_id} onChange={e => setTransferForm({...transferForm, from_warehouse_id: e.target.value})}>
                    <option value="">-- اختر المخزن المصدر --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">إلى المخزن (المستهدف)</label>
                  <select className="form-control" required value={transferForm.to_warehouse_id} onChange={e => setTransferForm({...transferForm, to_warehouse_id: e.target.value})}>
                    <option value="">-- اختر المخزن المستهدف --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📦 الخامات والأدوات والعَدَد المراد تحويلها:</span>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => {
                  setTransferForm({
                    ...transferForm,
                    items: [...transferForm.items, { inventory_item_id: '', item_description: '', quantity: 1, unit: 'وحدة', unit_cost: 0 }]
                  });
                }}>+ إضافة صنف إضافي</button>
              </div>

              {transferForm.items.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>اختر الصنف المراد تحويله:</label>
                    <select
                      className="form-control"
                      value={item.inventory_item_id}
                      onChange={e => {
                        const invItem = inventory.find(i => i.id === e.target.value);
                        const newItems = [...transferForm.items];
                        newItems[idx] = {
                          ...newItems[idx],
                          inventory_item_id: e.target.value,
                          item_description: invItem ? invItem.description : newItems[idx].item_description,
                          unit: invItem ? invItem.unit : newItems[idx].unit,
                          unit_cost: invItem ? Number(invItem.unit_cost || 0) : newItems[idx].unit_cost
                        };
                        setTransferForm({...transferForm, items: newItems});
                      }}
                    >
                      <option value="">-- اختر من مخزون الجرد الحالي --</option>
                      {inventory.map(inv => (
                        <option key={inv.id} value={inv.id}>{inv.description} (مخزن: {inv.warehouse_name} - رصيد: {inv.current_quantity} {inv.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>الكمية المحولة:</label>
                    <input className="form-control" type="number" step="any" required value={item.quantity} onChange={e => {
                      const newItems = [...transferForm.items];
                      newItems[idx].quantity = Number(e.target.value);
                      setTransferForm({...transferForm, items: newItems});
                    }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>الوحدة:</label>
                    <input className="form-control" value={item.unit} onChange={e => {
                      const newItems = [...transferForm.items];
                      newItems[idx].unit = e.target.value;
                      setTransferForm({...transferForm, items: newItems});
                    }} />
                  </div>
                  {transferForm.items.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => {
                      const newItems = transferForm.items.filter((_, i) => i !== idx);
                      setTransferForm({...transferForm, items: newItems});
                    }}>🗑️</button>
                  )}
                </div>
              ))}

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">ملاحظات أمر التحويل</label>
                <textarea className="form-control" rows={2} value={transferForm.notes} onChange={e => setTransferForm({...transferForm, notes: e.target.value})} placeholder="بيانات سيارة النقل والمسؤول عن الاستلام..." />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowTransferModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 تنفيذ أمر التحويل وتحديث الأرصدة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
