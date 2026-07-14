'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate authentication
    setTimeout(() => {
      // Seeded accounts check for mock validation, or allow any for demo ease
      const validEmails = [
        'admin@alrayeq.com',
        'manager@alrayeq.com',
        'engineer1@alrayeq.com',
        'supervisor1@alrayeq.com',
        'store1@alrayeq.com',
        'hr@alrayeq.com',
        'accountant@alrayeq.com'
      ];

      if (!email.includes('@')) {
        setError('يرجى إدخال بريد إلكتروني صالح.');
        setLoading(false);
        return;
      }

      if (password.length < 4) {
        setError('يجب أن تتكون كلمة المرور من 4 أحرف على الأقل.');
        setLoading(false);
        return;
      }

      let role = 'admin';
      let name = 'مدير النظام';
      if (email.startsWith('manager')) { role = 'manager'; name = 'محمد العمري'; }
      else if (email.startsWith('engineer')) { role = 'engineer'; name = 'أحمد الزهراني'; }
      else if (email.startsWith('supervisor')) { role = 'supervisor'; name = 'سالم الغامدي'; }
      else if (email.startsWith('store')) { role = 'store_keeper'; name = 'خالد المطيري'; }
      else if (email.startsWith('hr')) { role = 'hr'; name = 'نورة السهلي'; }
      else if (email.startsWith('accountant')) { role = 'accountant'; name = 'ريم الحربي'; }

      localStorage.setItem('user_role', role);
      localStorage.setItem('user_email', email);
      localStorage.setItem('user_name', name);

      console.log(`User logged in: ${email} with role: ${role}`);
      router.push('/dashboard');
    }, 1000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
      direction: 'rtl'
    }}>
      {/* Background Glows */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'rgba(59, 130, 246, 0.15)',
        filter: 'blur(80px)',
        top: '20%',
        right: '10%',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '250px',
        height: '250px',
        borderRadius: '50%',
        background: 'rgba(245, 158, 11, 0.1)',
        filter: 'blur(70px)',
        bottom: '20%',
        left: '10%',
        pointerEvents: 'none'
      }} />

      {/* Login Card */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '2.5rem 2rem',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        zIndex: 10,
        animation: 'slideUp 0.4s ease'
      }}>
        {/* Logo / Icon */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 1rem',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
          }}>
            🔥
          </div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#f8fafc',
            fontFamily: 'Cairo',
            marginBottom: '0.25rem'
          }}>
            الرايق للمقاولات
          </h1>
          <p style={{
            fontSize: '0.8rem',
            color: '#94a3b8',
            fontWeight: 500
          }}>
            بوابة الإدارة للمقاولات الكهروميكانيكية
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            padding: '0.75rem',
            fontSize: '0.8rem',
            color: '#fca5a5',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label required" style={{ color: '#cbd5e1' }}>البريد الإلكتروني</label>
            <input
              className="form-control"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@alrayeq.com"
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc'
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label required" style={{ color: '#cbd5e1' }}>كلمة المرور</label>
            <input
              className="form-control"
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: '-0.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8', cursor: 'pointer' }}>
              <input type="checkbox" style={{ accentColor: '#3b82f6' }} />
              <span>تذكرني</span>
            </label>
            <span style={{ color: '#60a5fa', cursor: 'pointer' }} onClick={() => alert('الرجاء التواصل مع إدارة النظام لإعادة تعيين كلمة المرور.')}>
              نسيت كلمة المرور؟
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{
              marginTop: '0.5rem',
              fontWeight: 700,
              fontSize: '0.95rem',
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              height: '46px'
            }}
          >
            {loading ? (
              <div className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
            ) : (
              'تسجيل الدخول الآمن 🔑'
            )}
          </button>
        </form>

        {/* Demo Credentials Helper */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '0.75rem',
          color: '#64748b',
          lineHeight: '1.5'
        }}>
          <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>💡 بيانات الدخول التجريبية (Demo):</div>
          <div>البريد: <span style={{ color: '#cbd5e1' }}>admin@alrayeq.com</span></div>
          <div>الرمز: <span style={{ color: '#cbd5e1' }}>123456</span></div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
