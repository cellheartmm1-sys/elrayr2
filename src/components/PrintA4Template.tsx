'use client';

import React from 'react';

export interface CompanyInfoProps {
  name_ar?: string;
  name_en?: string;
  cr_number?: string;
  vat_number?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
}

interface PrintA4TemplateProps {
  companyInfo?: CompanyInfoProps | null;
  documentTitle: string;
  documentSubtitle?: string;
  refNumber?: string;
  date?: string;
  children: React.ReactNode;
  showSignatures?: boolean;
}

export default function PrintA4Template({
  companyInfo,
  documentTitle,
  documentSubtitle,
  refNumber,
  date,
  children,
  showSignatures = true
}: PrintA4TemplateProps) {
  const companyNameAr = companyInfo?.name_ar || 'شركة الرايق للمقاولات الكهروميكانيكية وأنظمة الحريق';
  const cr = companyInfo?.cr_number || '١٠١٠١٢٣٤٥٦';
  const vat = companyInfo?.vat_number || '٣٠٠٠١٢٣٤٥٦٠٠٠٠٣';
  const address = companyInfo?.address || 'القاهرة، مصر / الرياض، المملكة العربية السعودية';
  const phone = companyInfo?.phone || '+20-100-000-0000';
  const email = companyInfo?.email || 'info@alrayeq.com';
  const logo = companyInfo?.logo_url;

  return (
    <div className="print-a4-wrapper">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
          
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide background and unnecessary UI elements */
          .sidebar,
          header,
          nav,
          .no-print,
          .print-actions,
          .back-to-home-btn,
          .modal-header,
          .filter-bar,
          .page-header,
          .card:not(.print-modal-content),
          .table-wrapper:not(.print-table-wrapper),
          button:not(.allow-print-btn) {
            display: none !important;
            visibility: hidden !important;
          }

          /* Reset Layout and Scroll Constraints */
          .layout-wrapper,
          .main-content,
          .page-content {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            width: 100% !important;
            min-height: auto !important;
            max-height: none !important;
            height: auto !important;
            background: #ffffff !important;
          }

          /* Unclamp fixed/modal containers */
          .modal-overlay,
          .print-modal-overlay {
            position: static !important;
            display: block !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            box-shadow: none !important;
            border: none !important;
            z-index: auto !important;
          }

          .modal,
          .modal-xl,
          .print-modal-content {
            position: static !important;
            display: block !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
          }

          .print-a4-wrapper {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .print-a4-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
            overflow: visible !important;
          }

          /* Table formatting for clean multi-page printing */
          table {
            page-break-inside: auto !important;
            break-inside: auto !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          
          thead {
            display: table-header-group !important;
          }

          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          th, td {
            color: #000 !important;
            border-color: #cbd5e1 !important;
          }

          /* Prevent break inside critical sections */
          .print-a4-header,
          .print-doc-banner,
          .print-grid,
          .print-signatures-grid,
          .print-footer-info {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }

        .print-a4-container {
          direction: rtl;
          background: #ffffff;
          color: #111827;
          padding: 2.5rem;
          max-width: 900px;
          margin: 0 auto;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          border-radius: 8px;
        }

        .print-a4-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2.5px solid #1e3a8a;
          padding-bottom: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .print-logo-box {
          width: 90px;
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .print-company-name-ar {
          font-size: 1.35rem;
          font-weight: 800;
          color: #1e3a8a;
          line-height: 1.3;
          margin-bottom: 0.35rem;
        }

        .print-company-details {
          font-size: 0.82rem;
          color: #4b5563;
          display: flex;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .print-doc-banner {
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
          color: #ffffff;
          text-align: center;
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2);
        }

        .print-doc-banner h2 {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .print-doc-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: #e0e7ff;
          margin-top: 0.35rem;
        }

        .print-signatures-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-top: 2.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
          page-break-inside: avoid;
        }

        .print-sig-box {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 1rem;
          text-align: center;
          background: #f9fafb;
        }

        .print-sig-title {
          font-weight: 700;
          font-size: 0.9rem;
          color: #1f2937;
          margin-bottom: 2.5rem;
        }

        .print-sig-line {
          border-bottom: 1px dashed #9ca3af;
          margin-bottom: 0.5rem;
        }

        .print-footer-info {
          margin-top: 2rem;
          padding-top: 0.75rem;
          border-top: 2px solid #1e3a8a;
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          color: #6b7280;
          text-align: center;
          page-break-inside: avoid;
        }
      `}</style>

      <div className="print-a4-container">
        {/* Header */}
        <div className="print-a4-header">
          <div style={{ flex: 1 }}>
            <div className="print-company-name-ar">{companyNameAr}</div>
            <div className="print-company-details">
              <span><strong>سجل تجاري:</strong> {cr}</span>
              <span><strong>الرقم الضريبي:</strong> {vat}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.25rem' }}>
              {address}
            </div>
          </div>
          {logo ? (
            <div className="print-logo-box">
              <img src={logo} alt="شعار الشركة" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          ) : (
            <div className="print-logo-box" style={{ background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
              <span style={{ fontSize: '2rem' }}>🏢</span>
            </div>
          )}
        </div>

        {/* Document Title Banner */}
        <div className="print-doc-banner">
          <h2>{documentTitle}</h2>
          <div className="print-doc-meta">
            <span>{refNumber ? `مرجع: ${refNumber}` : ''}</span>
            <span>{documentSubtitle || ''}</span>
            <span>{date ? `التاريخ: ${date}` : ''}</span>
          </div>
        </div>

        {/* Content Children */}
        <div className="print-body-content">
          {children}
        </div>

        {/* Signatures */}
        {showSignatures && (
          <div className="print-signatures-grid">
            <div className="print-sig-box">
              <div className="print-sig-title">إعداد وتدقيق</div>
              <div className="print-sig-line"></div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>توقيع المسؤول</div>
            </div>
            <div className="print-sig-box">
              <div className="print-sig-title">إعتماد إدارة المقاولات</div>
              <div className="print-sig-line"></div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>توقيع المدير العام</div>
            </div>
            <div className="print-sig-box">
              <div className="print-sig-title">ختم المؤسسة الرسمي</div>
              <div style={{ height: '35px' }}></div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>[مربع الختم]</div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="print-footer-info">
          <span>📞 هاتف: {phone}</span>
          <span>📧 البريد: {email}</span>
          <span>صفحة 1 من 1 - نظام الرايق المالي والمقاولات</span>
        </div>
      </div>
    </div>
  );
}
