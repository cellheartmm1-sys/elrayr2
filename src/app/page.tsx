'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState<'projects' | 'finance' | 'procurement' | 'hr' | 'subcontractors' | 'security'>('projects');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', company: '', phone: '', email: '', message: '' });

  const slides = [
    {
      title: "الرايق للمقاولات الكهروميكانيكية والأنظمة الشاملة",
      subtitle: "الرائد الإقليمي في تنفيذ المشاريع الكبرى، شبكات مكافحة الحريق، والتكييف المركزي وفق أعلى المعايير العالمية",
      badge: "🌐 المؤسسة الأولى في حلول الهندسة المتقدمة ERP",
      image: "/mep_hero_building.jpg",
      primaryCta: "🔐 تسجيل الدخول للنظام",
      primaryHref: "/login",
      secondaryCta: "📊 الاستكشاف والدخول السريع",
      secondaryHref: "/dashboard"
    },
    {
      title: "نظام إدارة الموارد الرقمية الموحد (Enterprise ERP)",
      subtitle: "منظومة متكاملة لربط المشتريات، المستخلصات، كشوف الأجور، والمخازن في مركز قيادة رقمي واحد",
      badge: "⚡ إدارة وتتبع التكاليف بنسبة دقة ٩٩.٩٪",
      image: "/erp_command_center.jpg",
      primaryCta: "📊 الدخول للنظام المالي والمشاريع",
      primaryHref: "/finance",
      secondaryCta: "🧯 استعراض تخصصات المقاولات",
      secondaryHref: "#services"
    },
    {
      title: "أمان سيبراني ونظام موافقات مزدوج مشدود",
      subtitle: "صلاحيات دقيقة للخدمات والمدراء مع طلبات اعتماد لحظية وحفظ تلقائي سحابي في Cloudflare R2",
      badge: "🛡️ حماية متقدمة ونسخ احتياطي تلقائي كل ٨ ساعات",
      image: "/logo.jpg",
      isLogoSlide: true,
      primaryCta: "🔐 تجربة النظام وتسجيل الدخول",
      primaryHref: "/login",
      secondaryCta: "🏢 ملف المؤسسة والاعتمادات",
      secondaryHref: "#about"
    }
  ];

  // Auto Slider Interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.phone) return;
    try {
      await fetch('/api/contact-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      });
      setFormSubmitted(true);
      setTimeout(() => {
        setFormSubmitted(false);
        setContactForm({ name: '', company: '', phone: '', email: '', message: '' });
      }, 5000);
    } catch (err) {
      console.error(err);
    }
  };


  return (
    <div className="landing-container">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --gold-primary: #f59e0b;
          --gold-hover: #d97706;
          --cyan-accent: #06b6d4;
          --blue-deep: #0f172a;
          --navy-dark: #0b0f19;
          --glass-bg: rgba(15, 23, 42, 0.75);
          --glass-border: rgba(255, 255, 255, 0.12);
        }

        .landing-container {
          background-color: var(--navy-dark);
          color: #f8fafc;
          font-family: 'Cairo', 'Inter', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
          direction: rtl;
        }

        /* Ambient Glowing Backgrounds */
        .landing-container::before {
          content: '';
          position: fixed;
          top: -200px;
          right: -200px;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(0,0,0,0) 70%);
          pointer-events: none;
          z-index: 0;
        }

        .landing-container::after {
          content: '';
          position: fixed;
          bottom: -200px;
          left: -200px;
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, rgba(0,0,0,0) 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* Navbar */
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 80px;
          background: rgba(11, 15, 25, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--glass-border);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 4rem;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 1rem;
          text-decoration: none;
        }

        .nav-logo {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
          border: 2px solid rgba(245, 158, 11, 0.4);
          object-fit: contain;
          background: #fff;
        }

        .nav-title-box {
          display: flex;
          flex-direction: column;
        }

        .nav-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #ffffff 0%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .nav-subtitle {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 600;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 2.2rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .nav-link {
          color: #cbd5e1;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          position: relative;
        }

        .nav-link:hover {
          color: #f59e0b;
        }

        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -6px;
          right: 0;
          width: 0;
          height: 2px;
          background: #f59e0b;
          transition: width 0.3s ease;
        }

        .nav-link:hover::after {
          width: 100%;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .btn-nav-login {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #000;
          font-weight: 700;
          padding: 0.7rem 1.6rem;
          border-radius: 10px;
          text-decoration: none;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.35);
          transition: all 0.3s ease;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-nav-login:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(245, 158, 11, 0.5);
          color: #000;
        }

        .btn-nav-dashboard {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          font-weight: 600;
          padding: 0.7rem 1.4rem;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.3s ease;
          font-size: 0.95rem;
        }

        .btn-nav-dashboard:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.4);
        }

        /* Hero Section & Carousel Slider */
        .hero-section {
          position: relative;
          min-height: 100vh;
          padding-top: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .hero-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 1.2s ease-in-out, transform 1.2s ease-in-out;
          transform: scale(1.05);
          display: flex;
          align-items: center;
          padding: 0 4rem;
          z-index: 1;
        }

        .hero-slide.active {
          opacity: 1;
          transform: scale(1);
          z-index: 2;
        }

        .slide-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          filter: brightness(0.35) contrast(1.1);
        }

        .slide-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(11, 15, 25, 0.7) 0%, rgba(11, 15, 25, 0.95) 100%);
        }

        .hero-content {
          position: relative;
          z-index: 10;
          max-width: 850px;
          margin-top: 3rem;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 1.25rem;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.4);
          border-radius: 30px;
          color: #f59e0b;
          font-weight: 700;
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
          backdrop-filter: blur(8px);
          animation: pulseGlow 2.5s infinite alternate;
        }

        @keyframes pulseGlow {
          0% { box-shadow: 0 0 10px rgba(245, 158, 11, 0.2); }
          100% { box-shadow: 0 0 25px rgba(245, 158, 11, 0.6); }
        }

        .hero-title {
          font-size: 3.4rem;
          font-weight: 900;
          line-height: 1.25;
          margin-bottom: 1.25rem;
          color: #ffffff;
          text-shadow: 0 4px 20px rgba(0,0,0,0.8);
        }

        .hero-title-highlight {
          background: linear-gradient(135deg, #f59e0b 0%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 1.3rem;
          color: #cbd5e1;
          line-height: 1.8;
          margin-bottom: 2.5rem;
          font-weight: 500;
          max-width: 750px;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .btn-hero-primary {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #000;
          font-weight: 800;
          font-size: 1.15rem;
          padding: 1rem 2.5rem;
          border-radius: 12px;
          text-decoration: none;
          box-shadow: 0 6px 25px rgba(245, 158, 11, 0.45);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .btn-hero-primary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 10px 35px rgba(245, 158, 11, 0.6);
          color: #000;
        }

        .btn-hero-secondary {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #ffffff;
          font-weight: 700;
          font-size: 1.1rem;
          padding: 1rem 2.2rem;
          border-radius: 12px;
          text-decoration: none;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .btn-hero-secondary:hover {
          background: rgba(255, 255, 255, 0.18);
          border-color: #f59e0b;
          transform: translateY(-2px);
        }

        /* Carousel Navigation Controls */
        .slider-controls {
          position: absolute;
          bottom: 2.5rem;
          left: 4rem;
          z-index: 20;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .slider-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .slider-dot.active {
          width: 40px;
          border-radius: 10px;
          background: #f59e0b;
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.6);
        }

        /* Floating Glass Cards */
        .hero-floating-card {
          position: absolute;
          left: 5rem;
          top: 30%;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(16px);
          padding: 1.5rem;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          z-index: 15;
          max-width: 320px;
          animation: floatAnim 4s ease-in-out infinite alternate;
        }

        @keyframes floatAnim {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-15px); }
        }

        /* Section Styling */
        .section {
          padding: 6rem 4rem;
          position: relative;
          z-index: 10;
        }

        .section-header {
          text-align: center;
          max-width: 800px;
          margin: 0 auto 4rem auto;
        }

        .section-subtitle {
          color: #f59e0b;
          font-weight: 700;
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 0.5rem;
        }

        .section-title {
          font-size: 2.6rem;
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 1rem;
        }

        .section-description {
          font-size: 1.15rem;
          color: #94a3b8;
          line-height: 1.8;
        }

        /* KPI Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
          margin-top: -3rem;
          position: relative;
          z-index: 30;
        }

        .stat-card {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          padding: 2.2rem 1.8rem;
          textAlign: center;
          backdrop-filter: blur(12px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .stat-card:hover {
          transform: translateY(-8px);
          border-color: rgba(245, 158, 11, 0.5);
          box-shadow: 0 20px 40px rgba(245, 158, 11, 0.2);
        }

        .stat-icon {
          font-size: 2.8rem;
          margin-bottom: 1rem;
          display: inline-block;
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 0.4rem;
          background: linear-gradient(135deg, #ffffff 0%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .stat-label {
          font-size: 1.05rem;
          color: #cbd5e1;
          font-weight: 600;
        }

        /* Engineering Services Sectors Grid */
        .services-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2.5rem;
        }

        .service-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
          padding: 2.5rem 2rem;
          transition: all 0.4s ease;
          position: relative;
          overflow: hidden;
        }

        .service-card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          height: 4px;
          background: linear-gradient(90deg, #f59e0b, #06b6d4);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .service-card:hover {
          transform: translateY(-10px);
          background: rgba(30, 41, 59, 0.85);
          border-color: rgba(245, 158, 11, 0.4);
          box-shadow: 0 20px 45px rgba(0,0,0,0.5);
        }

        .service-card:hover::before {
          opacity: 1;
        }

        .service-icon-box {
          width: 70px;
          height: 70px;
          border-radius: 18px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.2rem;
          margin-bottom: 1.5rem;
          transition: all 0.3s ease;
        }

        .service-card:hover .service-icon-box {
          background: #f59e0b;
          color: #000;
          transform: scale(1.1) rotate(5deg);
        }

        .service-title {
          font-size: 1.4rem;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 1rem;
        }

        .service-desc {
          font-size: 1rem;
          color: #94a3b8;
          line-height: 1.7;
          margin-bottom: 1.5rem;
        }

        .service-features {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .service-feature-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.9rem;
          color: #cbd5e1;
        }

        /* ERP Interactive Modules Showcase */
        .modules-tabs {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 3rem;
          flex-wrap: wrap;
        }

        .module-tab-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          color: #cbd5e1;
          padding: 0.9rem 1.8rem;
          border-radius: 14px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .module-tab-btn.active, .module-tab-btn:hover {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #000;
          border-color: #f59e0b;
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.35);
        }

        .module-display-card {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%);
          border: 1px solid var(--glass-border);
          border-radius: 28px;
          padding: 3.5rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          align-items: center;
          box-shadow: 0 25px 60px rgba(0,0,0,0.6);
        }

        .module-info-title {
          font-size: 2.2rem;
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 1.25rem;
        }

        .module-info-desc {
          font-size: 1.1rem;
          color: #cbd5e1;
          line-height: 1.8;
          margin-bottom: 2rem;
        }

        .module-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.2rem;
          margin-bottom: 2.5rem;
        }

        .module-list-item {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0.9rem 1.2rem;
          border-radius: 12px;
          font-size: 0.95rem;
          color: #f8fafc;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-weight: 600;
        }

        .module-preview-box {
          background: #000;
          border-radius: 20px;
          border: 2px solid rgba(245, 158, 11, 0.3);
          padding: 1.5rem;
          box-shadow: 0 15px 40px rgba(0,0,0,0.8);
          position: relative;
        }

        .preview-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
          border-bottom: 1px solid #334155;
          padding-bottom: 0.75rem;
        }

        .dot-red { width: 12px; height: 12px; border-radius: 50%; background: #ef4444; }
        .dot-yellow { width: 12px; height: 12px; border-radius: 50%; background: #f59e0b; }
        .dot-green { width: 12px; height: 12px; border-radius: 50%; background: #10b981; }

        /* Corporate Clients Marquee */
        .marquee-section {
          background: rgba(15, 23, 42, 0.9);
          border-y: 1px solid var(--glass-border);
          padding: 3.5rem 0;
          overflow: hidden;
        }

        .marquee-track {
          display: flex;
          gap: 4rem;
          animation: marqueeScroll 25s linear infinite;
          white-space: nowrap;
        }

        @keyframes marqueeScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }

        .partner-badge {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1rem 2.2rem;
          border-radius: 16px;
          color: #94a3b8;
          font-weight: 700;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }

        /* Contact & Inquiry Section */
        .contact-card {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
          border: 1px solid var(--glass-border);
          border-radius: 32px;
          padding: 4rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
        }

        .form-control-landing {
          width: 100%;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .form-control-landing:focus {
          outline: none;
          border-color: #f59e0b;
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.3);
        }

        /* Footer */
        .footer {
          background: #070a12;
          border-top: 1px solid var(--glass-border);
          padding: 5rem 4rem 2rem 4rem;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr;
          gap: 3.5rem;
          margin-bottom: 4rem;
        }

        .footer-brand {
          font-size: 1.5rem;
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 1rem;
        }

        .footer-text {
          color: #94a3b8;
          line-height: 1.8;
          font-size: 0.95rem;
        }

        .footer-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 1.5rem;
        }

        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .footer-link {
          color: #94a3b8;
          text-decoration: none;
          font-size: 0.95rem;
          transition: color 0.3s ease;
        }

        .footer-link:hover {
          color: #f59e0b;
        }

        .footer-bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #64748b;
          font-size: 0.9rem;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .navbar { padding: 0 2rem; }
          .hero-title { font-size: 2.6rem; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .services-grid { grid-template-columns: 1fr; }
          .module-display-card { grid-template-columns: 1fr; }
          .contact-card { grid-template-columns: 1fr; }
          .footer-grid { grid-template-columns: 1fr 1fr; }
          .hero-floating-card { display: none; }
        }

        @media (max-width: 768px) {
          .nav-links { display: none; }
          .hero-section { padding-top: 100px; }
          .hero-title { font-size: 2.1rem; }
          .stats-grid { grid-template-columns: 1fr; }
          .section { padding: 4rem 1.5rem; }
          .footer-grid { grid-template-columns: 1fr; }
        }
      ` }} />

      {/* Top Navbar Header */}
      <nav className="navbar">
        <Link href="/" className="nav-brand">
          <img src="/logo.jpg" alt="Al-Rayeq Logo" className="nav-logo" />
          <div className="nav-title-box">
            <span className="nav-title">الرايق للمقاولات</span>
            <span className="nav-subtitle">AL-RAYEQ ELECTROMECHANICAL ERP</span>
          </div>
        </Link>

        <ul className="nav-links">
          <li><a href="#hero" className="nav-link">الرئيسية</a></li>
          <li><a href="#about" className="nav-link">عن المؤسسة</a></li>
          <li><a href="#services" className="nav-link">قطاعات الأعمال</a></li>
          <li><a href="#modules" className="nav-link">النظام الرقمي ERP</a></li>
          <li><a href="#contact" className="nav-link">تواصل معنا</a></li>
        </ul>

        <div className="nav-actions">
          <Link href="/login" className="btn-nav-login">
            🔐 تسجيل الدخول للنظام
          </Link>
        </div>

      </nav>

      {/* Hero Carousel Section */}
      <section id="hero" className="hero-section">
        {slides.map((slide, index) => (
          <div key={index} className={`hero-slide ${index === currentSlide ? 'active' : ''}`}>
            <div className="slide-bg" style={{ backgroundImage: `url(${slide.image})` }} />
            <div className="slide-overlay" />
            <div className="hero-content">
              <div className="hero-badge">{slide.badge}</div>
              <h1 className="hero-title">
                {slide.title.split(' ')[0]} <span className="hero-title-highlight">{slide.title.split(' ').slice(1).join(' ')}</span>
              </h1>
              <p className="hero-subtitle">{slide.subtitle}</p>
              <div className="hero-actions">
                <Link href={slide.primaryHref} className="btn-hero-primary">
                  {slide.primaryCta}
                </Link>
                <a href={slide.secondaryHref} className="btn-hero-secondary">
                  {slide.secondaryCta}
                </a>
              </div>
            </div>
          </div>
        ))}

        {/* Floating KPI Glass Badge */}
        <div className="hero-floating-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
            <span style={{ fontSize: '1.8rem' }}>🧯</span>
            <div>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>شبكات مكافحة الحريق</div>
              <div style={{ fontSize: '0.8rem', color: '#10b981' }}>🟢 معتمدة من الدفاع المدني</div>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.6rem' }}>
            تنفيذ وتأهيل أكثر من ١٥٠ محطة مضخات وإطفاء تلقائي للمجمعات الكبرى
          </div>
        </div>

        {/* Slider Indicator Dots */}
        <div className="slider-controls">
          {slides.map((_, idx) => (
            <button
              key={idx}
              className={`slider-dot ${idx === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* KPI Stats Counter Grid */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🏗️</div>
            <div className="stat-number">+٢.٥ مليار</div>
            <div className="stat-label">قيمة المشاريع المنجزة (ريال)</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👷‍♂️</div>
            <div className="stat-number">+٣,٥٠٠</div>
            <div className="stat-label">مهندس وفني وعامل مهاري</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚙️</div>
            <div className="stat-number">+٤٥٠</div>
            <div className="stat-label">عقد تشغيل وصيانة شاملة</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🛡️</div>
            <div className="stat-number">١٠٠٪</div>
            <div className="stat-label">أتمتة وحفظ سحابي بأعلى الأمان</div>
          </div>
        </div>
      </section>

      {/* Enterprise Engineering Sectors & Expertise */}
      <section id="services" className="section" style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
        <div className="section-header">
          <div className="section-subtitle">الخبرات والتخصصات الهندسية</div>
          <h2 className="section-title">قطاعات الأعمال الكهروميكانيكية الكبرى</h2>
          <p className="section-description">
            نقدم حزمة متكاملة من الخدمات والتنفيذ الهندسي لمرافق البنية التحتية، الأبراج، المجمعات التجارية والمنشآت الصناعية
          </p>
        </div>

        <div className="services-grid">
          {/* Card 1: Firefighting */}
          <div className="service-card">
            <div className="service-icon-box">🧯</div>
            <h3 className="service-title">شبكات وأنظمة مكافحة الحريق</h3>
            <p className="service-desc">
              تصميم وتوريد وتركيب شبكات الإطفاء المائي T-Sprinkler، الغازات الخاملة FM200/CO2، ومحضرات المضخات المركزية المعتمة.
            </p>
            <ul className="service-features">
              <li className="service-feature-item">✓ مطابقة كود البناء السعودي NFPA</li>
              <li className="service-feature-item">✓ تركيب غرف مضخات الديزل والكهرباء</li>
              <li className="service-feature-item">✓ استخراج تراخيص الدفاع المدني</li>
            </ul>
          </div>

          {/* Card 2: HVAC */}
          <div className="service-card">
            <div className="service-icon-box">❄️</div>
            <h3 className="service-title">التكييف المركزي والتهوية HVAC</h3>
            <p className="service-desc">
              تنفيذ محطات المبردات المركزية Chilled Water Systems، أنظمة التدفق المتغير VRF، ومجاري الهواء المغلفة ضد الحريق.
            </p>
            <ul className="service-features">
              <li className="service-feature-item">✓ حسابات الأحمال الحرارية المتقدمة HAP</li>
              <li className="service-feature-item">✓ تركيب المبردات الشيلر والمكثفات</li>
              <li className="service-feature-item">✓ موازنة الهواء والماء TAB</li>
            </ul>
          </div>

          {/* Card 3: Electrical */}
          <div className="service-card">
            <div className="service-icon-box">⚡</div>
            <h3 className="service-title">الشبكات والقوى الكهربائية</h3>
            <p className="service-desc">
              مد وتأمين شبكات الجهد المتوسط والمنخفض، لوحات التوزيع الرئيسية MDB، المولدات الاحتياطية، وأنظمة المؤرض والصواعق.
            </p>
            <ul className="service-features">
              <li className="service-feature-item">✓ محولات الطاقة الكهربائية الكبرى</li>
              <li className="service-feature-item">✓ أنظمة عدم انقطاع التيار UPS</li>
              <li className="service-feature-item">✓ الإضاءة الذكية والأنظمة الشمسية</li>
            </ul>
          </div>

          {/* Card 4: Plumbing */}
          <div className="service-card">
            <div className="service-icon-box">🚰</div>
            <h3 className="service-title">شبكات التغذية والصرف والضخ</h3>
            <p className="service-desc">
              تأسيس شبكات الصرف الصحي، المعالجة، خزانات مياه الشرب، ومحطات الضخ والرفع الهيدروليكي للمباني العالية.
            </p>
            <ul className="service-features">
              <li className="service-feature-item">✓ معالجة وتحلية المياه الصناعية</li>
              <li className="service-feature-item">✓ شبكات تصريف مياه الأمطار</li>
              <li className="service-feature-item">✓ مضخات غاطسة وأنظمة الفلترة</li>
            </ul>
          </div>

          {/* Card 5: BMS & Low Current */}
          <div className="service-card">
            <div className="service-icon-box">🏢</div>
            <h3 className="service-title">الأنظمة الذكية والمنخفضة الجهد</h3>
            <p className="service-desc">
              إدارة المباني BMS، كاميرات مراقبة CCTV، التحكم بالدخول Access Control، والإنذار المبكر الذكي ضد الحريق والتسريب.
            </p>
            <ul className="service-features">
              <li className="service-feature-item">✓ التحكم الآلي في استهلاك الطاقة</li>
              <li className="service-feature-item">✓ ربط أجهزة الإنذار بشبكات ERP</li>
              <li className="service-feature-item">✓ شبكات الألياف البصرية المتقدمة</li>
            </ul>
          </div>

          {/* Card 6: Operation & Maintenance */}
          <div className="service-card">
            <div className="service-icon-box">🛠️</div>
            <h3 className="service-title">التشغيل والصيانة الوقائية</h3>
            <p className="service-desc">
              عقود صيانة شاملة للمنشآت الحيوية مع تسيير فرق طوارئ متخصصة على مدار الساعة وإصدار بلاغات الأعطال فوراً.
            </p>
            <ul className="service-features">
              <li className="service-feature-item">✓ استجابة فورية للأعطال خلال ٣٠ دقيقة</li>
              <li className="service-feature-item">✓ قطع غيار أصلية وموثوقة</li>
              <li className="service-feature-item">✓ تقارير فحص دوري معتمدة</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Integrated ERP System Modules Showcase */}
      <section id="modules" className="section">
        <div className="section-header">
          <div className="section-subtitle">القيادة الرقمية الحية</div>
          <h2 className="section-title">نظام الرايق ERP لإدارة المقاولات</h2>
          <p className="section-description">
            صمم نظام الرايق خصيصاً لتلبية متطلبات المقاولات الكهروميكانيكية والتكامل التام بين الحسابات الميدانية والمكتب الرئيسي
          </p>
        </div>

        {/* Module Selection Tabs */}
        <div className="modules-tabs">
          <button className={`module-tab-btn ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
            🏗️ إدارة المشاريع والجدولة
          </button>
          <button className={`module-tab-btn ${activeTab === 'finance' ? 'active' : ''}`} onClick={() => setActiveTab('finance')}>
            💰 المالية والمستخلصات
          </button>
          <button className={`module-tab-btn ${activeTab === 'procurement' ? 'active' : ''}`} onClick={() => setActiveTab('procurement')}>
            📦 المشتريات والمستودعات
          </button>
          <button className={`module-tab-btn ${activeTab === 'hr' ? 'active' : ''}`} onClick={() => setActiveTab('hr')}>
            👥 الموارد البشرية والرواتب
          </button>
          <button className={`module-tab-btn ${activeTab === 'subcontractors' ? 'active' : ''}`} onClick={() => setActiveTab('subcontractors')}>
            🤝 مقاولو الباطن والعمالة
          </button>
          <button className={`module-tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
            🛡️ الأمان والنسخ السحابي
          </button>
        </div>

        {/* Dynamic Display Card */}
        <div className="module-display-card">
          <div>
            <h3 className="module-info-title">
              {activeTab === 'projects' && 'إدارة المشاريع، المراحل وجداول BOQ'}
              {activeTab === 'finance' && 'إدارة مستخلصات العملاء والتدفقات النقدية'}
              {activeTab === 'procurement' && 'طلبات المشتريات والتوريد والمستودعات'}
              {activeTab === 'hr' && 'الموارد البشرية، الأجور وحساب السلف'}
              {activeTab === 'subcontractors' && 'عقود ومستخلصات مقاولي الباطن والعمالة'}
              {activeTab === 'security' && 'منظومة الأمان والنسخ الاحتياطي التلقائي R2'}
            </h3>
            <p className="module-info-desc">
              {activeTab === 'projects' && 'متابعة لحظية لنظاق العمل، مراحل الإنجاز، جدولة التكاليف، وحسابات القيمة المكتسبة للمشاريع الكهروميكانيكية.'}
              {activeTab === 'finance' && 'توليد مستخلصات الملاك المعتمدة، متابعة التحصيلات، مصروفات المواقع، وتقارير التدفق المالي اليومية والشهرية.'}
              {activeTab === 'procurement' && 'أتمتة دورة المشتريات من طلب الموقع وحتى اعتماد التوريد، الفحص، وإدارة المخزون والعهد.'}
              {activeTab === 'hr' && 'تسجيل الحضور اليومي، أوقات الإضافي، حساب مسير الأجور والخصومات، وحفظ وثائق المستندات.'}
              {activeTab === 'subcontractors' && 'إدارة مستخلصات مقاولي الباطن، تسوية دفعتهم، وإعادة احتساب الأجور اليومية للعمالة.'}
              {activeTab === 'security' && 'صلاحيات مستخدمين متعددة مع نظام اعتمادات مزدوج وتخزين تلقائي سحابي في Cloudflare R2 كل ٨ ساعات.'}
            </p>

            <div className="module-list">
              <div className="module-list-item">⚡ تحديث فوري ومباشر البيانات</div>
              <div className="module-list-item">📊 تقارير إحصائية ورسم بياني</div>
              <div className="module-list-item">📄 طباعة وتصدير PDF رسمية</div>
              <div className="module-list-item">🔒 تشفير تام وصلاحيات مشدودة</div>
            </div>

            <Link href="/login" className="btn-hero-primary" style={{ display: 'inline-flex' }}>
              🔐 تجربة هذا الموديول في النظام
            </Link>
          </div>

          <div className="module-preview-box">
            <div className="preview-header">
              <span className="dot-red" />
              <span className="dot-yellow" />
              <span className="dot-green" />
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginRight: '0.5rem' }}>نظام الرايق ERP | شاشة التحكم الحية</span>

            </div>
            <div style={{ color: '#fff', fontSize: '0.9rem', lineHeight: '1.8' }}>
              <div style={{ color: '#f59e0b', fontWeight: 700, marginBottom: '0.5rem' }}>📊 حالة المنظومة الحية:</div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                🟢 <strong>المشاريع القائمة:</strong> ١٢ موقع كهروميكانيكي نشط
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                💰 <strong>المستخلصات المعتمدة:</strong> +٤,٨٥٠,٠٠٠ ريال محصلة
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                ☁️ <strong>النسخ الاحتياطي السحابي:</strong> مفعل ومرتبط بـ Cloudflare R2
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee Partner Section */}
      <section className="marquee-section">
        <div className="marquee-track">
          <div className="partner-badge">🏢 الهيئة الملكية لتطوير المجمعات</div>
          <div className="partner-badge">🧯 وزارة الدفاع والجهات الأمنية</div>
          <div className="partner-badge">❄️ شركة إعمار والمشاريع الكبرى</div>
          <div className="partner-badge">⚡ الشركة السعودية للكهرباء</div>
          <div className="partner-badge">🚰 هيئة المياه والصرف الصحي</div>
          <div className="partner-badge">🏢 المجموعة الوطنية للمقاولات</div>
          {/* Duplicate for infinite seamless marquee loop */}
          <div className="partner-badge">🏢 الهيئة الملكية لتطوير المجمعات</div>
          <div className="partner-badge">🧯 وزارة الدفاع والجهات الأمنية</div>
          <div className="partner-badge">❄️ شركة إعمار والمشاريع الكبرى</div>
          <div className="partner-badge">⚡ الشركة السعودية للكهرباء</div>
        </div>
      </section>

      {/* Corporate Inquiry & Contact Section */}
      <section id="contact" className="section">
        <div className="contact-card">
          <div>
            <div className="section-subtitle">تواصل وشراكة استراتيجية</div>
            <h2 className="section-title" style={{ textAlign: 'right' }}>هل لديك مشروع عملاق وترغب في التعاون؟</h2>
            <p className="section-description" style={{ textAlign: 'right' }}>
              يسعدنا استقبال استفساراتكم والمنافسة على المناقصات الكبرى للمشاريع الكهروميكانيكية، شبكات الإطفاء، والتكييف المركزي في المملكة ومصر.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.5rem', color: '#f59e0b' }}>📍</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>المقر الرئيسي:</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>القاهرة، مصر / الرياض، المملكة العربية السعودية</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.5rem', color: '#f59e0b' }}>📞</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>الهاتف والتواصل:</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>+20-100-000-0000 | +966-50-000-0000</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.5rem', color: '#f59e0b' }}>✉️</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>البريد الإلكتروني التجاري:</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>info@alrayeq.com | tenders@alrayeq.com</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            {formSubmitted ? (
              <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', padding: '2rem', borderRadius: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <h3 style={{ color: '#10b981', fontSize: '1.4rem', fontWeight: 800 }}>تم تقديم طلبك بنجاح!</h3>
                <p style={{ color: '#cbd5e1', marginTop: '0.5rem' }}>سيقوم فريق الهندسة والمبيعات في مؤسسة الرايق بالتواصل معكم خلال ٢٤ ساعة.</p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>الاسم الكامل / ممثل الجهة *</label>
                  <input
                    className="form-control-landing"
                    required
                    value={contactForm.name}
                    onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="م. أحمد محمود"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>اسم الشركة / المالك</label>
                  <input
                    className="form-control-landing"
                    value={contactForm.company}
                    onChange={e => setContactForm({ ...contactForm, company: e.target.value })}
                    placeholder="شركة التطوير العقاري الكبرى"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>رقم الجوال *</label>
                    <input
                      className="form-control-landing"
                      required
                      value={contactForm.phone}
                      onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                      placeholder="050xxxxxxx"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>البريد الإلكتروني</label>
                    <input
                      className="form-control-landing"
                      type="email"
                      value={contactForm.email}
                      onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="name@company.com"
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>تفاصيل المشروع أو الاستفسار</label>
                  <textarea
                    className="form-control-landing"
                    rows={4}
                    value={contactForm.message}
                    onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="توضيح حجم المشروع، النطاق الكهروميكانيكي، والمتطلبات..."
                  />
                </div>
                <button type="submit" className="btn-hero-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                  📨 إرسال الطلب والاستشارة الآن
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">مؤسسة الرايق للمقاولات</div>
            <p className="footer-text">
              الرائد الإقليمي في تنفيذ الأنظمة الكهروميكانيكية، شبكات مكافحة الحريق، والتكييف المركزي مع إدارة رقمية متكاملة للمشاريع والموارد.
            </p>
            <div style={{ marginTop: '1rem', color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem' }}>
              سجل تجاري: ١٠١٠١٢٣٤٥٦ | الرقم الضريبي: ٣٠٠٠١٢٣٤٥٦٠٠٠٠٣
            </div>
          </div>

          <div>
            <div className="footer-title">روابط سريعة</div>
            <ul className="footer-links">
              <li><a href="#hero" className="footer-link">الرئيسية</a></li>
              <li><a href="#services" className="footer-link">قطاعات الأعمال</a></li>
              <li><a href="#modules" className="footer-link">نظام الرايق ERP</a></li>
              <li><a href="#contact" className="footer-link">تواصل معنا</a></li>
            </ul>
          </div>

          <div>
            <div className="footer-title">الدخول الرقمي</div>
            <ul className="footer-links">
              <li><Link href="/login" className="footer-link">🔐 تسجيل دخول النظام</Link></li>
              <li><Link href="/dashboard" className="footer-link">📊 لوحة قيادة المشاريع</Link></li>
              <li><Link href="/finance" className="footer-link">💰 التقارير المالية</Link></li>
              <li><Link href="/projects" className="footer-link">🏗️ متابعة المواقع</Link></li>
            </ul>
          </div>

          <div>
            <div className="footer-title">الأمان والاعتمادات</div>
            <p className="footer-text" style={{ fontSize: '0.85rem' }}>
              نظام الرايق ERP محمي بأعلى معايير الأمن السيبراني مع دعم التخزين التلقائي السحابي لبيانات المؤسسة عبر Cloudflare R2.
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <div>جميع الحقوق محفوظة © {new Date().getFullYear()} مؤسسة الرايق للمقاولات الكهروميكانيكية.</div>
          <div>نظام الرايق Enterprise ERP v2.5</div>
        </div>
      </footer>
    </div>
  );
}
