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
  const [currencySymbol, setCurrencySymbol] = useState('ج.م');
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [currentProposal, setCurrentProposal] = useState<Proposal>({
    title: 'عرض فني ومالي شامـل لتغذية وتنفيذ أعمال المقاولات الكهروميكانيكية',
    client_name: 'شركة التطوير العقاري الكبرى',
    scope_text: `يتضمن هذا العرض توريد، تركيب، واختبار وتدشين الأنظمة الكهروميكانيكية الشاملة (MEP) للمشروع وفق أعلى معايير الجودة العالمية وكود البناء المعتمد (NFPA, ASHRAE, IEC).\nيشمل العمل: شبكات مكافحة الحريق والإطفاء التلقائي، محطات التكييف المركزي VRF والتشيلر، لوحات توزيع الكهرباء الرئيسية MDB، ومحطات الضخ والصرف.`,
    terms_text: `١. مدة توريد وتنفيذ الأعمال: ٩٠ يوماً تقويمياً من تاريخ توقيع العقد واستلام الدفعة المقدمة.\n٢. الدفعة المقدمة: ٣٠٪ عند التوقيع، ٥٠٪ حسب نسبة الإنجاز والاعتماد بالمستخلصات، و٢٠٪ عند التسليم النهائي.\n٣. فترة الضمان الشامل: ضمان سنتين كاملتين على التركيبات والأعمال الكهروميكانيكية مع صيانة مجانية.`,
    vat_percentage: 15,
    technical_items: [
      {
        id: 't1',
        title: 'شبكة ومضخات إطفاء الحريق المركزية',
        specs: 'غرفة مضخات معتمدة من الدفاع المدني (مضخة كهرباء + مضخة ديزل + مضخة جوكي) سعة 1000 GPM مع شبكة رشاشات Sprinklers وصناديق إطفاء.',
        quantity: 1,
        unit: 'محطة متكاملة',
        warranty: 'سنتان شاملتان'
      },
      {
        id: 't2',
        title: 'نظام التكييف المركزي والتهوية HVAC',
        specs: 'أنظمة التكييف ذات التدفق المتغير VRF سعة إجمالية 350 طن تبريد مع مجاري هواء عازلة للصوت والصدمات ومحركات تهوية نفاثة.',
        quantity: 1,
        unit: 'شبكة شاملة',
        warranty: '٥ سنوات على الكمبروسر'
      },
      {
        id: 't3',
        title: 'اللوحات والشبكات الكهربائية الرئيسية MDB',
        specs: 'توريد وتركيب لوحات توزيع رئيسية وفرعية من Schneider/ABB مع شبكة كوابل مسلحة ضد الحريق ونظام أجهزة المؤرض الصاعق.',
        quantity: 1,
        unit: 'موقع كامل',
        warranty: 'سنتان شاملتان'
      }
    ],
    financial_items: [
      {
        id: 'f1',
        description: 'توريد وتركيب وتدشين مضخات وشبكات الإطفاء والسلامة',
        category: 'توريد وتركيب',
        unitPrice: 450000,
        quantity: 1,
        totalPrice: 450000
      },
      {
        id: 'f2',
        description: 'توريد وتركيب وموازنة أنظمة التكييف المركزي VRF والدكتات',
        category: 'توريد وتركيب',
        unitPrice: 850000,
        quantity: 1,
        totalPrice: 850000
      },
      {
        id: 'f3',
        description: 'توريد ومد الكوابل ولوحات التوزيع الكهربائية والمؤرض',
        category: 'توريد وتركيب',
        unitPrice: 380000,
        quantity: 1,
        totalPrice: 380000
      },
      {
        id: 'f4',
        description: 'أعمال الاختبار والضبط والمعايرة والتسليم النهائي TAB',

        category: 'تشغيل واختبار',
        unitPrice: 70000,
        quantity: 1,
        totalPrice: 70000
      }
    ]
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('user_role');
      setIsAdmin(role === 'admin');
      setCurrencySymbol(localStorage.getItem('system_currency_symbol') || 'ج.م');
    }
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proposals');
      const data = await res.json();
      if (Array.isArray(data)) {
        setProposals(data);
        if (data.length > 0 && !selectedProposalId) {
          setSelectedProposalId(data[0].id);
          setCurrentProposal(data[0]);
        }
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
      title: 'عرض فني ومالي جديد للمشروع',
      client_name: '',
      scope_text: 'أدخل تفاصيل ونطاق العمل الفني والمواصفات المعتمدة هنا...',
      terms_text: 'أدخل الشروط والأحكام وفترات الدفع والضمان هنا...',
      vat_percentage: 15,
      technical_items: [],
      financial_items: []
    });
  };

  // Technical Item Handlers
  const handleAddTechItem = () => {
    const newItem: TechItem = {
      id: `t_${Date.now()}`,
      title: 'بند فني جديد',
      specs: 'المواصفات الفنية للبند...',
      quantity: 1,
      unit: 'بند',
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
      description: 'بند تسعير مالي جديد',
      category: 'توريد وتركيب',
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
        alert('✅ تم حفظ العرض الفني والمالي بنجاح!');
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
      <AppLayout title="العروض الفنية والمالية" subtitle="صفحة مخصصة لإدارة العروض والمواصفات للمدير فقط" icon="📑">
        <div className="card" style={{ padding: '3rem', textAlign: 'center', margin: '2rem auto', maxWidth: '600px', border: '1px solid #ef4444' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⛔</div>
          <h2 style={{ color: '#ef4444', fontSize: '1.6rem', fontWeight: 800 }}>صفحة مخصصة لمدير النظام (Admin Only)</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: '1.8' }}>
            عذراً، هذه الصفحة وسجل العروض الفنية والمالية والمواصفات متاحة حصرياً لحساب مدير النظام فقط.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="العروض الفنية والمالية والبنود" subtitle="إدارة العروض والمواصفات للمشروع بالكامل وتحديد الأسعار والبنود (خاص بالمدير)" icon="📑">
      {/* Action Header & Proposal Selector */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>اختر العرض الفني والمالي:</label>
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '280px' }}
              value={selectedProposalId}
              onChange={e => handleSelectProposal(e.target.value)}
            >
              <option value="">+ إنشاء عرض جديد</option>
              {proposals.map(p => (
                <option key={p.id} value={p.id}>
                  {p.proposal_code ? `[${p.proposal_code}] ` : ''}{p.title} ({p.client_name || 'بدون عميل'})
                </option>
              ))}
            </select>
            <button className="btn btn-outline" onClick={handleCreateNewProposal}>+ جديد</button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {currentProposal.id && (
              <button className="btn btn-danger-text" onClick={handleDeleteProposal}>🗑️ حذف العرض</button>
            )}
            <button className="btn btn-primary" onClick={handleSaveProposal} disabled={saving}>
              {saving ? 'جاري الحفظ...' : '💾 حفظ التعديلات'}
            </button>
            <button className="btn btn-accent" onClick={() => setShowPrintModal(true)}>
              🖨️ معاينة وتصدير PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Proposal Editor Card */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        {/* Proposal Meta Form */}
        <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-color)', marginBottom: '1.25rem' }}>
            📋 البيانات الأساسية للعرض الفني والمالي
          </h3>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label required">عنوان العرض الفني والمالي للمشروع</label>
              <input
                className="form-control"
                required
                value={currentProposal.title}
                onChange={e => setCurrentProposal({ ...currentProposal, title: e.target.value })}
                placeholder="عنوان العرض والمشروع..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">اسم العميل / المالك / المطور العقاري</label>
              <input
                className="form-control"
                value={currentProposal.client_name}
                onChange={e => setCurrentProposal({ ...currentProposal, client_name: e.target.value })}
                placeholder="اسم شركة العميل أو المالك..."
              />
            </div>
          </div>
        </div>

        {/* SECTION 1: TECHNICAL SCOPE & SPECS */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', margin: 0 }}>
              🧯 أولاً: العرض الفني والمواصفات والنطاق الهندسي (Technical Proposal)
            </h3>
            <button className="btn btn-sm btn-outline" onClick={handleAddTechItem}>
              + إضافة بند فني جديد
            </button>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">الشرح العام ونطاق العمل الهندسي (Scope of Work)</label>
            <textarea
              className="form-control"
              rows={4}
              value={currentProposal.scope_text}
              onChange={e => setCurrentProposal({ ...currentProposal, scope_text: e.target.value })}
              placeholder="اكتب تفاصيل النطاق الفني والمواصفات العامة المعتمدة هنا..."
            />
          </div>

          {/* Technical Items Table */}
          <div className="table-responsive" style={{ background: 'var(--bg-subtle)', borderRadius: '12px', padding: '0.5rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>عنوان البند / النظام الكهروميكانيكي</th>
                  <th style={{ width: '40%' }}>المواصفات الفنية المعتمدة والمعايير</th>
                  <th style={{ width: '12%' }}>الكمية والوحدة</th>
                  <th style={{ width: '15%' }}>فترة الضمان والاعتماد</th>
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
                          placeholder="عنوان البند الفني..."
                        />
                      </td>
                      <td>
                        <textarea
                          className="form-control form-control-sm"
                          rows={2}
                          value={item.specs}
                          onChange={e => handleUpdateTechItem(item.id, 'specs', e.target.value)}
                          placeholder="تفاصيل المواصفات الفنية..."
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
                          placeholder="مثال: سنتان شاملتان"
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
              💰 ثانياً: العرض المالي وجدول التسعير والكميات (Financial Proposal BOQ)
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
                  <th style={{ width: '35%' }}>بيان الأعمال والموديلات</th>
                  <th style={{ width: '15%' }}>فئة العمل</th>
                  <th style={{ width: '15%' }}>سعر الوحدة ({currencySymbol})</th>
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
                          placeholder="وصف البند المالي..."
                        />
                      </td>
                      <td>
                        <select
                          className="form-control form-control-sm"
                          value={item.category}
                          onChange={e => handleUpdateFinItem(item.id, 'category', e.target.value)}
                        >
                          <option value="توريد وتركيب">توريد وتركيب</option>
                          <option value="توريد فقط">توريد فقط</option>
                          <option value="مصنعيات وتركيب">مصنعيات وتركيب</option>
                          <option value="تشغيل واختبار">تشغيل واختبار</option>
                          <option value="صيانة وتأهيل">صيانة وتأهيل</option>
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
              <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700 }}>الإجمالي النهائي الشامل للضريبة</div>
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
              placeholder="اكتب الدفعات المقدمة، شروط التوريد، والضمان هنا..."
            />
          </div>
        </div>
      </div>

      {/* ======================== PRINT PREVIEW MODAL ======================== */}
      {showPrintModal && (
        <div className="modal-overlay print-modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="modal modal-xl print-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', background: 'var(--card-bg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header print-actions" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <div className="modal-title">🖨️ معاينة وتصدير العرض الفني والمالي الشامل (PDF)</div>
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
                  العرض الفني والمالي للمواصفات والبنود
                </h2>
                <div style={{ fontSize: '0.95rem', color: '#333', marginTop: '0.4rem', fontWeight: 600 }}>
                  الموضوع: {currentProposal.title}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.2rem' }}>
                  العميل الموجه له العرض: <strong>{currentProposal.client_name || 'السادة المالك / المحترمين'}</strong> | التاريخ: {new Date().toLocaleDateString('ar-EG')}
                </div>
              </div>

              {/* Technical Scope Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid #000', paddingBottom: '0.4rem', color: '#000', fontWeight: 800 }}>
                  أولاً: النطاق الفني والمواصفات الهندسي المعتمدة
                </h3>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: '#222' }}>
                  {currentProposal.scope_text}
                </p>

                {currentProposal.technical_items.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'right' }}>البند والنظام</th>
                        <th style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'right' }}>المواصفات الفنية والمعايير</th>
                        <th style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'center' }}>الكمية والوحدة</th>
                        <th style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'center' }}>الضمان</th>
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
                  ثانياً: العرض المالي وجدول الأسعار والكميات BOQ
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                      <th style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'right' }}>بيان الأعمال</th>
                      <th style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'center' }}>الفئة</th>
                      <th style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'center' }}>السعر الفردي</th>
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
                      <td colSpan={4} style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'right' }}>إجمالي التوريدات والتركيبات قبل الضريبة</td>
                      <td style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'left' }}>{subtotal.toLocaleString('ar-EG')} {currencySymbol}</td>
                    </tr>
                    <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                      <td colSpan={4} style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'right' }}>ضريبة القيمة المضافة ({currentProposal.vat_percentage || 15}%)</td>
                      <td style={{ border: '1px solid #9ca3af', padding: '0.4rem', textAlign: 'left' }}>{vatAmount.toLocaleString('ar-EG')} {currencySymbol}</td>
                    </tr>
                    <tr style={{ background: '#e5e7eb', fontWeight: 900, fontSize: '0.95rem' }}>
                      <td colSpan={4} style={{ border: '1px solid #9ca3af', padding: '0.5rem', textAlign: 'right' }}>الإجمالي النهائي الشامل للضريبة</td>
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
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>إعداد المهندس الفني</div>
                  <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #9ca3af' }}></div>
                </div>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>مراجعة المدير المالي</div>
                  <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #9ca3af' }}></div>
                </div>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>اعتماد مدير النظام (Admin)</div>
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
