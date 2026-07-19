'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const input = usernameOrEmail.trim().toLowerCase();

    // Simulate authentication
    setTimeout(() => {
      let matchedEmail = '';
      
      // Seeded accounts check
      if (input.includes('@')) {
        matchedEmail = input;
      } else {
        if (input === 'admin') matchedEmail = 'admin@alrayeq.com';
        else if (input === 'manager') matchedEmail = 'manager@alrayeq.com';
        else if (input === 'engineer' || input === 'engineer1') matchedEmail = 'engineer1@alrayeq.com';
        else if (input === 'supervisor' || input === 'supervisor1') matchedEmail = 'supervisor1@alrayeq.com';
        else if (input === 'store' || input === 'store1') matchedEmail = 'store1@alrayeq.com';
        else if (input === 'hr') matchedEmail = 'hr@alrayeq.com';
        else if (input === 'accountant') matchedEmail = 'accountant@alrayeq.com';
      }

      const validEmails = [
        'admin@alrayeq.com',
        'manager@alrayeq.com',
        'engineer1@alrayeq.com',
        'supervisor1@alrayeq.com',
        'store1@alrayeq.com',
        'hr@alrayeq.com',
        'accountant@alrayeq.com'
      ];

      if (!matchedEmail || !validEmails.includes(matchedEmail)) {
        setError('اسم المستخدم أو البريد الإلكتروني غير مسجل بالنظام.');
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
      if (matchedEmail.startsWith('manager')) { role = 'manager'; name = 'محمد العمري'; }
      else if (matchedEmail.startsWith('engineer')) { role = 'engineer'; name = 'أحمد الزهراني'; }
      else if (matchedEmail.startsWith('supervisor')) { role = 'supervisor'; name = 'سالم الغامدي'; }
      else if (matchedEmail.startsWith('store')) { role = 'store_keeper'; name = 'خالد المطيري'; }
      else if (matchedEmail.startsWith('hr')) { role = 'hr'; name = 'نورة السهلي'; }
      else if (matchedEmail.startsWith('accountant')) { role = 'accountant'; name = 'ريم الحربي'; }

      localStorage.setItem('user_role', role);
      localStorage.setItem('user_email', matchedEmail);
      localStorage.setItem('user_name', name);

      console.log(`User logged in: ${matchedEmail} with role: ${role}`);
      router.push('/dashboard');
    }, 1200);
  };

  return (
    <div className="login-page-container">
      {/* Background Animated Blobs */}
      <div className="blob blob-gold" />
      <div className="blob blob-amber" />
      <div className="blob blob-dark" />

      {/* Grid Pattern Overlay */}
      <div className="grid-overlay" />

      {/* Login Card */}
      <div className="login-card">
        {/* Glowing border effects */}
        <div className="glowing-border" />
        
        {/* Logo Container (Pure black to blend logo.jpg seamlessly) */}
        <div className="logo-wrapper">
          <div className="logo-background">
            <img src="/logo.jpg" alt="Alrayq Logo" className="logo-image" />
          </div>
          <div className="lightning-divider">
            <span className="lightning-bolt">⚡</span>
          </div>
          <p className="system-subtitle">بوابة الإدارة الذكية (ERP SYSTEM)</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="error-alert">
            <svg className="alert-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="error-text">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label className="input-label">اسم المستخدم أو البريد الإلكتروني</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                className="custom-input"
                type="text"
                required
                disabled={loading}
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="أدخل البريد أو اسم الدخول..."
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">كلمة المرور</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                className="custom-input"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور..."
                style={{ paddingLeft: '2.5rem' }}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" className="custom-checkbox" />
              <span className="checkbox-text">تذكر تسجيل دخولي</span>
            </label>
            <span 
              className="forgot-password" 
              onClick={() => alert('الرجاء التواصل مع الدعم الفني أو المدير المالي لإعادة تعيين كلمة المرور.')}
            >
              نسيت كلمة المرور؟
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="submit-btn"
          >
            {loading ? (
              <div className="login-spinner" />
            ) : (
              <span className="btn-content">
                تسجيل الدخول للنظام 
                <svg className="btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Styled JSX Scoped Block */}
      <style jsx>{`
        .login-page-container {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #030406;
          overflow: hidden;
          padding: 1.5rem;
          direction: rtl;
          font-family: 'Cairo', sans-serif;
        }

        /* Animated Glowing Blobs */
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.18;
          pointer-events: none;
          z-index: 1;
        }
        .blob-gold {
          width: 450px;
          height: 450px;
          background: #c59b27;
          top: -100px;
          right: -100px;
          animation: float-blob-1 12s infinite alternate ease-in-out;
        }
        .blob-amber {
          width: 400px;
          height: 400px;
          background: #e5b83b;
          bottom: -80px;
          left: -80px;
          animation: float-blob-2 15s infinite alternate ease-in-out;
        }
        .blob-dark {
          width: 300px;
          height: 300px;
          background: #a17e1b;
          top: 40%;
          left: 30%;
          filter: blur(120px);
          opacity: 0.12;
          animation: float-blob-1 18s infinite alternate-reverse ease-in-out;
        }

        /* Grid Pattern */
        .grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
          background-size: 30px 30px;
          background-position: center;
          pointer-events: none;
          z-index: 2;
        }

        /* Login Card */
        .login-card {
          position: relative;
          width: 100%;
          max-width: 440px;
          background: rgba(10, 12, 18, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(197, 155, 39, 0.22);
          border-radius: 28px;
          padding: 2.5rem 2.25rem;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(197, 155, 39, 0.08);
          z-index: 10;
          overflow: hidden;
          animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Glowing Border effect on hover */
        .glowing-border {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, transparent, #c59b27, #e5b83b, #c59b27, transparent);
          background-size: 200% 100%;
          animation: flow-light 4s linear infinite;
        }

        /* Logo Blending layout */
        .logo-wrapper {
          text-align: center;
          margin-bottom: 2.25rem;
        }
        .logo-background {
          background-color: #000000;
          border: 1.5px solid rgba(197, 155, 39, 0.35);
          border-radius: 16px;
          padding: 0.65rem 0.85rem;
          display: inline-block;
          width: 100%;
          max-width: 320px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), inset 0 1px 8px rgba(197, 155, 39, 0.15);
        }
        .logo-image {
          width: 100%;
          height: auto;
          max-height: 75px;
          object-fit: contain;
          display: block;
          margin: 0 auto;
        }

        .lightning-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 0.75rem;
          position: relative;
        }
        .lightning-divider::before,
        .lightning-divider::after {
          content: '';
          height: 1px;
          width: 50px;
          background: linear-gradient(90deg, transparent, rgba(197, 155, 39, 0.4));
        }
        .lightning-divider::after {
          background: linear-gradient(270deg, transparent, rgba(197, 155, 39, 0.4));
        }
        .lightning-bolt {
          color: #e5b83b;
          font-size: 1rem;
          margin: 0 0.75rem;
          animation: spark 3s ease-in-out infinite;
          text-shadow: 0 0 8px rgba(229, 184, 59, 0.8);
        }

        .system-subtitle {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-top: 0.5rem;
        }

        /* Error Alert Box */
        .error-alert {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 12px;
          padding: 0.85rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          animation: shake 0.3s ease-in-out;
        }
        .alert-icon {
          width: 20px;
          height: 20px;
          color: #fca5a5;
          flex-shrink: 0;
        }
        .error-text {
          font-size: 0.825rem;
          color: #fca5a5;
          font-weight: 600;
        }

        /* Input styling */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .input-label {
          font-size: 0.825rem;
          font-weight: 700;
          color: #cbd5e1;
          margin-right: 0.25rem;
        }
        .input-wrapper {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          right: 1rem;
          color: #64748b;
          display: flex;
          align-items: center;
          pointer-events: none;
          transition: color 0.25s ease;
        }
        .custom-input {
          width: 100%;
          height: 48px;
          background: rgba(3, 4, 6, 0.65);
          border: 1.5px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          padding: 0 2.75rem 0 1.25rem;
          font-size: 0.9rem;
          color: #f8fafc;
          outline: none;
          transition: all 0.25s ease;
        }
        .custom-input::placeholder {
          color: #475569;
        }
        .custom-input:focus {
          border-color: #c59b27;
          background: rgba(3, 4, 6, 0.95);
          box-shadow: 0 0 15px rgba(197, 155, 39, 0.12);
        }
        .custom-input:focus + .input-icon,
        .input-wrapper:focus-within .input-icon {
          color: #e5b83b;
        }

        .toggle-password {
          position: absolute;
          left: 1rem;
          background: none;
          border: none;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0.25rem;
          transition: color 0.2s ease;
        }
        .toggle-password:hover {
          color: #e5b83b;
        }

        /* Form Options & Checkbox */
        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.25rem;
          font-size: 0.8rem;
        }
        .remember-me {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          user-select: none;
        }
        .custom-checkbox {
          accent-color: #c59b27;
          width: 15px;
          height: 15px;
          cursor: pointer;
        }
        .checkbox-text {
          color: #94a3b8;
          font-weight: 500;
        }
        .forgot-password {
          color: #e5b83b;
          font-weight: 600;
          cursor: pointer;
          transition: text-shadow 0.2s ease;
        }
        .forgot-password:hover {
          text-decoration: underline;
          text-shadow: 0 0 8px rgba(229, 184, 59, 0.4);
        }

        /* Submit Button */
        .submit-btn {
          position: relative;
          margin-top: 0.75rem;
          height: 50px;
          background: linear-gradient(135deg, #a17e1b 0%, #e5b83b 100%);
          border: none;
          border-radius: 12px;
          color: #030406;
          font-weight: 800;
          font-size: 0.95rem;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(197, 155, 39, 0.25);
          overflow: hidden;
          transition: all 0.25s ease;
        }
        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(197, 155, 39, 0.4);
        }
        .submit-btn:active {
          transform: translateY(1px);
        }
        .btn-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
        }
        .btn-arrow {
          transition: transform 0.25s ease;
        }
        .submit-btn:hover .btn-arrow {
          transform: translateX(-4px);
        }

        /* Spinner for loading state */
        .login-spinner {
          width: 22px;
          height: 22px;
          border: 2.5px solid rgba(3, 4, 6, 0.2);
          border-top-color: #030406;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }

        /* Animations Keyframes */
        @keyframes float-blob-1 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 30px) scale(1.05); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes float-blob-2 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.08); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes flow-light {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes spark {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(4px); }
          75% { transform: translateX(-4px); }
        }
      `}</style>
    </div>
  );
}
