'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';

interface PageParams { id: string; }
interface Props { params: Promise<PageParams>; }

const attendanceTypeLabels: Record<string, string> = {
  present: '✅ حاضر',
  absent: '❌ غائب',
  half_day: '🌓 نصف يوم',
};
const attendanceTypeColors: Record<string, string> = {
  present: '#10b981',
  absent: '#ef4444',
  half_day: '#f59e0b',
};

export default function LaborDetailPage({ params }: Props) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppLayout title="يوميات العمال" subtitle="جار التحميل..." icon="👥">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (!data?.project) {
    return (
      <AppLayout title="خطأ" subtitle="المشروع غير موجود" icon="❌">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Link href={`/projects/${id}`} className="btn btn-primary">العودة للمشروع</Link>
        </div>
      </AppLayout>
    );
  }

  const { project, laborAttendance = [] } = data;

  // Calculations
  const presentRecords = laborAttendance.filter((a: any) => a.attendance_type === 'present');
  const absentRecords = laborAttendance.filter((a: any) => a.attendance_type === 'absent');
  const totalDailyLaborCost = presentRecords.reduce((acc: number, a: any) => {
    const rate = Number(a.base_salary || 150);
    const overtime = Number(a.overtime_hours || 0) * 25;
    return acc + rate + overtime;
  }, 0);
  const totalOvertimeHours = presentRecords.reduce((acc: number, a: any) => acc + Number(a.overtime_hours || 0), 0);
  const totalOvertimeCost = totalOvertimeHours * 25;

  // Unique employees
  const uniqueEmployees = Array.from(new Set(laborAttendance.map((a: any) => a.employee_id)))
    .map((empId: any) => {
      const rec = laborAttendance.find((a: any) => a.employee_id === empId);
      return { id: String(empId || ''), name: String(rec?.employee_name || ''), job_title: rec?.job_title };
    });

  // By employee stats
  const employeeStats = uniqueEmployees.map(emp => {
    const records = laborAttendance.filter((a: any) => a.employee_id === emp.id);
    const present = records.filter((a: any) => a.attendance_type === 'present');
    const absent = records.filter((a: any) => a.attendance_type === 'absent');
    const overtimeHours = present.reduce((acc: number, a: any) => acc + Number(a.overtime_hours || 0), 0);
    const cost = present.reduce((acc: number, a: any) => {
      const rate = Number(a.base_salary || 150);
      const ot = Number(a.overtime_hours || 0) * 25;
      return acc + rate + ot;
    }, 0);
    return { ...emp, presentDays: present.length, absentDays: absent.length, overtimeHours, cost, totalDays: records.length };
  });

  // Filter records
  const filteredRecords = laborAttendance.filter((a: any) => {
    const empMatch = filterEmployee === 'all' || a.employee_id === filterEmployee;
    const dateMatch = !filterDate || a.attendance_date?.startsWith(filterDate);
    return empMatch && dateMatch;
  });

  // Attendance rate
  const attendanceRate = laborAttendance.length > 0
    ? ((presentRecords.length / laborAttendance.length) * 100).toFixed(1)
    : '0';

  return (
    <AppLayout title={`يوميات العمال والمشرفين - ${project.name}`} subtitle={`كود المشروع: ${project.code}`} icon="👥">
      {/* Back button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={`/projects/${id}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem',
          padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-normal)',
        }}>
          ← العودة إلى المشروع
        </Link>
      </div>

      {/* Hero KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #c2410c, #f97316)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.5rem' }}>💰 إجمالي تكلفة اليومية</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{formatCurrency(totalDailyLaborCost)}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>الحضور الفعلي للموقع</div>
          <div style={{ position: 'absolute', left: '-10px', bottom: '-15px', fontSize: '5rem', opacity: 0.1 }}>💰</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.5rem' }}>👷 عدد العمال</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{uniqueEmployees.length}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>عامل مسجل في المشروع</div>
          <div style={{ position: 'absolute', left: '-10px', bottom: '-15px', fontSize: '5rem', opacity: 0.1 }}>👷</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #047857, #10b981)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.5rem' }}>✅ أيام الحضور</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{presentRecords.length}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>نسبة {attendanceRate}% من الإجمالي</div>
          <div style={{ position: 'absolute', left: '-10px', bottom: '-15px', fontSize: '5rem', opacity: 0.1 }}>✅</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.5rem' }}>⏰ ساعات إضافية</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{totalOvertimeHours.toFixed(0)} ساعة</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>تكلفة: {formatCurrency(totalOvertimeCost)}</div>
          <div style={{ position: 'absolute', left: '-10px', bottom: '-15px', fontSize: '5rem', opacity: 0.1 }}>⏰</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #991b1b, #ef4444)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '0.5rem' }}>❌ أيام الغياب</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{absentRecords.length}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>من إجمالي {laborAttendance.length} تسجيل</div>
          <div style={{ position: 'absolute', left: '-10px', bottom: '-15px', fontSize: '5rem', opacity: 0.1 }}>❌</div>
        </div>
      </div>

      {/* Employee summary */}
      {employeeStats.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div className="card-title">📋 ملخص أداء العمال</div>
            <div className="card-subtitle">إجمالي الحضور والغياب والتكلفة لكل عامل</div>
          </div>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>اسم العامل</th>
                  <th>المسمى الوظيفي</th>
                  <th>أيام الحضور</th>
                  <th>أيام الغياب</th>
                  <th>نسبة الحضور</th>
                  <th>ساعات إضافية</th>
                  <th>إجمالي التكلفة</th>
                </tr>
              </thead>
              <tbody>
                {employeeStats.map((emp: any, i: number) => {
                  const rate = emp.totalDays > 0 ? ((emp.presentDays / emp.totalDays) * 100).toFixed(0) : '0';
                  return (
                    <tr key={i}>
                      <td><strong>{emp.name}</strong></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{emp.job_title || '-'}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{emp.presentDays}</td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>{emp.absentDays}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '60px', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${rate}%`, background: Number(rate) >= 80 ? '#10b981' : '#f59e0b', borderRadius: '4px' }} />
                          </div>
                          <span style={{ fontSize: '0.8rem' }}>{rate}%</span>
                        </div>
                      </td>
                      <td>{emp.overtimeHours > 0 ? `${emp.overtimeHours.toFixed(1)}h` : '-'}</td>
                      <td style={{ fontWeight: 700, color: '#f97316' }}>{formatCurrency(emp.cost)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                  <td colSpan={2}>الإجمالي</td>
                  <td style={{ color: '#10b981' }}>{presentRecords.length}</td>
                  <td style={{ color: '#ef4444' }}>{absentRecords.length}</td>
                  <td>{attendanceRate}%</td>
                  <td>{totalOvertimeHours.toFixed(1)}h</td>
                  <td style={{ color: '#f97316' }}>{formatCurrency(totalDailyLaborCost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Detailed attendance log with filters */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📅 سجل الحضور التفصيلي</div>
          <div className="card-subtitle">جميع تسجيلات الحضور والغياب</div>
        </div>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <select
            value={filterEmployee}
            onChange={e => setFilterEmployee(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-normal)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
          >
            <option value="all">جميع العمال</option>
            {uniqueEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <input
            type="month"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-normal)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
          />
          {(filterEmployee !== 'all' || filterDate) && (
            <button
              onClick={() => { setFilterEmployee('all'); setFilterDate(''); }}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-normal)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              إعادة تعيين
            </button>
          )}
        </div>

        {filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>لا توجد تسجيلات بناءً على الفلتر المحدد</div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>اسم العامل</th>
                  <th>المسمى الوظيفي</th>
                  <th>الحالة</th>
                  <th>ساعات إضافية</th>
                  <th>تكلفة اليوم</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec: any) => {
                  const rate = Number(rec.base_salary || 150);
                  const overtime = Number(rec.overtime_hours || 0) * 25;
                  const dayCost = rec.attendance_type === 'present' ? rate + overtime : 0;
                  return (
                    <tr key={rec.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}>
                        {rec.attendance_date ? new Date(rec.attendance_date).toLocaleDateString('ar-EG') : '-'}
                      </td>
                      <td><strong>{rec.employee_name}</strong></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{rec.job_title || '-'}</td>
                      <td>
                        <span style={{
                          background: attendanceTypeColors[rec.attendance_type] || '#6b7280',
                          color: '#fff', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600,
                        }}>
                          {attendanceTypeLabels[rec.attendance_type] || rec.attendance_type}
                        </span>
                      </td>
                      <td>{Number(rec.overtime_hours || 0) > 0 ? `${Number(rec.overtime_hours).toFixed(1)} ساعة` : '-'}</td>
                      <td style={{ fontWeight: 700, color: dayCost > 0 ? '#f97316' : 'var(--text-muted)' }}>
                        {dayCost > 0 ? formatCurrency(dayCost) : '-'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{rec.notes || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
