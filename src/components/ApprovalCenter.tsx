'use client';

import { useState, useEffect } from 'react';

interface ApprovalCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshCount?: () => void;
}

export default function ApprovalCenter({ isOpen, onClose, onRefreshCount }: ApprovalCenterProps) {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      fetchApprovals();
    }
  }, [isOpen, activeTab]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/approvals?status=${activeTab === 'pending' ? 'pending' : 'all'}`);
      if (res.ok) {
        const data = await res.json();
        setApprovals(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (approvalId: string, action: 'approve' | 'reject') => {
    setProcessingId(approvalId);
    try {
      const res = await fetch('/api/admin/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_id: approvalId,
          action,
          rejection_reason: rejectionReason[approvalId] || ''
        })
      });

      if (res.ok) {
        alert(action === 'approve' ? '✅ تمت الموافقة على الطلب وتطبيقه بالنظام!' : '❌ تم رفض الطلب.');
        fetchApprovals();
        if (onRefreshCount) onRefreshCount();
      } else {
        const err = await res.json();
        alert(`❌ فشل الإجراء: ${err.error}`);
      }
    } catch (err: any) {
      alert(`❌ خطأ: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-normal)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '780px',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-modal)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.1), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.6rem' }}>📜</span>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                مركز الموافقات والاعتمادات (Approval Center)
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                طلبات العمليات الواردة من الموظفين والتي تتطلب موافقة واعتماد مدير النظام
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.4rem',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-card-hover)'
        }}>
          <button
            onClick={() => setActiveTab('pending')}
            className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            ⏳ الطلبات المعلقة
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            📁 سجل جميع الموافقات والرفض
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>جاري تحميل الطلبات...</div>
          ) : approvals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
              <div style={{ fontWeight: 600 }}>لا توجد طلبات معلقة بانتظار الموافقة في الوقت الحالي</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {approvals.map((item: any) => (
                <div key={item.id} style={{
                  padding: '1.25rem',
                  background: 'var(--bg-card-hover)',
                  border: `1px solid ${
                    item.status === 'pending'
                      ? 'rgba(234,179,8,0.4)'
                      : item.status === 'approved'
                      ? 'rgba(16,185,129,0.4)'
                      : 'rgba(239,68,68,0.4)'
                  }`,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  {/* Item Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        المقدم: <strong>{item.requester_name}</strong> ({item.requester_role}) • التاريخ: {new Date(item.created_at).toLocaleString('ar-EG')}
                      </div>
                    </div>
                    <div>
                      <span className={`badge ${
                        item.status === 'pending'
                          ? 'badge-warning'
                          : item.status === 'approved'
                          ? 'badge-success'
                          : 'badge-danger'
                      }`}>
                        {item.status === 'pending' ? '⏳ قيد الانتظار' : item.status === 'approved' ? '✓ تم الموصفة والتنفيذ' : '✕ تم الرفض'}
                      </span>
                    </div>
                  </div>

                  {/* Details json box */}
                  <div style={{
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    color: 'var(--text-secondary)',
                    maxHeight: '120px',
                    overflowY: 'auto'
                  }}>
                    {JSON.stringify(item.details, null, 2)}
                  </div>

                  {/* Action buttons if pending */}
                  {item.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleAction(item.id, 'approve')}
                        disabled={processingId === item.id}
                        className="btn btn-success"
                        style={{ padding: '0.45rem 1.25rem', fontWeight: 700, fontSize: '0.85rem' }}
                      >
                        ✓ موافقة واعتماد بالنظام
                      </button>

                      <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="سبب الرفض (اختياري)..."
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                          value={rejectionReason[item.id] || ''}
                          onChange={e => setRejectionReason({ ...rejectionReason, [item.id]: e.target.value })}
                        />
                        <button
                          onClick={() => handleAction(item.id, 'reject')}
                          disabled={processingId === item.id}
                          className="btn btn-danger"
                          style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                        >
                          ✕ رفض الطلب
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'left',
          background: 'var(--bg-card-hover)'
        }}>
          <button onClick={onClose} className="btn btn-outline" style={{ padding: '0.45rem 1.25rem' }}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
