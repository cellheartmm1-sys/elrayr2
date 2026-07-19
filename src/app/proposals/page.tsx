'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';

interface TechItem {
  id: string;
  title: string;
  specs: string;
  quantity: string | number;
  unit: string;
  warranty: string;
}

interface FinItem {
  id: string;
  description: string;
  category: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

interface Proposal {
  id?: string;
  proposal_code?: string;
  title: string;
  client_name: string;
  scope_text: string;
  terms_text: string;
  technical_items: TechItem[];
  financial_items: FinItem[];
  vat_percentage: number;
  created_at?: string;
}

export default function ProposalsPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState('ر.س');
  const [showPrintModal, setShowPrintModal] = useState(false);

  const defaultEcosystemProposal: Proposal = {
    proposal_code: 'ERP-PROP-2026',
    title: 'عرض فني ومالي شامـل لتطوير وتسليم نظام الرايق Enterprise ERP والموقع الإلكتروني المؤسسي',
    client_name: 'رئيس مجلس الإدارة / صاحب مؤسسة الرايق للمقاولات الكهروميكانيكية',
    scope_text: `يتضمن هذا العرض الفني والمالي تصميم، تطوير، وتأهيل المنظومة الرقمية الشاملة لمؤسسة الرايق للمقاولات الكهروميكانيكية.\nتشمل المنظومة المسلمة:\n١. موقع إلكتروني تعريفي سياحي وسينمائي واحترافي (Landing Page) يتوافق مع كبرى الشركات المليارية لاستعراض قطاعات أعمال المؤسسة، السلايدر التفاعلي، وتلقي طلبات المباشرة والشراكة.\n٢. نظام إدارة الموارد الرقمية الموحد (Enterprise ERP System) للربط المباشر بين لوحة التحكم المالية، المشاريع، المشتريات، الموارد البشرية، الصيانة، والحفظ السحابي في Cloudflare R2.`,
    terms_text: `١. مدة التطوير والتأهيل والتسليم: ٦٠ يوماً تقويمياً شاملة رفع النظام وإتاحة السيرفرات وتدريب الكوادر.\n٢. الدفعات المالية: ٣٠٪ دفعة مقدمة عند التوقيع، ٥٠٪ عند تسليم المرحلة الأولى للنظام والموقع، و٢٠٪ عند الاعتماد والتسليم النهائي.\n٣. فترات الضمان والدعم الفني: ضمان برمجي كامل لمدة 12 شهراً مع الدعم الفني المجاني واستصدار النسخ الاحتياطية السحابية.`,
    vat_percentage: 15,
    technical_items: [
      {
        id: 't1',
        title: 'الموقع الإلكتروني الشامل (Corporate Landing Page)',
        specs: 'تصميم سينمائي فخم بتأثيرات Dark Glassmorphism، سلايدر صور تفاعلي 8K للمشاريع الكهروميكانيكية والتكييف والإطفاء، عداد الإنجازات، شريط الشركاء، وفورمة استلام طلبات الشراكة المربوطة بالداشبورد.',
        quantity: 1,
        unit: 'منصة كاملة',
        warranty: 'سنة دعم فني واستضافة'
      },
      {
        id: 't2',
        title: 'موديول إدارة المشاريع والنسب ونطاق BOQ',
        specs: 'شاشة متابعة تقدم المشاريع الفعلي vs المخطط، جدول الكميات، مراحل الإنجاز، وإدارة عقود المشاريع.',
        quantity: 1,
        unit: 'موديول برلمجي',
        warranty: 'ضمان برمجي شامل'
      },
      {
        id: 't3',
        title: 'موديول المالية والتدفقات النقدية والتقارير المطبوعة',
        specs: 'إصدار مستخلصات الملاك المعتمدة، مستخلصات مقاولي الباطن، كشف المصروفات والمديونيات، وتوليد تقارير مالية يومية وشهرية مطبوعة.',
        quantity: 1,
        unit: 'موديول برلمجي',
        warranty: 'ضمان برمجي شامل'
      },
      {
        id: 't4',
        title: 'موديول المشتريات والمستودعات والعهد',
        specs: 'أتمتة طلبات الشراء، تحويلات المواد بين المواقع والمخازن، ومتابعة رصيد العهد والأصناف.',
        quantity: 1,
        unit: 'موديول برلمجي',
        warranty: 'ضمان برمجي شامل'
      },
      {
        id: 't5',
        title: 'موديول الموارد البشرية الأجور والعمالة اليومية',
        specs: 'تسجيل الحضور والإنصراف، السلف، الأوقات الإضافية، حساب الرواتب، وإدارة عمالة مقاولي الباطن اليومية.',
        quantity: 1,
        unit: 'موديول برلمجي',
        warranty: 'ضمان برمجي شامل'
      },
      {
        id: 't6',
        title: 'منظومة الأمان والنسخ السحابي التلقائي Cloudflare R2',
        specs: 'أكونت مدير النظام محدد mahfouz مع صلاحية الاعتمادات المزدوجة والتخزين السحابي الآمن التلقائي كل ٨ ساعات.',
        quantity: 1,
        unit: 'نظام أمان سحابي',
        warranty: 'تحديثات مستمرة'
      }
    ],
    financial_items: [
      {
        id: 'f1',
        description: 'تصميم وتطوير وتدشين الموقع الإلكتروني المؤسسي (Landing Page)',
        category: 'تطوير وتصميم',
        unitPrice: 25000,
        quantity: 1,
        totalPrice: 25000
      },
      {
        id: 'f2',
        description: 'برمجة وتأهيل موديول إدارة المشاريع والنسب وجداول الكميات',
        category: 'برمجة وتأهيل',
        unitPrice: 45000,
        quantity: 1,
        totalPrice: 45000
      },
      {
        id: 'f3',
        description: 'برمجة وتأهيل موديول المالية، المستخلصات، والتقارير المالية المطبوعة',
        category: 'برمجة وتأهيل',
        unitPrice: 60000,
        quantity: 1,
        totalPrice: 60000
      },
      {
        id: 'f4',
        description: 'برمجة وتأهيل موديول المشتريات والمستودعات والعهد والكميات',
        category: 'برمجة وتأهيل',
        unitPrice: 35000,
        quantity: 1,
        totalPrice: 35000
      },
      {
        id: 'f5',
        description: 'برمجة وتأهيل موديول الموارد البشرية والرواتب والعمالة اليومية',
        category: 'برمجة وتأهيل',
        unitPrice: 40000,
        quantity: 1,
        totalPrice: 40000
      },
      {
        id: 'f6',
        description: 'برمجة موديول الصيانة والتشغيل وتذاكر الأعطال للمنشآت',
        category: 'برمجة وتأهيل',
        unitPrice: 25000,
        quantity: 1,
        totalPrice: 25000
      },
      {
        id: 'f7',
        description: 'ربط السيرفرات والأمان والنسخ السحابي التلقائي Cloudflare R2',
        category: 'أمان وتكامل',
        unitPrice: 20000,
        quantity: 1,
        totalPrice: 20000
      },
      {
        id: 'f8',
        description: 'الاستضافة، الدعم الفني، والتدريب المجاني للكوادر لمدة سنة كاملة',
        category: 'دعم واستضافة',
        unitPrice: 15000,
        quantity: 1,
        totalPrice: 15000
      }
    ]
  };

