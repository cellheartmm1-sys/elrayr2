'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { formatCurrency } from '@/lib/currencyHelper';
import Link from 'next/link';

type TabType = 'employees' | 'payroll' | 'attendance' | 'overtime' | 'assets' | 'documents' | 'loans';

interface Employee {
  id: string; employee_number: string; full_name: string; job_title: string;
  nationality: string; base_salary: string; employment_type: string; status: string;
  phone: string; iqama_number: string; iqama_expiry: string;
}

interface PayrollItem {
  id: string; employee_name: string; base_salary: string; housing_allowance: string;
  transport_allowance: string; overtime_amount: string; deductions: string; net_salary: string; status: string;
  working_days?: number; actual_days?: number; absent_days?: number;
}

interface AttendanceRecord {
  id: string; employee_id?: string; employee_name: string; project_name: string; attendance_date: string;
  check_in_time: string; check_out_time: string; attendance_type: string; overtime_hours: number;
}

interface OvertimeRequest {
  id: string; employee_name: string; project_name: string; overtime_date: string;
  hours_requested: number; reason: string; status: string;
}

interface PersonalAsset {
  id: string; asset_code: string; asset_name: string; asset_type: string;
  brand: string; model?: string; serial_number?: string; purchase_cost?: number;
  assigned_to?: string; employee_name: string; assigned_to_name?: string;
  assigned_to_job?: string; assignment_date?: string; project_name: string;
  condition: string; status: string; notes?: string;
}

interface DocumentAlert {
  full_name: string; employee_number: string; document_type: string;
  document_number: string; expiry_date: string; days_remaining: number; alert_status: string;
}

const statusLabels: Record<string, string> = { active: 'نشط', inactive: 'غير نشط', on_leave: 'في إجازة', terminated: 'مستقيل/مفصول' };
const statusBadge: Record<string, string> = { active: 'badge-success', inactive: 'badge-muted', on_leave: 'badge-warning', terminated: 'badge-danger' };

const typeLabels: Record<string, string> = { full_time: 'دوام كامل', part_time: 'دوام جزئي', contract: 'عقد مؤقت', daily: 'يومية' };
const typeBadge: Record<string, string> = { full_time: 'badge-primary', part_time: 'badge-purple', contract: 'badge-warning', daily: 'badge-success' };

const docLabels: Record<string, string> = {
  iqama: 'إقامة', passport: 'جواز سفر', osha: 'شهادة أوشا (OSHA)', driving_license: 'رخصة قيادة',
  vehicle_license: 'رخصة معدة/سيارة', health_card: 'بطاقة صحية', contract: 'عقد العمل'
};