  const [currentProposal, setCurrentProposal] = useState<Proposal>(defaultEcosystemProposal);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('user_role');
      setIsAdmin(role === 'admin');
      setCurrencySymbol(localStorage.getItem('system_currency_symbol') || 'ر.س');
    }
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proposals');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setProposals(data);
        if (!selectedProposalId) {
          setSelectedProposalId(data[0].id);
          setCurrentProposal(data[0]);
        }
      } else {
        // If DB is empty, use default ecosystem proposal
        setProposals([defaultEcosystemProposal]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProposal = (id: string) => {
    setSelectedProposalId(id);
    const found = proposals.find(p => p.id === id);
    if (found) setCurrentProposal(found);
  };

  const handleCreateNewProposal = () => {
    setSelectedProposalId('');
    setCurrentProposal({
      title: 'عرض فني ومالي جديد للنظام والمشروع',
      client_name: 'صاحب المؤسسة / العميل',
      scope_text: 'أدخل تفاصيل ومواصفات النظام أو المشروع الفنية هنا...',
      terms_text: 'أدخل الشروط، الدفعات المالية، وفترات الضمان والتسليم هنا...',
      vat_percentage: 15,
      technical_items: [],
      financial_items: []
    });
  };

  // Technical Item Handlers
  const handleAddTechItem = () => {
    const newItem: TechItem = {
      id: `t_${Date.now()}`,
      title: 'بند فني / موديول جديد',
      specs: 'المواصفات الفنية والميزات...',
      quantity: 1,
      unit: 'موديول',
      warranty: 'سنة واحدة'
    };
    setCurrentProposal(p => ({
      ...p,
      technical_items: [...p.technical_items, newItem]
    }));
  };

  const handleUpdateTechItem = (id: string, field: keyof TechItem, value: any) => {
    setCurrentProposal(p => ({
      ...p,
      technical_items: p.technical_items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleDeleteTechItem = (id: string) => {
    setCurrentProposal(p => ({
      ...p,
      technical_items: p.technical_items.filter(item => item.id !== id)
    }));
  };

  // Financial Item Handlers
  const handleAddFinItem = () => {
    const newItem: FinItem = {
      id: `f_${Date.now()}`,
      description: 'بند تسعير / موديول مالي جديد',
      category: 'برمجة وتأهيل',
      unitPrice: 0,
      quantity: 1,
      totalPrice: 0
    };
    setCurrentProposal(p => ({
      ...p,
      financial_items: [...p.financial_items, newItem]
    }));
  };

  const handleUpdateFinItem = (id: string, field: keyof FinItem, value: any) => {
    setCurrentProposal(p => ({
      ...p,
      financial_items: p.financial_items.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'unitPrice' || field === 'quantity') {
          updated.totalPrice = Number(updated.unitPrice || 0) * Number(updated.quantity || 0);
        }
        return updated;
      })
    }));
  };

  const handleDeleteFinItem = (id: string) => {
    setCurrentProposal(p => ({
      ...p,
      financial_items: p.financial_items.filter(item => item.id !== id)
    }));
  };

  // Financial Calculations
  const subtotal = currentProposal.financial_items.reduce((acc, item) => acc + (Number(item.totalPrice) || 0), 0);
  const vatAmount = subtotal * ((currentProposal.vat_percentage || 15) / 100);
  const grandTotal = subtotal + vatAmount;

  // Save Proposal Handler
  const handleSaveProposal = async () => {
    setSaving(true);
    try {
      const isEdit = !!currentProposal.id;
      const res = await fetch('/api/proposals', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentProposal)
      });
      const data = await res.json();
      if (res.ok) {
        alert('✅ تم حفظ العرض الفني والمالي للنظام بنجاح!');
        fetchProposals();
        if (data.id) {
          setSelectedProposalId(data.id);
          setCurrentProposal(data);
        }
      } else {
        alert(`❌ فشل الحفظ: ${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ خطأ: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete Proposal Handler
  const handleDeleteProposal = async () => {
    if (!currentProposal.id) return;
    if (!confirm('هل أنت متأكد من حذف هذا العرض الفني والمالي بشكل نهائي؟')) return;
    try {
      const res = await fetch(`/api/proposals?id=${currentProposal.id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('✅ تم حذف العرض بنجاح.');
        handleCreateNewProposal();
        fetchProposals();
      }
    } catch (err: any) {
      alert(`❌ خطأ: ${err.message}`);
    }
  };

  if (isAdmin === false) {
    return (
      <AppLayout title="العروض الفنية والمالية للنظام" subtitle="صفحة مخصصة لإدارة العروض والمواصفات للمدير فقط" icon="📑">
        <div className="card" style={{ padding: '3rem', textAlign: 'center', margin: '2rem auto', maxWidth: '600px', border: '1px solid #ef4444' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⛔</div>
          <h2 style={{ color: '#ef4444', fontSize: '1.6rem', fontWeight: 800 }}>صفحة مخصصة لمدير النظام (Admin Only)</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: '1.8' }}>
            عذراً، هذه الصفحة وسجل العروض الفنية والمالية لبيع وتأهيل النظام متاحة حصرياً لحساب مدير النظام فقط.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="العرض الفني والمالي لبيع وتطوير النظام والموقع" subtitle="عرض شامل للمميزات، والمواصفات الفنية، والتسعير المالي لتسليم النظام والـ Landing Page لصاحب المؤسسة" icon="📑">
      {/* Action Header & Proposal Selector */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>اختر العرض الفني والمالي:</label>
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '300px' }}
              value={selectedProposalId}
              onChange={e => handleSelectProposal(e.target.value)}
            >
              <option value="">+ إنشاء عرض جديد</option>
              {proposals.map(p => (
                <option key={p.id || 'default'} value={p.id}>
                  {p.proposal_code ? `[${p.proposal_code}] ` : ''}{p.title}
                </option>
              ))}
            </select>
            <button className="btn btn-outline" onClick={handleCreateNewProposal}>+ عرض جديد</button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {currentProposal.id && (
              <button className="btn btn-danger-text" onClick={handleDeleteProposal}>🗑️ حذف العرض</button>
            )}
            <button className="btn btn-primary" onClick={handleSaveProposal} disabled={saving}>
              {saving ? 'جاري الحفظ...' : '💾 حفظ العرض والتعديلات'}
            </button>
            <button className="btn btn-accent" onClick={() => setShowPrintModal(true)}>
              🖨️ معاينة وتصدير PDF رسمى
            </button>
          </div>
        </div>
      </div>

      {/* Main Proposal Editor Card */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        {/* Proposal Meta Form */}
        <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-color)', marginBottom: '1.25rem' }}>
            📋 البيانات الأساسية للعرض الفني والمالي الموجه لصاحب المؤسسة
          </h3>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label required">عنوان العرض الفني والمالي لبيع النظام</label>
              <input
                className="form-control"
                required
                value={currentProposal.title}
                onChange={e => setCurrentProposal({ ...currentProposal, title: e.target.value })}
                placeholder="عنوان العرض الفني والمالي..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">الجهة / الموجه له العرض (صاحب الشركة / المالك)</label>
              <input
                className="form-control"
                value={currentProposal.client_name}
                onChange={e => setCurrentProposal({ ...currentProposal, client_name: e.target.value })}
                placeholder="رئيس مجلس الإدارة / صاحب المؤسسة..."
              />
            </div>
          </div>
        </div>

        {/* SECTION 1: TECHNICAL SCOPE & SPECS */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', margin: 0 }}>
              💻 أولاً: المواصفات الفنية والموديولات المسلمة في النظام والموقع (Technical Proposal)
            </h3>
            <button className="btn btn-sm btn-outline" onClick={handleAddTechItem}>
              + إضافة بند فني / موديول جديد
            </button>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">الشرح العام ونطاق العمل الرقمي المسلم لصاحب المؤسسة (Scope of Work)</label>
            <textarea
              className="form-control"
              rows={5}
              value={currentProposal.scope_text}
              onChange={e => setCurrentProposal({ ...currentProposal, scope_text: e.target.value })}
              placeholder="اكتب الشرح ونطاق التسليم الفني والميزات المعتمدة هنا..."
            />
          </div>

          {/* Technical Items Table */}
          <div className="table-responsive" style={{ background: 'var(--bg-subtle)', borderRadius: '12px', padding: '0.5rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>عنوان الموديول / الخدمة البرمجية</th>
                  <th style={{ width: '40%' }}>المواصفات والمميزات الفنية المعتمدة</th>
                  <th style={{ width: '12%' }}>الكمية والوحدة</th>
                  <th style={{ width: '15%' }}>فترة الضمان والدعم</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {currentProposal.technical_items.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                      لا توجد بنود فنية مدرجة. اضغط على "+ إضافة بند فني جديد" للبدء.
                    </td>
                  </tr>
                ) : (
                  currentProposal.technical_items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          className="form-control form-control-sm"
                          value={item.title}
                          onChange={e => handleUpdateTechItem(item.id, 'title', e.target.value)}
                          placeholder="اسم الموديول أو الخدمة..."
                        />
                      </td>
                      <td>
                        <textarea
                          className="form-control form-control-sm"
                          rows={2}
                          value={item.specs}
                          onChange={e => handleUpdateTechItem(item.id, 'specs', e.target.value)}
                          placeholder="المميزات والمواصفات الفنية..."
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            style={{ width: '60px' }}
                            value={item.quantity}
                            onChange={e => handleUpdateTechItem(item.id, 'quantity', e.target.value)}
                          />
                          <input
                            className="form-control form-control-sm"
                            style={{ width: '70px' }}
                            value={item.unit}
                            onChange={e => handleUpdateTechItem(item.id, 'unit', e.target.value)}
                            placeholder="الوحدة"
                          />
                        </div>
                      </td>
                      <td>
                        <input
                          className="form-control form-control-sm"
                          value={item.warranty}
                          onChange={e => handleUpdateTechItem(item.id, 'warranty', e.target.value)}
                          placeholder="الضمان والدعم"
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-sm btn-outline btn-danger-text"
                          onClick={() => handleDeleteTechItem(item.id)}
                          title="حذف البند الفني"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2: FINANCIAL PROPOSAL & BOQ */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', margin: 0 }}>
              💰 ثانياً: العرض المالي وجدول التسعير لبيع وتأهيل النظام كامل (Financial Proposal BOQ)
            </h3>
            <button className="btn btn-sm btn-outline" onClick={handleAddFinItem}>
              + إضافة بند مالي جديد
            </button>
          </div>

          {/* Financial Pricing Table */}
          <div className="table-responsive" style={{ background: 'var(--bg-subtle)', borderRadius: '12px', padding: '0.5rem', marginBottom: '1.5rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>بيان الموديول / التجهيزات البرمجية</th>
                  <th style={{ width: '15%' }}>الفئة</th>
                  <th style={{ width: '15%' }}>سعر البند ({currencySymbol})</th>
                  <th style={{ width: '10%' }}>الكمية</th>
                  <th style={{ width: '17%', textAlign: 'left' }}>الإجمالي المالي ({currencySymbol})</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {currentProposal.financial_items.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                      لا توجد بنود مالية مدرجة. اضغط على "+ إضافة بند مالي جديد" للبدء.
                    </td>
                  </tr>
                ) : (
                  currentProposal.financial_items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          className="form-control form-control-sm"
                          value={item.description}
                          onChange={e => handleUpdateFinItem(item.id, 'description', e.target.value)}
                          placeholder="وصف وتكلفة البند..."
                        />
                      </td>
                      <td>
                        <select
                          className="form-control form-control-sm"
                          value={item.category}
                          onChange={e => handleUpdateFinItem(item.id, 'category', e.target.value)}
                        >
                          <option value="تطوير وتصميم">تطوير وتصميم</option>
                          <option value="برمجة وتأهيل">برمجة وتأهيل</option>
                          <option value="أمان وتكامل">أمان وتكامل</option>
                          <option value="دعم واستضافة">دعم واستضافة</option>
                          <option value="تدريب وتأهيل">تدريب وتأهيل</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.unitPrice}
                          onChange={e => handleUpdateFinItem(item.id, 'unitPrice', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.quantity}
                          onChange={e => handleUpdateFinItem(item.id, 'quantity', e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: 'left', fontWeight: 700, color: '#10b981' }}>
                        {(Number(item.totalPrice) || 0).toLocaleString('ar-EG')} {currencySymbol}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-sm btn-outline btn-danger-text"
                          onClick={() => handleDeleteFinItem(item.id)}
                          title="حذف البند المالي"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>إجمالي الأعمال قبل الضريبة</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }} suppressHydrationWarning>
                {subtotal.toLocaleString('ar-EG')} {currencySymbol}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ضريبة القيمة المضافة ({currentProposal.vat_percentage || 15}%)</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }} suppressHydrationWarning>
                {vatAmount.toLocaleString('ar-EG')} {currencySymbol}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700 }}>الإجمالي النهائي الشامل لبيع وتسليم النظام</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', marginTop: '0.25rem' }} suppressHydrationWarning>
                {grandTotal.toLocaleString('ar-EG')} {currencySymbol}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: TERMS & CONDITIONS */}
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b', marginBottom: '1rem' }}>
            📜 ثالثاً: الشروط والأحكام وفترات الدفع والتسليم (Terms & Payment Conditions)
          </h3>
          <div className="form-group">
            <textarea
              className="form-control"
              rows={4}
              value={currentProposal.terms_text}
              onChange={e => setCurrentProposal({ ...currentProposal, terms_text: e.target.value })}
              placeholder="اكتب الدفعات المالية، الشروط، وفترات الضمان والتسليم هنا..."
            />
          </div>
        </div>
      </div>

      {/* ======================== PRINT PREVIEW MODAL ======================== */}
      {showPrintModal && (
        <div className="modal-overlay print-modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="modal modal-xl print-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', background: 'var(--card-bg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header print-actions" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <div className="modal-title">🖨️ معاينة وتصدير العرض الفني والمالي لبيع النظام (PDF)</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة العرض الآن</button>
                <button className="btn btn-ghost" onClick={() => setShowPrintModal(false)}>إغلاق</button>
              </div>
            </div>

            <div className="print-container" style={{ direction: 'rtl', padding: '2.5rem', background: '#fff', color: '#000', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <style dangerouslySetInnerHTML={{ __html: `
                @page { size: A4 portrait; margin: 10mm; }
                @media print {
                  html, body { background: #fff !important; color: #000 !important; }
                  body * { visibility: hidden !important; }
                  .print-container, .print-container * { visibility: visible !important; }
                  .print-container { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 0 !important; background: #fff !important; color: #000 !important; }
                  .print-modal-overlay { position: static !important; background: transparent !important; padding: 0 !important; display: block !important; }
                  .print-modal-content { max-height: none !important; background: transparent !important; border: none !important; padding: 0 !important; max-width: 100% !important; }
                  .print-actions { display: none !important; }
                }
              ` }} />

              {/* Official Document Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#000', fontWeight: 800 }}>مؤسسة الرايق للمقاولات الكهروميكانيكية</h2>
                  <div style={{ fontSize: '0.85rem', color: '#444', marginTop: '0.25rem' }}>
                    سجل تجاري: ١٠١٠١٢٣٤٥٦ | الرقم الضريبي: ٣٠٠٠١٢٣٤٥٦٠٠٠٠٣
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#444' }}>العنوان: القاهرة / الرياض | البريد: info@alrayeq.com</div>
                </div>
                <img src="/logo.jpg" alt="Logo" style={{ width: '85px', height: '85px', objectFit: 'contain' }} />
              </div>

              {/* Title & Metadata */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', textDecoration: 'underline', color: '#000', fontWeight: 800 }}>
                  العرض الفني والمالي لتطوير وتأهيل نظام ERP والموقع الإلكتروني
                </h2>
                <div style={{ fontSize: '0.95rem', color: '#333', marginTop: '0.4rem', fontWeight: 600 }}>
                  الموضوع: {currentProposal.title}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.2rem' }}>
                  الجهة الموجه لها العرض: <strong>{currentProposal.client_name || 'رئيس مجلس الإدارة / صاحب المؤسسة'}</strong> | التاريخ: {new Date().toLocaleDateString('ar-EG')}
                </div>
              </div>

              {/* Technical Scope Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid #000', paddingBottom: '0.4rem', color: '#000', fontWeight: 800 }}>
                  أولاً: النطاق الفني والمواصفات والأنظمة البرمجية المسلمة
                </h3>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: '#222' }}>
                  {currentProposal.scope_text}
                </p>

                {currentProposal.technical_items.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'right' }}>الموديول / المنصة</th>
                        <th style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'right' }}>المواصفات الفنية والمميزات البرمجية</th>
                        <th style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'center' }}>الكمية والوحدة</th>
                        <th style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'center' }}>الضمان والدعم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentProposal.technical_items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #d1d5db', padding: '0.4rem', fontWeight: 700 }}>{item.title}</td>
                          <td style={{ border: '1px solid #d1d5db', padding: '0.4rem' }}>{item.specs}</td>
                          <td style={{ border: '1px solid #d1d5db', padding: '0.4rem', textAlign: 'center' }}>{item.quantity} {item.unit}</td>
                          <td style={{ border: '1px solid #d1d5db', padding: '0.4rem', textAlign: 'center' }}>{item.warranty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Financial Pricing Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid #000', paddingBottom: '0.4rem', color: '#000', fontWeight: 800 }}>
                  ثانياً: العرض المالي وجدول التسعير والكميات لبيع وتأهيل النظام بالكامل
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                      <th style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'right' }}>بيان الأعمال والموديولات</th>
                      <th style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'center' }}>الفئة</th>
                      <th style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'center' }}>السعر المالي</th>
                      <th style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'center' }}>الكمية</th>
                      <th style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'left' }}>الإجمالي ({currencySymbol})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentProposal.financial_items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #d1d5db', padding: '0.4rem', fontWeight: 600 }}>{item.description}</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '0.4rem', textAlign: 'center' }}>{item.category}</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '0.4rem', textAlign: 'center' }}>{(Number(item.unitPrice) || 0).toLocaleString('ar-EG')}</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '0.4rem', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '0.4rem', textAlign: 'left', fontWeight: 700 }}>
                          {(Number(item.totalPrice) || 0).toLocaleString('ar-EG')}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                      <td colSpan={4} style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'right' }}>إجمالي التكلفة البرمجية قبل الضريبة</td>
                      <td style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'left' }}>{subtotal.toLocaleString('ar-EG')} {currencySymbol}</td>
                    </tr>
                    <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                      <td colSpan={4} style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'right' }}>ضريبة القيمة المضافة ({currentProposal.vat_percentage || 15}%)</td>
                      <td style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'left' }}>{vatAmount.toLocaleString('ar-EG')} {currencySymbol}</td>
                    </tr>
                    <tr style={{ background: '#e5e7eb', fontWeight: 900, fontSize: '0.95rem' }}>
                      <td colSpan={4} style={{ border: '1px solid #9ca3af', padding: '0.5rem', textAlign: 'right' }}>الإجمالي النهائي الشامل لتسليم وتأهيل النظام بالكامل</td>
                      <td style={{ border: '1px solid #9ca3af', padding: '0.5rem', textAlign: 'left', color: '#15803d' }}>
                        {grandTotal.toLocaleString('ar-EG')} {currencySymbol}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Terms Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid #000', paddingBottom: '0.4rem', color: '#000', fontWeight: 800 }}>
                  ثالثاً: الشروط والأحكام وفترات التنفيذ والضمان
                </h3>
                <p style={{ fontSize: '0.85rem', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: '#222' }}>
                  {currentProposal.terms_text}
                </p>
              </div>

              {/* Signatures */}
              <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>إعداد المهندس / استشاري النظام</div>
                  <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #9ca3af' }}></div>
                </div>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>مراجعة المدير الفني والمالي</div>
                  <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #9ca3af' }}></div>
                </div>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>اعتماد صاحب المؤسسة / المالك</div>
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