export default function HRPage() {
  const [currencySymbol, setCurrencySymbol] = useState('ج.م');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrencySymbol(localStorage.getItem('system_currency_symbol') || 'ج.م');
    }
  }, []);
  const [activeTab, setActiveTab] = useState<TabType>('employees');
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
        if (tab && tab !== lastTabRef.current && ['employees', 'payroll', 'attendance', 'overtime', 'assets', 'documents', 'loans'].includes(tab)) {
          lastTabRef.current = tab;
          setActiveTab(tab as TabType);
        }
      }
    };
    syncTab();
    const interval = setInterval(syncTab, 200);
    return () => clearInterval(interval);
  }, []);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payroll, setPayroll] = useState<PayrollItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [overtime, setOvertime] = useState<OvertimeRequest[]>([]);
  const [assets, setAssets] = useState<PersonalAsset[]>([]);
  const [documents, setDocuments] = useState<DocumentAlert[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  // Print Payroll Modal states
  const [showPrintPayrollModal, setShowPrintPayrollModal] = useState(false);
  const [printDateMode, setPrintDateMode] = useState<'month' | 'day' | 'range'>('month');
  const [printMonth, setPrintMonth] = useState(new Date().getMonth() + 1);
  const [printYear, setPrintYear] = useState(new Date().getFullYear());
  const [printSingleDate, setPrintSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [printStartDate, setPrintStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [printEndDate, setPrintEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [printEmpMode, setPrintEmpMode] = useState<'all' | 'single' | 'selected'>('all');
  const [printSingleEmpId, setPrintSingleEmpId] = useState('');
  const [printSelectedEmpIds, setPrintSelectedEmpIds] = useState<string[]>([]);
  const [printSearch, setPrintSearch] = useState('');

  const [printData, setPrintData] = useState<any | null>(null);
  const [printLoading, setPrintLoading] = useState(false);

  const handleOpenPrintModal = () => {
    setShowPrintPayrollModal(true);
    setPrintData(null);
  };

  const handleFetchPrintData = async () => {
    try {
      setPrintLoading(true);
      const res = await fetch('/api/hr/payroll/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateMode: printDateMode,
          month: printMonth,
          year: printYear,
          singleDate: printSingleDate,
          startDate: printStartDate,
          endDate: printEndDate,
          empMode: printEmpMode,
          singleEmpId: printSingleEmpId,
          selectedEmpIds: printSelectedEmpIds
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPrintData(data);
      } else {
        alert(`❌ فشل تجهيز كشف الطباعة: ${data.error || 'حدث خطأ غير معروف'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    } finally {
      setPrintLoading(false);
    }
  };

  const handleToggleSelectEmp = (empId: string) => {
    setPrintSelectedEmpIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleSelectAllPrintEmps = () => {
    setPrintSelectedEmpIds(employees.map(e => e.id));
  };

  const handleDeselectAllPrintEmps = () => {
    setPrintSelectedEmpIds([]);
  };
  const [attendanceForm, setAttendanceForm] = useState({
    employee_id: '',
    project_id: '',
    attendance_date: new Date().toISOString().split('T')[0],
    check_in_time: '08:00',
    check_out_time: '17:00',
    hours_worked: '8',
    overtime_hours: '0',
    attendance_type: 'present',
    notes: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ key: string; name: string }>>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/employees/upload', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          setUploadedFiles(prev => [...prev, { key: data.key, name: data.filename }]);
        } else {
          alert(`فشل رفع الملف ${file.name}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء رفع الملفات.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveUploadedFile = (keyToRemove: string) => {
    setUploadedFiles(prev => prev.filter(f => f.key !== keyToRemove));
  };

  // Filters
  const [search, setSearch] = useState('');
  const [empStatusFilter, setEmpStatusFilter] = useState('all');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);

  // Attendance Date & Action Filters
  const [attendanceDateFilter, setAttendanceDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceEmpSearch, setAttendanceEmpSearch] = useState('');
  const [leaveWarningInfo, setLeaveWarningInfo] = useState<{ show: boolean; emp: any; takenLeaves: number; date: string } | null>(null);

  // Forms
  const [empForm, setEmpForm] = useState({
    employee_number: '', full_name: '', full_name_en: '', nationality: 'سعودي', id_number: '',
    iqama_number: '', iqama_expiry: '', passport_number: '', passport_expiry: '', job_title: '',
    employment_type: 'full_time', base_salary: '', housing_allowance: '', transport_allowance: '',
    other_allowances: '', bank_account: '', bank_name: '', iban: '', phone: '', email: '', status: 'active'
  });

  const [assetForm, setAssetForm] = useState({
    asset_code: '', asset_name: '', asset_type: 'tool', brand: '', model: '',
    serial_number: '', purchase_cost: '', condition: 'good', status: 'available',
    assigned_to: '', assignment_date: new Date().toISOString().split('T')[0], notes: ''
  });

  const [loanForm, setLoanForm] = useState({
    employee_id: '', amount: '', monthly_deduction: '', repayment_method: 'salary_deduction', notes: ''
  });

  // Fetch functions
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (empStatusFilter !== 'all') params.set('status', empStatusFilter);
    if (search) params.set('search', search);
    try {
      const res = await fetch(`/api/employees?${params}`);
      const data = await res.json();
      setEmployees(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, [empStatusFilter, search]);

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/payroll?month=${month}&year=${year}`);
      const data = await res.json();
      setPayroll(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, [month, year]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedProject) params.set('project_id', selectedProject);
    if (attendanceDateFilter) {
      params.set('date_from', attendanceDateFilter);
      params.set('date_to', attendanceDateFilter);
    }
    try {
      const res = await fetch(`/api/hr/attendance?${params}&limit=200`);
      const data = await res.json();
      setAttendance(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, [selectedProject, attendanceDateFilter]);

  const handleOpenQuickPresentModal = (emp: Employee) => {
    setAttendanceForm({
      employee_id: emp.id,
      project_id: selectedProject || projects[0]?.id || '',
      attendance_date: attendanceDateFilter,
      check_in_time: '08:00',
      check_out_time: '17:00',
      hours_worked: '8',
      overtime_hours: '0',
      attendance_type: 'present',
      notes: ''
    });
    setShowAttendanceModal(true);
  };

  const handleQuickRegisterAbsent = async (emp: Employee) => {
    try {
      setLoading(true);
      const res = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: emp.id,
          attendance_date: attendanceDateFilter,
          attendance_type: 'absent',
          notes: 'تسجيل غياب'
        })
      });
      if (res.ok) {
        alert(`✅ تم تسجيل غياب الموظف ${emp.full_name} لهذا اليوم (خصم اليومية).`);
        fetchAttendance();
      } else {
        const err = await res.json();
        alert(`❌ فشل تسجيل الغياب: ${err.error || 'حدث خطأ'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRegisterLeave = async (emp: Employee, forcePaid: boolean = false) => {
    const d = new Date(attendanceDateFilter);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();

    if (!forcePaid) {
      // Check existing leave count for this employee in month & year
      const takenLeaves = attendance.filter(a => 
        a.employee_id === emp.id && 
        (a.attendance_type === 'leave' || a.attendance_type === 'holiday') &&
        new Date(a.attendance_date).getMonth() + 1 === m &&
        new Date(a.attendance_date).getFullYear() === y &&
        a.attendance_date !== attendanceDateFilter
      ).length;

      if (takenLeaves >= 4) {
        setLeaveWarningInfo({
          show: true,
          emp,
          takenLeaves,
          date: attendanceDateFilter
        });
        return;
      }
    }

    try {
      setLoading(true);
      const res = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: emp.id,
          attendance_date: attendanceDateFilter,
          attendance_type: 'leave',
          notes: 'تسجيل إجازة مدفوعة الأجر'
        })
      });
      if (res.ok) {
        alert(`✅ تم تسجيل إجازة مدفوعة الأجر للموظف ${emp.full_name}.`);
        setLeaveWarningInfo(null);
        fetchAttendance();
      } else {
        const err = await res.json();
        alert(`❌ فشل تسجيل الإجازة: ${err.error || 'حدث خطأ'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAutoAbsent = async () => {
    const unrecordedEmps = employees.filter(emp => {
      const rec = attendance.find(a => a.employee_id === emp.id && (a.attendance_date === attendanceDateFilter || a.attendance_date.startsWith(attendanceDateFilter)));
      return !rec;
    });

    if (unrecordedEmps.length === 0) {
      alert('⚠️ جميع الموظفين لديهم تسجيلات حضور/غياب/إجازة حالية لهذا اليوم.');
      return;
    }

    if (!confirm(`هل تريد تثبيت الغياب التلقائي لعدد ${unrecordedEmps.length} موظف لم يتم تسجيل حضورهم لهذا اليوم (${attendanceDateFilter})؟`)) return;

    try {
      setLoading(true);
      for (const emp of unrecordedEmps) {
        await fetch('/api/hr/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: emp.id,
            attendance_date: attendanceDateFilter,
            attendance_type: 'absent',
            notes: 'غياب تلقائي عند انتهاء اليوم'
          })
        });
      }
      alert(`✅ تم تثبيت الغياب التلقائي لعدد ${unrecordedEmps.length} موظف بنجاح.`);
      fetchAttendance();
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ أثناء تثبيت الغياب التلقائي.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOvertime = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/overtime');
      const data = await res.json();
      setOvertime(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, []);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/assets');
      const data = await res.json();
      setAssets(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, []);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/documents');
      const data = await res.json();
      setDocuments(data && Array.isArray(data.data) ? data.data : []);
    } finally { setLoading(false); }
  }, []);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/loans');
      const data = await res.json();
      setLoans(data && Array.isArray(data.data) ? data.data : []);
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
      const validTabs: TabType[] = ['employees', 'payroll', 'attendance', 'overtime', 'assets', 'documents', 'loans'];
      if (tab && validTabs.includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'employees') fetchEmployees();
    if (activeTab === 'payroll') fetchPayroll();
    if (activeTab === 'attendance') fetchAttendance();
    if (activeTab === 'overtime') fetchOvertime();
    if (activeTab === 'assets') fetchAssets();
    if (activeTab === 'documents') fetchDocuments();
    if (activeTab === 'loans') fetchLoans();
  }, [activeTab, fetchEmployees, fetchPayroll, fetchAttendance, fetchOvertime, fetchAssets, fetchDocuments, fetchLoans]);

  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);

  // Actions
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingEmployee;
      const url = isEdit ? `/api/employees/${editingEmployee.id}` : '/api/employees';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...empForm, uploaded_files: uploadedFiles })
      });
      if (res.ok) {
        setShowEmpModal(false);
        setUploadedFiles([]);
        setEditingEmployee(null);
        setEmpForm({
          employee_number: '', full_name: '', full_name_en: '', nationality: 'سعودي', id_number: '',
          iqama_number: '', iqama_expiry: '', passport_number: '', passport_expiry: '', job_title: '',
          employment_type: 'full_time', base_salary: '', housing_allowance: '', transport_allowance: '',
          other_allowances: '', bank_account: '', bank_name: '', iban: '', phone: '', email: '', status: 'active'
        });
        fetchEmployees();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء حفظ الموظف: ${errData.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleDeleteEmployee = async (empId: string, empName: string) => {
    if (!confirm(`⚠️ هل أنت متأكد من حذف الموظف "${empName}" نهائياً؟`)) return;
    try {
      const res = await fetch(`/api/employees/${empId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('✅ تم حذف الموظف بنجاح!');
        fetchEmployees();
      } else {
        const err = await res.json();
        alert(`❌ فشل حذف الموظف: ${err.error || 'خطأ غير معروف'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleOpenEditEmployee = (emp: any) => {
    setEditingEmployee(emp);
    setEmpForm({
      employee_number: emp.employee_number || '',
      full_name: emp.full_name || '',
      full_name_en: emp.full_name_en || '',
      nationality: emp.nationality || 'سعودي',
      id_number: emp.id_number || '',
      iqama_number: emp.iqama_number || '',
      iqama_expiry: emp.iqama_expiry ? new Date(emp.iqama_expiry).toISOString().split('T')[0] : '',
      passport_number: emp.passport_number || '',
      passport_expiry: emp.passport_expiry ? new Date(emp.passport_expiry).toISOString().split('T')[0] : '',
      job_title: emp.job_title || '',
      employment_type: emp.employment_type || 'full_time',
      base_salary: String(emp.base_salary || ''),
      housing_allowance: String(emp.housing_allowance || ''),
      transport_allowance: String(emp.transport_allowance || ''),
      other_allowances: String(emp.other_allowances || ''),
      bank_account: emp.bank_account || '',
      bank_name: emp.bank_name || '',
      iban: emp.iban || '',
      phone: emp.phone || '',
      email: emp.email || '',
      status: emp.status || 'active'
    });
    setUploadedFiles([]);
    setShowEmpModal(true);
  };

  const handleOpenCreateEmployee = () => {
    setEditingEmployee(null);
    setEmpForm({
      employee_number: '', full_name: '', full_name_en: '', nationality: 'سعودي', id_number: '',
      iqama_number: '', iqama_expiry: '', passport_number: '', passport_expiry: '', job_title: '',
      employment_type: 'full_time', base_salary: '', housing_allowance: '', transport_allowance: '',
      other_allowances: '', bank_account: '', bank_name: '', iban: '', phone: '', email: '', status: 'active'
    });
    setUploadedFiles([]);
    setShowEmpModal(true);
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/hr/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetForm)
      });
      if (res.ok) {
        setShowAssetModal(false);
        setAssetForm({
          asset_code: '', asset_name: '', asset_type: 'tool', brand: '', model: '',
          serial_number: '', purchase_cost: '', condition: 'good', status: 'available',
          assigned_to: '', assignment_date: new Date().toISOString().split('T')[0], notes: ''
        });
        fetchAssets();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء حفظ العهدة: ${errData.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/hr/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanForm)
      });
      if (res.ok) {
        setShowLoanModal(false);
        setLoanForm({ employee_id: '', amount: '', monthly_deduction: '', repayment_method: 'salary_deduction', notes: '' });
        fetchLoans();
      } else {
        const errData = await res.json();
        alert(`حدث خطأ أثناء إضافة السلفة: ${errData.error || 'فشلت العملية'}`);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handlePayLoanInstallment = async (id: string, currentPaid: number, totalAmount: number) => {
    const payStr = prompt('أدخل قيمة الدفعة المسددة نقداً:', '0');
    if (payStr === null) return;
    const amountToPay = Number(payStr);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      alert('الرجاء إدخال مبلغ صحيح.');
      return;
    }
    const newPaid = currentPaid + amountToPay;
    try {
      const res = await fetch('/api/hr/loans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, paid_amount: newPaid })
      });
      if (res.ok) {
        fetchLoans();
        alert('✅ تم تسجيل السداد بنجاح!');
      } else {
        alert('❌ فشل تسجيل السداد.');
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleDeleteAsset = async (id: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذه العهدة؟')) return;
    try {
      const res = await fetch(`/api/hr/assets?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('✅ تم حذف العهدة بنجاح!');
        fetchAssets();
      } else {
        const err = await res.json();
        alert(`❌ فشل الحذف: ${err.error || 'حدث خطأ'}`);
      }
    } catch (e) {
      console.error(e);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleDeleteLoan = async (id: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذه السلفة؟')) return;
    try {
      const res = await fetch(`/api/hr/loans?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('✅ تم حذف السلفة بنجاح!');
        fetchLoans();
      } else {
        const err = await res.json();
        alert(`❌ فشل الحذف: ${err.error || 'حدث خطأ'}`);
      }
    } catch (e) {
      console.error(e);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleOvertimeAction = async (id: string, action: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/hr/overtime`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: action })
      });
      if (res.ok) fetchOvertime();
    } catch (err) { console.error(err); }
  };

  const handleCreateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceForm.employee_id || !attendanceForm.project_id || !attendanceForm.attendance_date) {
      alert('⚠️ يرجى تعبئة الحقول المطلوبة واختيار المشروع والموظف والتاريخ.');
      return;
    }
    try {
      const res = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: attendanceForm.employee_id,
          project_id: attendanceForm.project_id,
          attendance_date: attendanceForm.attendance_date,
          check_in_time: attendanceForm.check_in_time || null,
          check_out_time: attendanceForm.check_out_time || null,
          hours_worked: Number(attendanceForm.hours_worked) || 8,
          overtime_hours: Number(attendanceForm.overtime_hours) || 0,
          attendance_type: attendanceForm.attendance_type,
          notes: attendanceForm.notes
        })
      });
      if (res.ok) {
        setShowAttendanceModal(false);
        setAttendanceForm({
          employee_id: '',
          project_id: '',
          attendance_date: new Date().toISOString().split('T')[0],
          check_in_time: '08:00',
          check_out_time: '17:00',
          hours_worked: '8',
          overtime_hours: '0',
          attendance_type: 'present',
          notes: ''
        });
        fetchAttendance();
        alert('✅ تم تسجيل حضور اليومية وترحيل تكلفة أجر العامل كمنصرف للمشروع بنجاح!');
      } else {
        const err = await res.json();
        alert(`❌ فشل التسجيل: ${err.error || 'حدث خطأ'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا السجل؟ سيتم إلغاء قيد تكلفة العمالة المباشرة المُرتبط بالمشروع تلقائياً.')) return;
    try {
      const res = await fetch(`/api/hr/attendance?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('✅ تم حذف الحضور وإلغاء القيد المالي بنجاح!');
        fetchAttendance();
      } else {
        const err = await res.json();
        alert(`❌ فشل الحذف: ${err.error || 'حدث خطأ'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    }
  };

  const handleGeneratePayroll = async () => {
    if (!confirm(`هل تريد إعادة احتساب وتحديث كشف رواتب شهر ${month}-${year}؟`)) return;
    try {
      setLoading(true);
      const res = await fetch('/api/hr/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, recalculate: true })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ تم إعادة احتساب وتحديث كشف الرواتب لشهر ${month}-${year} بنجاح!`);
        fetchPayroll();
      } else {
        alert(`❌ فشل احتساب المسير: ${data.error || 'حدث خطأ غير معروف'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ في الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  const totalPayrollCost = payroll.reduce((acc, p) => acc + Number(p.net_salary || 0), 0);

  return (
    <AppLayout title="إدارة الموارد البشرية" subtitle="إدارة شؤون الموظفين، الرواتب، العهد، الحضور، وتراخيص OSHA" icon="👨‍💼">
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => handleTabChange('employees')}>👨‍💼 الموظفون</button>
        <button className={`tab-btn ${activeTab === 'payroll' ? 'active' : ''}`} onClick={() => handleTabChange('payroll')}>💳 الرواتب وهيكلة الأجور</button>
        <button className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => handleTabChange('attendance')}>📍 حضور المواقع (GPS)</button>
        <button className={`tab-btn ${activeTab === 'overtime' ? 'active' : ''}`} onClick={() => handleTabChange('overtime')}>⏰ الموافقات الإضافية</button>
        <button className={`tab-btn ${activeTab === 'assets' ? 'active' : ''}`} onClick={() => handleTabChange('assets')}>🔨 العهد الشخصية</button>
        <button className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => handleTabChange('documents')}>📜 تنبيهات الوثائق</button>
        <button className={`tab-btn ${activeTab === 'loans' ? 'active' : ''}`} onClick={() => handleTabChange('loans')}>💵 السلفيات والقروض</button>
      </div>

      {/* ======================== TAB: EMPLOYEES ======================== */}
      {activeTab === 'employees' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">👨‍💼 شؤون الموظفين</div>
              <div className="page-description">إدارة كادر العمل من مهندسين وفنيين لحام وتركيبات ومشرفين</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={handleOpenCreateEmployee}>+ إضافة موظف جديد</button>
            </div>
          </div>

          <div className="filter-bar">
            <div className="search-input-wrapper" style={{ maxWidth: '300px' }}>
              <span className="search-icon">🔍</span>
              <input className="search-input" placeholder="بحث باسم الموظف أو الرقم الوظيفي..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{ width: 'auto' }} value={empStatusFilter} onChange={e => setEmpStatusFilter(e.target.value)}>
              <option value="all">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="on_leave">في إجازة</option>
            </select>
          </div>

          <div className="card">
            {loading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : employees.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👨‍💼</div>
                <div className="empty-state-title">لا يوجد موظفون مسجلون</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الرقم الوظيفي</th>
                      <th>الاسم</th>
                      <th>المسمى الوظيفي</th>
                      <th>الجنسية</th>
                      <th>الراتب الأساسي</th>
                      <th>نوع التوظيف</th>
                      <th>الهاتف</th>
                      <th>الحالة</th>
                      <th style={{ textAlign: 'center' }}>العمليات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp.id}>
                        <td style={{ fontWeight: 700 }}>{emp.employee_number}</td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          <Link href={`/hr/employees/${emp.id}`} style={{ color: 'var(--brand-primary-light)', textDecoration: 'none' }}>
                            {emp.full_name}
                          </Link>
                        </td>
                        <td>{emp.job_title}</td>
                        <td>{emp.nationality || '-'}</td>
                        <td>{formatCurrency(emp.base_salary)}</td>
                        <td><span className={`badge ${typeBadge[emp.employment_type] || 'badge-muted'}`}>{typeLabels[emp.employment_type] || emp.employment_type}</span></td>
                        <td>{emp.phone || '-'}</td>
                        <td><span className={`badge ${statusBadge[emp.status] || 'badge-muted'}`}>{statusLabels[emp.status] || emp.status}</span></td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              className="btn btn-ghost text-primary btn-sm"
                              onClick={() => handleOpenEditEmployee(emp)}
                              title="تعديل"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-ghost text-danger btn-sm"
                              onClick={() => handleDeleteEmployee(emp.id, emp.full_name)}
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

      {/* ======================== TAB: PAYROLL ======================== */}
      {activeTab === 'payroll' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">💳 مسيرات الرواتب وتوزيع التكاليف</div>
              <div className="page-description">توزيع تكلفة رواتب المهندسين والعمال على المشاريع لتحليل ربحية كل مشروع بدقة</div>
            </div>
            <div className="page-header-actions" style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={handleOpenPrintModal}>🖨️ طباعة كشف الرواتب</button>
              <button className="btn btn-success" onClick={handleGeneratePayroll}>🔄 إعادة احتساب وتحديث المسير</button>
            </div>
          </div>

          <div className="filter-bar">
            <select className="form-control" style={{ width: 'auto' }} value={month} onChange={e => setMonth(Number(e.target.value))}>
              {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1} - شهر</option>)}
            </select>
            <select className="form-control" style={{ width: 'auto' }} value={year} onChange={e => setYear(Number(e.target.value))}>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>

          <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card success">
              <div className="stat-card-icon">💸</div>
              <div className="stat-value">{formatCurrency(totalPayrollCost)}</div>
              <div className="stat-label">إجمالي الرواتب واليوميات لهذا الشهر</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon">📊</div>
              <div className="stat-value">{payroll.length}</div>
              <div className="stat-label">موظفين مدرجين بالمسير</div>
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : payroll.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💸</div>
                <div className="empty-state-title">لا يوجد موظفون نشطون لإدراجهم في مسير هذا الشهر</div>
                <button className="btn btn-outline" style={{ marginTop: '0.5rem' }} onClick={handleGeneratePayroll}>إعادة احتساب وتحديث المسير</button>
              </div>
            ) : (
            <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الموظف</th>
                      <th>أيام الحضور والمدفوع</th>
                      <th>الراتب الأساسي المستحق</th>
                      <th>السكن والنقل</th>
                      <th>العمل الإضافي</th>
                      <th>الخصومات</th>
                      <th>صافي الراتب المستحق</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payroll.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.employee_name}</td>
                        <td>
                          <span className="badge badge-info">
                            {p.actual_days || p.working_days || 30} / {p.working_days || 30} يوم
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(p.base_salary)}</td>
                        <td>{formatCurrency(Number(p.housing_allowance || 0) + Number(p.transport_allowance || 0))}</td>
                        <td style={{ color: 'var(--status-success)' }}>+{formatCurrency(p.overtime_amount)}</td>
                        <td style={{ color: 'var(--status-danger)' }}>-{formatCurrency(p.deductions)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(p.net_salary)}</td>
                        <td><span className="badge badge-success">معتمد</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================== TAB: ATTENDANCE ======================== */}
      {activeTab === 'attendance' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">📍 حضور وانصراف وحركة يوميات المشاريع</div>
              <div className="page-description">عرض الكادر وتأكيد تسجيل الحضور والغياب والإجازات اليومية السريعة مع فحص رصيد 4 أيام الإجازة الشهري</div>
            </div>
            <div className="page-header-actions" style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-warning" onClick={handleBulkAutoAbsent} title="تطبيق غياب تلقائي لجميع الموظفين الذين لم يسجلوا اليوم">⚡ إنهاء اليوم وتثبيت الغياب للجميع</button>
              <button className="btn btn-primary" onClick={() => setShowAttendanceModal(true)}>➕ تسجيل تفاصيل حضور/إضافي يدوي</button>
            </div>
          </div>

          <div className="filter-bar" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>📅 تاريخ اليومية:</label>
              <input
                type="date"
                className="form-control"
                style={{ width: 'auto' }}
                value={attendanceDateFilter}
                onChange={e => setAttendanceDateFilter(e.target.value)}
              />
            </div>

            <div className="search-input-wrapper" style={{ maxWidth: '280px' }}>
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="بحث باسم الموظف أو الرقم..."
                value={attendanceEmpSearch}
                onChange={e => setAttendanceEmpSearch(e.target.value)}
              />
            </div>

            <select className="form-control" style={{ width: 'auto' }} value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
              <option value="">كل المواقع والمشاريع</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card success">
              <div className="stat-card-icon">✅</div>
              <div className="stat-value">
                {attendance.filter(a => ['present', 'late', 'half_day'].includes(a.attendance_type)).length}
              </div>
              <div className="stat-label">حاضر اليوم ({attendanceDateFilter})</div>
            </div>

            <div className="stat-card danger">
              <div className="stat-card-icon">❌</div>
              <div className="stat-value">
                {attendance.filter(a => a.attendance_type === 'absent').length + employees.filter(e => !attendance.some(a => a.employee_id === e.id && (a.attendance_date === attendanceDateFilter || a.attendance_date.startsWith(attendanceDateFilter)))).length}
              </div>
              <div className="stat-label">إجمالي الغياب والغياب التلقائي</div>
            </div>

            <div className="stat-card purple">
              <div className="stat-card-icon">🏖️</div>
              <div className="stat-value">
                {attendance.filter(a => ['leave', 'holiday'].includes(a.attendance_type)).length}
              </div>
              <div className="stat-label">إجازات مدفوعة الأجر</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon">👥</div>
              <div className="stat-value">{employees.length}</div>
              <div className="stat-label">إجمالي الكادر والعمالة النشطة</div>
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="empty-state"><div className="loading-spinner" /></div>
            ) : employees.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👨‍💼</div>
                <div className="empty-state-title">لا يوجد موظفون نشطون مسجلون في النظام</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الرقم الوظيفي</th>
                      <th>اسم الموظف</th>
                      <th>المسمى الوظيفي</th>
                      <th>حالة حضور اليوم ({attendanceDateFilter})</th>
                      <th>الموقع / المشروع</th>
                      <th style={{ textAlign: 'center' }}>الإجراءات والعمليات السريعة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees
                      .filter(emp => emp.full_name.includes(attendanceEmpSearch) || emp.employee_number.includes(attendanceEmpSearch))
                      .map(emp => {
                        const rec = attendance.find(a => a.employee_id === emp.id && (a.attendance_date === attendanceDateFilter || a.attendance_date.startsWith(attendanceDateFilter)));
                        const statusType = rec ? rec.attendance_type : 'none';

                        return (
                          <tr key={emp.id}>
                            <td style={{ fontWeight: 700 }}>{emp.employee_number}</td>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.full_name}</td>
                            <td>{emp.job_title}</td>
                            <td>
                              {statusType === 'present' || statusType === 'late' ? (
                                <span className="badge badge-success">✅ حاضر {rec?.overtime_hours ? `(+${rec.overtime_hours}س إضافي)` : ''}</span>
                              ) : statusType === 'half_day' ? (
                                <span className="badge badge-warning">🌗 نصف يومية</span>
                              ) : statusType === 'absent' ? (
                                <span className="badge badge-danger">❌ غياب مؤكد</span>
                              ) : statusType === 'leave' || statusType === 'holiday' ? (
                                <span className="badge badge-purple">🏖️ إجازة مدفوعة الأجر</span>
                              ) : (
                                <span className="badge badge-danger" style={{ opacity: 0.85 }} title="لم يسجل حضور/إذن ويحسب غياب تلقائياً إذا انتهى اليوم">❌ غياب تلقائي (لم يتم التسجيل)</span>
                              )}
                            </td>
                            <td>{rec?.project_name || (selectedProject ? projects.find(p => p.id === selectedProject)?.name : '-')}</td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleOpenQuickPresentModal(emp)}
                                  title="تسجيل حضور وتحديد الساعات والمشروع والإضافي"
                                >
                                  ✅ تسجيل حضور
                                </button>

                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleQuickRegisterAbsent(emp)}
                                  title="تسجيل غياب الموظف لهذا اليوم (خصم اليومية من الراتب)"
                                >
                                  ❌ تسجيل غياب
                                </button>

                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => handleQuickRegisterLeave(emp)}
                                  title="تسجيل إجازة مدفوعة الأجر (خصم من الـ 4 أيام الشهرية)"
                                >
                                  🏖️ تسجيل إجازة
                                </button>

                                {rec && (
                                  <button
                                    className="btn btn-ghost text-danger btn-sm"
                                    onClick={() => handleDeleteAttendance(rec.id)}
                                    title="حذف اليومية وإلغاء التسجيل لهذا اليوم"
                                  >
                                    🗑️ إلغاء
                                  </button>
                                )}
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

      {/* ======================== TAB: OVERTIME ======================== */}
      {activeTab === 'overtime' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">⏰ اعتمادات الأجور والساعات الإضافية للمشاريع</div>
              <div className="page-description">طلبات الساعات الإضافية للمواقع التي تعمل بوردية ليلية لتسليم المشاريع</div>
            </div>
          </div>

          <div className="card">
            {overtime.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-title">لا توجد طلبات عمل إضافي معلقة للموافقة</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الموظف</th>
                      <th>الموقع</th>
                      <th>التاريخ</th>
                      <th>الساعات المطلوبة</th>
                      <th>السبب</th>
                      <th>الحالة</th>
                      <th style={{ textAlign: 'center' }}>العمليات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overtime.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.employee_name}</td>
                        <td>{o.project_name || 'غير محدد'}</td>
                        <td>{new Date(o.overtime_date).toLocaleDateString('ar-SA')}</td>
                        <td style={{ fontWeight: 700, color: 'var(--status-success)' }}>{o.hours_requested} ساعة</td>
                        <td>{o.reason || '-'}</td>
                        <td>
                          <span className={`badge ${o.status === 'pending' ? 'badge-warning' : o.status === 'approved' ? 'badge-success' : 'badge-danger'}`}>
                            {o.status === 'pending' ? 'معلق' : o.status === 'approved' ? 'مقبول' : 'مرفوض'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {o.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button className="btn btn-success btn-sm" onClick={() => handleOvertimeAction(o.id, 'approved')}>✔️ موافقة</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleOvertimeAction(o.id, 'rejected')}>✕ رفض</button>
                            </div>
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

      {/* ======================== TAB: ASSETS ======================== */}
      {activeTab === 'assets' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">🔨 تتبع العهد الشخصية (Asset Tracking)</div>
              <div className="page-description">تتبع أجهزة اختبار شبكات الحريق والصواريخ واللابتوبات والسيارات المسلمة للمهندسين والمشرفين</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => setShowAssetModal(true)}>+ تسجيل عهدة جديدة</button>
            </div>
          </div>

          <div className="card">
            {assets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔨</div>
                <div className="empty-state-title">لا توجد عهد مسجلة في النظام</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>كود العهدة</th>
                      <th>اسم العهدة / المعدة</th>
                      <th>النوع والماركة</th>
                      <th>المستلم الحالي (الموظف)</th>
                      <th>تاريخ التسليم</th>
                      <th>الرقم التسلسلي (S/N)</th>
                      <th>الحالة الفنية</th>
                      <th>حالة العهدة</th>
                      <th style={{ textAlign: 'center' }}>العمليات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{a.asset_code}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.asset_name}</td>
                        <td>{a.asset_type} {a.brand ? `(${a.brand})` : ''}</td>
                        <td style={{ fontWeight: 600 }}>
                          {a.employee_name || a.assigned_to_name ? (
                            <span style={{ color: 'var(--brand-primary-light)' }}>
                              👤 {a.employee_name || a.assigned_to_name} {a.assigned_to_job ? `(${a.assigned_to_job})` : ''}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>🏛️ بالمخزن الرئيسي (غير مسندة)</span>
                          )}
                        </td>
                        <td>{a.assignment_date ? new Date(a.assignment_date).toLocaleDateString('ar-SA') : '-'}</td>
                        <td style={{ fontFamily: 'monospace' }}>{a.serial_number || '-'}</td>
                        <td><span className="badge badge-muted">{a.condition}</span></td>
                        <td>
                          <span className={`badge ${a.status === 'available' ? 'badge-success' : 'badge-primary'}`}>
                            {a.status === 'available' ? 'متوفرة بالمخزن' : 'مُسلمة للموظف'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-outline btn-sm text-danger"
                            onClick={() => handleDeleteAsset(a.id)}
                            title="حذف العهدة"
                          >
                            🗑️ حذف
                          </button>
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

      {/* ======================== TAB: DOCUMENTS ======================== */}
      {activeTab === 'documents' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">📜 الوثائق والتراخيص وتنبيهات الانتهاء</div>
              <div className="page-description">تنبيهات بانتهاء الإقامات، شهادات السلامة (OSHA)، ورخص السائقين والمعدات الكبيرة في المشاريع</div>
            </div>
          </div>

          {documents.some(d => d.days_remaining <= 30) && (
            <div className="alert alert-warning mb-4">
              ⚠️ <strong>تنبيه انتهاء وثائق:</strong> توجد وثائق عمل وإقامات وشهادات سلامة وصحة مهنية (OSHA) قاربت صلاحيتها على الانتهاء، يرجى التنسيق فوراً لتجديدها لتجنب توقف الأعمال في المواقع.
            </div>
          )}

          <div className="card">
            {documents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📜</div>
                <div className="empty-state-title">لا توجد سجلات تراخيص مسجلة</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>اسم الموظف</th>
                      <th>نوع الوثيقة</th>
                      <th>رقم الوثيقة</th>
                      <th>تاريخ الانتهاء</th>
                      <th>أيام متبقية</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((d, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.full_name}</td>
                        <td><span className="badge badge-primary">{docLabels[d.document_type] || d.document_type}</span></td>
                        <td>{d.document_number || '-'}</td>
                        <td>{d.expiry_date ? new Date(d.expiry_date).toLocaleDateString('ar-SA') : '-'}</td>
                        <td style={{ fontWeight: 700, color: d.days_remaining <= 30 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                          {d.days_remaining} يوم
                        </td>
                        <td>
                          <span className={`badge ${d.days_remaining <= 0 ? 'badge-danger' : d.days_remaining <= 30 ? 'badge-warning' : 'badge-success'}`}>
                            {d.days_remaining <= 0 ? 'منتهية' : d.days_remaining <= 30 ? 'تنتهي قريباً' : 'صالحة'}
                          </span>
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

      {/* ======================== TAB: LOANS ======================== */}
      {activeTab === 'loans' && (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">💵 السلفيات والقروض المالية للموظفين</div>
              <div className="page-description">متابعة سلف الموظفين والعمال، الاستقطاعات الشهرية، وتسجيل الدفعات النقدية المستلمة</div>
            </div>
            <button className="btn btn-primary" onClick={() => setShowLoanModal(true)}>➕ تسجيل سلفة جديدة</button>
          </div>

          <div className="stat-grid mb-4">
            <div className="stat-card">
              <div className="stat-label">إجمالي السلف والتمويل</div>
              <div className="stat-value">
                {formatCurrency(loans.reduce((acc, l) => acc + Number(l.amount || 0), 0))}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">إجمالي المبالغ المسددة</div>
              <div className="stat-value text-success">
                {formatCurrency(loans.reduce((acc, l) => acc + Number(l.paid_amount || 0), 0))}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">المتبقي للتحصيل</div>
              <div className="stat-value text-danger">
                {formatCurrency(
                  loans.reduce((acc, l) => acc + (Number(l.amount || 0) - Number(l.paid_amount || 0)), 0)
                )}
              </div>
            </div>
          </div>

          <div className="card">
            {loans.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💵</div>
                <div className="empty-state-title">لا توجد سلفيات مسجلة حالياً</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم الموظف</th>
                      <th>اسم الموظف</th>
                      <th>المسمى الوظيفي</th>
                      <th>تاريخ السلفة</th>
                      <th>قيمة السلفة</th>
                      <th>القسط الشهري</th>
                      <th>المسدد</th>
                      <th>المتبقي</th>
                      <th>طريقة السداد</th>
                      <th>الحالة</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((l) => {
                      const remaining = Number(l.amount) - Number(l.paid_amount);
                      return (
                        <tr key={l.id}>
                          <td>{l.employee_number}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.employee_name}</td>
                          <td>{l.employee_job_title}</td>
                          <td>{l.loan_date ? new Date(l.loan_date).toLocaleDateString('ar-SA') : '-'}</td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(l.amount)}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{formatCurrency(l.monthly_deduction)}</td>
                          <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{formatCurrency(l.paid_amount)}</td>
                          <td style={{ color: 'var(--status-danger)', fontWeight: 600 }}>{formatCurrency(remaining)}</td>
                          <td>
                            <span className="badge badge-muted">
                              {l.repayment_method === 'salary_deduction' ? 'استقطاع راتب' : l.repayment_method === 'cash' ? 'نقدي' : 'أخرى'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${l.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                              {l.status === 'paid' ? 'مسددة بالكامل' : 'نشطة'}
                            </span>
                          </td>
                          <td>
                            {l.status !== 'paid' && (
                              <button
                                className="btn btn-ghost text-primary btn-sm"
                                onClick={() => handlePayLoanInstallment(l.id, Number(l.paid_amount), Number(l.amount))}
                              >
                                💰 تسجيل سداد نقدي
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

      {/* ======================== MODAL: ADD LOAN ======================== */}
      {showLoanModal && (
        <div className="modal-overlay" onClick={() => setShowLoanModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">💵 تسجيل سلفة جديدة لموظف</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowLoanModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateLoan}>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label required">الموظف المستلف</label>
                  <select
                    className="form-control"
                    required
                    value={loanForm.employee_id}
                    onChange={e => setLoanForm({ ...loanForm, employee_id: e.target.value })}
                  >
                    <option value="">اختر الموظف...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.job_title})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">قيمة السلفة ({currencySymbol})</label>
                  <input
                    className="form-control"
                    type="number"
                    required
                    value={loanForm.amount}
                    onChange={e => setLoanForm({ ...loanForm, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">قسط الاستقطاع الشهري ({currencySymbol})</label>
                  <input
                    className="form-control"
                    type="number"
                    required
                    value={loanForm.monthly_deduction}
                    onChange={e => setLoanForm({ ...loanForm, monthly_deduction: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">طريقة سداد السلفة</label>
                  <select
                    className="form-control"
                    required
                    value={loanForm.repayment_method}
                    onChange={e => setLoanForm({ ...loanForm, repayment_method: e.target.value })}
                  >
                    <option value="salary_deduction">استقطاع من مسير الراتب الشهري</option>
                    <option value="cash">سداد نقدي مباشر</option>
                    <option value="other">طريقة أخرى</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">ملاحظات وشروط السلفة</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={loanForm.notes}
                    onChange={e => setLoanForm({ ...loanForm, notes: e.target.value })}
                    placeholder="مثال: خصم شهري يبدأ من شهر 8 القادم"
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowLoanModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 حفظ السلفة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: ADD EMPLOYEE ======================== */}
      {showEmpModal && (
        <div className="modal-overlay" onClick={() => setShowEmpModal(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingEmployee ? '✏️ تعديل بيانات الموظف' : '👨‍💼 إضافة موظف جديد'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEmpModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveEmployee}>
              <div className="form-grid form-grid-4">
                <div className="form-group">
                  <label className="form-label required">الرقم الوظيفي</label>
                  <input className="form-control" required value={empForm.employee_number} onChange={e => setEmpForm({...empForm, employee_number: e.target.value})} placeholder="EMP-001" />
                </div>
                <div className="form-group">
                  <label className="form-label required">الاسم الكامل</label>
                  <input className="form-control" required value={empForm.full_name} onChange={e => setEmpForm({...empForm, full_name: e.target.value})} placeholder="أحمد سعيد الغامدي" />
                </div>
                <div className="form-group">
                  <label className="form-label">الاسم بالإنجليزية</label>
                  <input className="form-control" value={empForm.full_name_en} onChange={e => setEmpForm({...empForm, full_name_en: e.target.value})} placeholder="Ahmed Said" />
                </div>
                <div className="form-group">
                  <label className="form-label">الجنسية</label>
                  <input className="form-control" value={empForm.nationality} onChange={e => setEmpForm({...empForm, nationality: e.target.value})} placeholder="سعودي / مقيم" />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الهوية / الإقامة</label>
                  <input className="form-control" value={empForm.iqama_number} onChange={e => setEmpForm({...empForm, iqama_number: e.target.value})} placeholder="10xxxxxxxx" />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ انتهاء الإقامة</label>
                  <input className="form-control" type="date" value={empForm.iqama_expiry} onChange={e => setEmpForm({...empForm, iqama_expiry: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label required">المسمى الوظيفي</label>
                  <input className="form-control" required value={empForm.job_title} onChange={e => setEmpForm({...empForm, job_title: e.target.value})} placeholder="فني تركيبات / مهندس موقع" />
                </div>
                <div className="form-group">
                  <label className="form-label">نوع التوظيف</label>
                  <select className="form-control" value={empForm.employment_type} onChange={e => setEmpForm({...empForm, employment_type: e.target.value})}>
                    <option value="full_time">دوام كامل</option>
                    <option value="part_time">دوام جزئي</option>
                    <option value="contract">عقد مؤقت</option>
                    <option value="daily">يومية</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">الراتب الأساسي</label>
                  <input className="form-control" type="number" required value={empForm.base_salary} onChange={e => setEmpForm({...empForm, base_salary: e.target.value})} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">بدل السكن</label>
                  <input className="form-control" type="number" value={empForm.housing_allowance} onChange={e => setEmpForm({...empForm, housing_allowance: e.target.value})} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">بدل النقل</label>
                  <input className="form-control" type="number" value={empForm.transport_allowance} onChange={e => setEmpForm({...empForm, transport_allowance: e.target.value})} placeholder="0.00" />
                </div>
                 <div className="form-group">
                  <label className="form-label">رقم الهاتف</label>
                  <input className="form-control" value={empForm.phone} onChange={e => setEmpForm({...empForm, phone: e.target.value})} placeholder="05xxxxxxxx" />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 4', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, color: 'var(--brand-primary-light)' }}>📁 الملفات المرفقة للموظف (صور، PDF، Excel)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*,.pdf,.xls,.xlsx" 
                      onChange={handleFileUpload} 
                      disabled={uploading}
                      style={{ display: 'none' }}
                      id="emp-file-upload-input"
                    />
                    <label 
                      htmlFor="emp-file-upload-input" 
                      className="btn btn-outline" 
                      style={{ cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {uploading ? (
                        <>
                          <span className="loading-spinner" style={{ width: '16px', height: '16px' }} />
                          جاري الرفع...
                        </>
                      ) : '➕ اختر ملفات للرفع'}
                    </label>
                  </div>
                  
                  {uploadedFiles.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      {uploadedFiles.map((file) => (
                        <div key={file.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-primary)' }}>📎 {file.name}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveUploadedFile(file.key)}
                            style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontWeight: 700 }}
                          >
                            حذف
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowEmpModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 حفظ الموظف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: ADD ASSET ======================== */}
      {showAssetModal && (
        <div className="modal-overlay" onClick={() => setShowAssetModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div className="modal-title">🔨 تسجيل عهدة جديدة وتسليمها لموظف</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAssetModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateAsset} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem 1.5rem' }}>
                <div className="form-grid form-grid-2" style={{ gap: '1.25rem' }}>
                  {/* Select Employee to link custody */}
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label required" style={{ fontWeight: 700, color: 'var(--brand-primary-light)' }}>
                      👤 الموظف المستلم للعهدة (اختر الموظف)
                    </label>
                    <select
                      className="form-control"
                      value={assetForm.assigned_to}
                      onChange={e => {
                        const empId = e.target.value;
                        setAssetForm({
                          ...assetForm,
                          assigned_to: empId,
                          status: empId ? 'assigned' : 'available'
                        });
                      }}
                      style={{ fontSize: '0.95rem', fontWeight: 600 }}
                    >
                      <option value="">-- بدون موظف (متوفرة بالمخزن الرئيسي) --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name} ({emp.job_title || 'موظف'} - {emp.employee_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label required">كود العهدة</label>
                    <input className="form-control" required value={assetForm.asset_code} onChange={e => setAssetForm({...assetForm, asset_code: e.target.value})} placeholder="AST-100" />
                  </div>

                  <div className="form-group">
                    <label className="form-label required">اسم العهدة / المعدة</label>
                    <input className="form-control" required value={assetForm.asset_name} onChange={e => setAssetForm({...assetForm, asset_name: e.target.value})} placeholder="شنيور هيلتي / لابتوب / سيارة" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">نوع العهدة</label>
                    <select className="form-control" value={assetForm.asset_type} onChange={e => setAssetForm({...assetForm, asset_type: e.target.value})}>
                      <option value="tool">عدة يدوية/كهربائية</option>
                      <option value="vehicle">سيارة/معدة كبيرة</option>
                      <option value="laptop">جهاز كمبيوتر/لابتوب</option>
                      <option value="phone">هاتف محمول</option>
                      <option value="equipment">جهاز اختبار حريق/موقع</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">تاريخ التسليم</label>
                    <input
                      type="date"
                      className="form-control"
                      value={assetForm.assignment_date}
                      onChange={e => setAssetForm({ ...assetForm, assignment_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">الماركة (Brand)</label>
                    <input className="form-control" value={assetForm.brand} onChange={e => setAssetForm({...assetForm, brand: e.target.value})} placeholder="Bosch / Makita / DeWalt" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">الموديل (Model)</label>
                    <input className="form-control" value={assetForm.model} onChange={e => setAssetForm({...assetForm, model: e.target.value})} placeholder="مثال: GBH 2-26" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">الرقم التسلسلي (Serial Number / S/N)</label>
                    <input className="form-control" value={assetForm.serial_number} onChange={e => setAssetForm({...assetForm, serial_number: e.target.value})} placeholder="SN-12345678" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">قيمة / تكلفة الشراء ({currencySymbol})</label>
                    <input className="form-control" type="number" value={assetForm.purchase_cost} onChange={e => setAssetForm({...assetForm, purchase_cost: e.target.value})} placeholder="0.00" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">الحالة الفنية للمعدة</label>
                    <select className="form-control" value={assetForm.condition} onChange={e => setAssetForm({...assetForm, condition: e.target.value})}>
                      <option value="new">جديدة</option>
                      <option value="good">ممتازة</option>
                      <option value="fair">مستعملة بحالة جيدة</option>
                      <option value="poor">تحتاج صيانة</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">ملاحظات وحالة تسليم العهدة</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={assetForm.notes}
                      onChange={e => setAssetForm({...assetForm, notes: e.target.value})}
                      placeholder="تفاصيل الشنطة أو الملحقات المسلمة مع العهدة..."
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '1rem 1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAssetModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 600 }}>💾 حفظ العهدة وتسليمها</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: ADD ATTENDANCE / WAGES ======================== */}
      {showAttendanceModal && (
        <div className="modal-overlay" onClick={() => {
          setShowAttendanceModal(false);
          setAttendanceForm({
            employee_id: '',
            project_id: '',
            attendance_date: new Date().toISOString().split('T')[0],
            check_in_time: '08:00',
            check_out_time: '17:00',
            hours_worked: '8',
            overtime_hours: '0',
            attendance_type: 'present',
            notes: ''
          });
        }}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div className="modal-title">📍 تسجيل حضور ويومية عمالة وموقع جديد</div>
              <button className="btn btn-ghost btn-icon" onClick={() => {
                setShowAttendanceModal(false);
                setAttendanceForm({
                  employee_id: '',
                  project_id: '',
                  attendance_date: new Date().toISOString().split('T')[0],
                  check_in_time: '08:00',
                  check_out_time: '17:00',
                  hours_worked: '8',
                  overtime_hours: '0',
                  attendance_type: 'present',
                  notes: ''
                });
              }}>✕</button>
            </div>
            <form onSubmit={handleCreateAttendance} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem 1.5rem' }}>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label required">الموظف / المشرف / العامل</label>
                  <select
                    className="form-control"
                    required
                    value={attendanceForm.employee_id}
                    onChange={e => setAttendanceForm({ ...attendanceForm, employee_id: e.target.value })}
                  >
                    <option value="">اختر من الكادر...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.job_title} - {typeLabels[emp.employment_type] || emp.employment_type})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">على قوة مشروع / موقع</label>
                  <select
                    className="form-control"
                    required
                    value={attendanceForm.project_id}
                    onChange={e => setAttendanceForm({ ...attendanceForm, project_id: e.target.value })}
                  >
                    <option value="">اختر المشروع/الموقع لتسجيل اليومية عليه...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">تاريخ اليومية</label>
                  <input
                    className="form-control"
                    type="date"
                    required
                    value={attendanceForm.attendance_date}
                    onChange={e => setAttendanceForm({ ...attendanceForm, attendance_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">حالة الحضور</label>
                  <select
                    className="form-control"
                    value={attendanceForm.attendance_type}
                    onChange={e => setAttendanceForm({ ...attendanceForm, attendance_type: e.target.value })}
                  >
                    <option value="present">حاضر (يومية كاملة)</option>
                    <option value="half_day">نصف يومية</option>
                    <option value="late">حاضر مع تأخر</option>
                    <option value="absent">غياب (بدون تكلفة)</option>
                    <option value="leave">إجازة رسمية</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ساعات العمل العادية</label>
                  <input
                    className="form-control"
                    type="number"
                    value={attendanceForm.hours_worked}
                    onChange={e => setAttendanceForm({ ...attendanceForm, hours_worked: e.target.value })}
                    placeholder="8"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ساعات العمل الإضافي (إن وجد)</label>
                  <input
                    className="form-control"
                    type="number"
                    value={attendanceForm.overtime_hours}
                    onChange={e => setAttendanceForm({ ...attendanceForm, overtime_hours: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">وقت الحضور الفعلي</label>
                  <input
                    className="form-control"
                    type="time"
                    value={attendanceForm.check_in_time}
                    onChange={e => setAttendanceForm({ ...attendanceForm, check_in_time: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">وقت الانصراف الفعلي</label>
                  <input
                    className="form-control"
                    type="time"
                    value={attendanceForm.check_out_time}
                    onChange={e => setAttendanceForm({ ...attendanceForm, check_out_time: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">ملاحظات اليومية</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={attendanceForm.notes}
                    onChange={e => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
                    placeholder="ملاحظات الأعمال أو المشرف بالموقع..."
                  />
                </div>
              </div>
              
              {attendanceForm.employee_id && (
                <div className="alert alert-info" style={{ marginTop: '1rem' }}>
                  {(() => {
                    const emp = employees.find(e => e.id === attendanceForm.employee_id);
                    if (!emp) return null;
                    const baseSalary = Number(emp.base_salary || 0);
                    const dailyRate = emp.employment_type === 'daily' ? baseSalary : (baseSalary / 30);
                    const otHours = Number(attendanceForm.overtime_hours || 0);
                    const otRate = 25; // Overtime rate per hour
                    
                    let calculatedCost = 0;
                    if (attendanceForm.attendance_type === 'present' || attendanceForm.attendance_type === 'late') {
                      calculatedCost = dailyRate + (otHours * otRate);
                    } else if (attendanceForm.attendance_type === 'half_day') {
                      calculatedCost = (dailyRate / 2) + (otHours * otRate);
                    }

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                        <div><strong>اليومية المحتسبة:</strong> {formatCurrency(dailyRate)} {emp.employment_type !== 'daily' && '(راتب شهري مقسم على 30 يوم)'}</div>
                        {otHours > 0 && <div><strong>الإضافي ({otHours} س × 25):</strong> {formatCurrency(otHours * otRate)}</div>}
                        <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                          <strong style={{ color: 'var(--brand-primary)' }}>التكلفة المباشرة للعمالة المُرّحلة للمشروع: </strong>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)' }}>{formatCurrency(calculatedCost)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              </div>
              
              <div className="modal-footer" style={{ flexShrink: 0, borderTop: '1px solid var(--border-normal)', padding: '1rem 1.5rem', marginTop: 0 }}>
                <button type="button" className="btn btn-outline" onClick={() => {
                  setShowAttendanceModal(false);
                  setAttendanceForm({
                    employee_id: '',
                    project_id: '',
                    attendance_date: new Date().toISOString().split('T')[0],
                    check_in_time: '08:00',
                    check_out_time: '17:00',
                    hours_worked: '8',
                    overtime_hours: '0',
                    attendance_type: 'present',
                    notes: ''
                  });
                }}>إلغاء</button>
                <button type="submit" className="btn btn-primary">💾 تسجيل الحضور وتكلفة المشروع</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================== MODAL: PRINT PAYROLL ======================== */}
      {showPrintPayrollModal && (
        <div className="modal-overlay" onClick={() => setShowPrintPayrollModal(false)}>
          <div className="modal modal-xl print-modal-content" style={{ maxWidth: printData ? '1100px' : '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🖨️ طباعة كشف مسير الرواتب والمستحقات</div>
              <button className="modal-close" onClick={() => setShowPrintPayrollModal(false)}>✕</button>
            </div>

            {!printData ? (
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1.25rem' }}>
                {/* Step 1: Date Filter Mode */}
                <div className="card" style={{ marginBottom: '1.25rem', background: 'var(--surface-card)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '1rem', color: 'var(--brand-primary-light)' }}>
                    1️⃣ تحديد الفترة الزمنية (Date Range):
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: printDateMode === 'month' ? 700 : 400 }}>
                      <input type="radio" name="dateMode" checked={printDateMode === 'month'} onChange={() => setPrintDateMode('month')} />
                      📅 شهر معين (Month)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: printDateMode === 'day' ? 700 : 400 }}>
                      <input type="radio" name="dateMode" checked={printDateMode === 'day'} onChange={() => setPrintDateMode('day')} />
                      📆 يوم محدد (Single Day)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: printDateMode === 'range' ? 700 : 400 }}>
                      <input type="radio" name="dateMode" checked={printDateMode === 'range'} onChange={() => setPrintDateMode('range')} />
                      🗓️ مدة مخصصة (Custom Range)
                    </label>
                  </div>

                  {printDateMode === 'month' && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">الشهر:</label>
                        <select className="form-control" value={printMonth} onChange={e => setPrintMonth(Number(e.target.value))}>
                          {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1} - شهر</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">السنة:</label>
                        <select className="form-control" value={printYear} onChange={e => setPrintYear(Number(e.target.value))}>
                          <option value="2026">2026</option>
                          <option value="2025">2025</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {printDateMode === 'day' && (
                    <div className="form-group">
                      <label className="form-label">التاريخ المحدد:</label>
                      <input type="date" className="form-control" value={printSingleDate} onChange={e => setPrintSingleDate(e.target.value)} />
                    </div>
                  )}

                  {printDateMode === 'range' && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">من تاريخ (البداية):</label>
                        <input type="date" className="form-control" value={printStartDate} onChange={e => setPrintStartDate(e.target.value)} />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">إلى تاريخ (النهاية):</label>
                        <input type="date" className="form-control" value={printEndDate} onChange={e => setPrintEndDate(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 2: Employee Scope */}
                <div className="card" style={{ background: 'var(--surface-card)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '1rem', color: 'var(--brand-primary-light)' }}>
                    2️⃣ تحديد الموظفين (Employee Scope):
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: printEmpMode === 'all' ? 700 : 400 }}>
                      <input type="radio" name="empMode" checked={printEmpMode === 'all'} onChange={() => setPrintEmpMode('all')} />
                      👥 جميع الموظفين النشطين
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: printEmpMode === 'single' ? 700 : 400 }}>
                      <input type="radio" name="empMode" checked={printEmpMode === 'single'} onChange={() => setPrintEmpMode('single')} />
                      👤 موظف واحد فقط
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: printEmpMode === 'selected' ? 700 : 400 }}>
                      <input type="radio" name="empMode" checked={printEmpMode === 'selected'} onChange={() => setPrintEmpMode('selected')} />
                      📋 تحديد مجموعة من الموظفين ({printSelectedEmpIds.length})
                    </label>
                  </div>

                  {printEmpMode === 'single' && (
                    <div className="form-group">
                      <label className="form-label">اختر الموظف:</label>
                      <select className="form-control" value={printSingleEmpId} onChange={e => setPrintSingleEmpId(e.target.value)}>
                        <option value="">-- اختر موظف من القائمة --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.employee_number} - {emp.full_name} ({emp.job_title})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {printEmpMode === 'selected' && (
                    <div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="بحث باسم الموظف..."
                          value={printSearch}
                          onChange={e => setPrintSearch(e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={handleSelectAllPrintEmps}>تحديد الكل</button>
                        <button type="button" className="btn btn-ghost text-danger btn-sm" onClick={handleDeselectAllPrintEmps}>إلغاء التحديد</button>
                      </div>

                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-normal)', borderRadius: '8px', padding: '0.5rem' }}>
                        {employees
                          .filter(emp => emp.full_name.includes(printSearch) || emp.employee_number.includes(printSearch))
                          .map(emp => {
                            const isChecked = printSelectedEmpIds.includes(emp.id);
                            return (
                              <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.35rem 0.5rem', borderRadius: '4px', cursor: 'pointer', background: isChecked ? 'rgba(79, 70, 229, 0.08)' : 'transparent' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleSelectEmp(emp.id)}
                                />
                                <div>
                                  <span style={{ fontWeight: 600 }}>{emp.full_name}</span>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>({emp.employee_number} - {emp.job_title})</span>
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer" style={{ borderTop: 'none', padding: '1.25rem 0 0 0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowPrintPayrollModal(false)}>إلغاء</button>
                  <button type="button" className="btn btn-primary" onClick={handleFetchPrintData} disabled={printLoading}>
                    {printLoading ? 'جاري التجهيز...' : '👁️ معاينة وتأكيد كشف الطباعة'}
                  </button>
                </div>
              </div>
            ) : (
              /* Print Preview & Action */
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: 'var(--surface-card)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 600 }}>
                    جاهز للطباعة | {printData.data?.length} موظف مدرج | {printData.periodLabel}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setPrintData(null)}>⚙️ تعديل الفلتر والخيارات</button>
                    <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ طباعة الآن (Print / PDF)</button>
                  </div>
                </div>

                {/* Printable Container */}
                <div id="payroll-printable-area" style={{ background: '#fff', color: '#111827', padding: '2rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <style>{`
                    @media print {
                      body * { visibility: hidden !important; }
                      #payroll-printable-area, #payroll-printable-area * { visibility: visible !important; }
                      #payroll-printable-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 15mm !important;
                        box-shadow: none !important;
                        border: none !important;
                      }
                      .no-print { display: none !important; }
                    }
                  `}</style>

                  {/* Header */}
                  <div style={{ borderBottom: '2px solid #1e293b', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>شركة الرئير للإنشاءات والمقاولات العامة</div>
                      <div style={{ fontSize: '0.9rem', color: '#64748b' }}>إدارة الموارد البشرية والرواتب - مسيرات الأجور</div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4f46e5' }}>كشف مسير الرواتب والمستحقات</div>
                      <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem' }}>{printData.periodLabel}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>تاريخ الاستخراج: {new Date().toLocaleDateString('ar-EG')}</div>
                    </div>
                  </div>

                  {/* Printable Data Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'right', marginBottom: '2rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1' }}>#</th>
                        <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1' }}>الرقم الوظيفي</th>
                        <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1' }}>اسم الموظف</th>
                        <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1' }}>المسمى الوظيفي</th>
                        <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>أيام الحضور والمدفوع</th>
                        <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1' }}>الراتب المستحق</th>
                        <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1' }}>البدلات</th>
                        <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1' }}>العمل الإضافي</th>
                        <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1' }}>الخصومات</th>
                        <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontWeight: 700 }}>صافي الراتب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printData.data?.map((row: any, idx: number) => (
                        <tr key={row.id || idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                          <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', fontWeight: 600 }}>{row.employee_number}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#0f172a' }}>{row.employee_name}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>{row.job_title}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{row.actual_days} / {row.working_days}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>{formatCurrency(row.base_salary)}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>{formatCurrency(row.other_allowances || (Number(row.housing_allowance || 0) + Number(row.transport_allowance || 0)))}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', color: '#16a34a' }}>+{formatCurrency(row.overtime_amount)}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', color: '#dc2626' }}>-{formatCurrency(row.deductions)}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(row.net_salary)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#e2e8f0', fontWeight: 800, borderTop: '2px solid #94a3b8' }}>
                        <td colSpan={5} style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>الإجمالي الكلي المستحق ({printData.summary?.employeeCount} موظف)</td>
                        <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>{formatCurrency(printData.summary?.totalBaseSalary)}</td>
                        <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>{formatCurrency(printData.summary?.totalAllowances)}</td>
                        <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#16a34a' }}>+{formatCurrency(printData.summary?.totalOvertime)}</td>
                        <td style={{ padding: '10px', border: '1px solid #cbd5e1', color: '#dc2626' }}>-{formatCurrency(printData.summary?.totalDeductions)}</td>
                        <td style={{ padding: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', color: '#1e1b4b' }}>{formatCurrency(printData.summary?.totalNetSalary)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Official Signatures */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '3rem', textAlign: 'center', fontSize: '0.85rem', color: '#334155' }}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: '2.5rem' }}>إعداد مسؤول الموارد البشرية</div>
                      <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '0.4rem' }}>التوقيع: ...........................</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: '2.5rem' }}>المراجعة والتدقيق المالي</div>
                      <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '0.4rem' }}>التوقيع: ...........................</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: '2.5rem' }}>اعتماد المدير العام</div>
                      <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '0.4rem' }}>التوقيع: ...........................</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================== MODAL: LEAVE EXCEEDED WARNING ======================== */}
      {leaveWarningInfo && (
        <div className="modal-overlay" onClick={() => setLeaveWarningInfo(null)}>
          <div className="modal" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div className="modal-title" style={{ color: 'var(--status-danger)' }}>⚠️ تنبيه استنفاد رصيد الإجازات الشهرية</div>
              <button className="modal-close" onClick={() => setLeaveWarningInfo(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '1.25rem' }}>
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                الموظف <strong>{leaveWarningInfo.emp?.full_name}</strong> قد استنفد بالفعل الـ <strong>4 أيام إجازة المدفوعة الأجر</strong> المخصصة له لهذا الشهر (قام بتسجيل {leaveWarningInfo.takenLeaves} أيام إجازة سابقاً خلال الشهر).
              </div>

              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                يرجى اختيار إجراء للتعامل مع طلب الإجازة اليومية بتاريخ ({leaveWarningInfo.date}):
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  className="btn btn-warning"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => handleQuickRegisterLeave(leaveWarningInfo.emp, true)}
                >
                  🏖️ احتساب إجازة مدفوعة استثنائية (تجاوز الحد الرصيدي)
                </button>

                <button
                  className="btn btn-danger"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    const emp = leaveWarningInfo.emp;
                    setLeaveWarningInfo(null);
                    handleQuickRegisterAbsent(emp);
                  }}
                >
                  ❌ احتساب كـ غياب / إجازة غير مدفوعة الأجر (خصم أجر اليوم)
                </button>

                <button
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setLeaveWarningInfo(null)}
                >
                  إلغاء الأمر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
