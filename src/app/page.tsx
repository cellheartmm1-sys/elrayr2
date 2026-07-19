'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const DEFAULT_LANDING_CONTENT = {
  slides: [
    {
      title: "الرايق للمقاولات الكهروميكانيكية والأنظمة الشاملة",
      subtitle: "الرائد الإقليمي في تنفيذ المشاريع الكبرى، شبكات مكافحة الحريق، والتكييف المركزي وفق أعلى المعايير العالمية",
      badge: "🌐 ريادة هندسية وتميز في التنفيذ",
      image: "/mep_hero_building.jpg",
      primaryCta: "📞 تواصل معنا",
      primaryHref: "#contact",
      secondaryCta: "📐 استعراض قطاعات الأعمال",
      secondaryHref: "#services"
    },
    {
      title: "أنظمة التكييف المركزي ومكافحة الحريق المتطورة",
      subtitle: "تصميم وتوريد وتركيب غرف مضخات الحريق، أنظمة الإنذار المبكر، ومحطات الشيلر والمبردات المركزية للمشاريع العملاقة",
      badge: "🧯 معتمدون من الدفاع المدني والجهات الرسمية",
      image: "/erp_command_center.jpg",
      primaryCta: "📐 اطلب استشارة هندسية",
      primaryHref: "#contact",
      secondaryCta: "🏗️ تخصصاتنا الكهروميكانيكية",
      secondaryHref: "#services"
    },
    {
      title: "الالتزام بالدقة والجودة والسلامة المهنية",
      subtitle: "نعمل وفق معايير الجودة العالمية وأكواد البناء المحلية لنضمن الكفاءة التشغيلية والسلامة المطلقة للمباني والمنشآت",
      badge: "⚡ جودة وأمان وامتثال لأكواد البناء",
      image: "/logo.jpg",
      isLogoSlide: true,
      primaryCta: "📞 اتصل بنا اليوم",
      primaryHref: "#contact",
      secondaryCta: "🏢 عن مؤسسة الرايق",
      secondaryHref: "#about"
    }
  ],
  about: {
    subtitle: "من نحن",
    title: "مؤسسة الرايق للمقاولات الكهروميكانيكية",
    desc1: "تأسست مؤسسة الرايق لتكون شريكاً استراتيجياً في نهضة البناء والتشييد، متخصصة في تقديم الحلول الهندسية المتكاملة للأنظمة الكهروميكانيكية (MEP). نحن فخورون بتنفيذ أضخم المشاريع من شبكات إطفاء الحريق المعتمدة، وأنظمة التكييف المركزي، وتغذية المياه، والقوى الكهربائية.",
    desc2: "تضم المؤسسة نخبة من أكفأ المهندسين والكوادر الفنية المتخصصة، ونعتمد على أحدث التقنيات الهندسية ومطابقة الأكواد العالمية والمحلية مثل كود البناء السعودي والمصري والـ NFPA، لنضمن لعملائنا أعلى درجات الأمان والجودة والكفاءة التشغيلية.",
    vision_title: "رؤيتنا",
    vision_text: "أن نكون الوجهة الأولى والموثوقة هندسياً لتنفيذ وتأهيل البنية التحتية الكهروميكانيكية إقليمياً.",
    values_title: "قيمنا",
    values_text: "الالتزام التام بالجودة، الأمان المطلق، الابتكار المستمر، والشفافية الكاملة مع شركاء النجاح."
  },
  advantages: [
    {
      icon: "🏆",
      title: "خبرة هندسية واسعة",
      desc: "قمنا بتنفيذ وتصميم أنظمة كهروميكانيكية معقدة للمطارات، الأبراج، المجمعات السكنية، والمصانع على مدى أكثر من 15 عاماً من التميز."
    },
    {
      icon: "📜",
      title: "اعتماد رسمي وتراخيص معتمدة",
      desc: "مؤسستنا مصنفة ومعتمدة رسمياً لدى الهيئات الحكومية والدفاع المدني، مما يضمن سرعة استصدار تراخيص التشغيل والسلامة لمشروعك."
    },
    {
      icon: "⏱️",
      title: "الالتزام التام بالجدول الزمني",
      desc: "نعمل بمنهجيات التخطيط الحديثة لإدارة الجدول الزمني للمشاريع ومراقبة الإنجاز اليومي لضمان تسليم الأعمال في موعدها المحدد دون تأخير."
    },
    {
      icon: "👷‍♂️",
      title: "طاقم عمل وهندسي نخبة",
      desc: "نمتلك فريقاً من المهندسين الاستشاريين والمشرفين والعمالة الماهرة المدربة على التعامل مع الحالات الصعبة والمواصفات الدقيقة بكفاءة عالية."
    },
    {
      icon: "🛡️",
      title: "معايير جودة وأمان صارمة",
      desc: "نطبق أعلى معايير الصحة والسلامة المهنية (OSHA) ونستخدم خامات معتمدة ومطابقة لمواصفات الجودة لضمان أطول عمر افتراضي للأنظمة."
    },
    {
      icon: "📞",
      title: "دعم فني وصيانة ٢٤/٧",
      desc: "نقدم صيانة وقائية دورية مع خط ساخن للطوارئ يعمل على مدار الساعة لحل أي أعطال طارئة وضمان عدم توقف عملياتك الحيوية."
    }
  ],
  sectors: [
    {
      icon: "🧯",
      title: "شبكات وأنظمة مكافحة الحريق",
      desc: "تصميم وتوريد وتركيب شبكات الإطفاء المائي T-Sprinkler، الغازات الخاملة FM200/CO2، ومحضرات المضخات المركزية المعتمة.",
      features: ["مطابقة كود البناء السعودي NFPA", "تركيب غرف مضخات الديزل والكهرباء", "استخراج تراخيص الدفاع المدني"]
    },
    {
      icon: "❄️",
      title: "التكييف المركزي والتهوية HVAC",
      desc: "تنفيذ محطات المبردات المركزية Chilled Water Systems، أنظمة التدفق المتغير VRF، ومجاري الهواء المغلفة ضد الحريق.",
      features: ["حسابات الأحمال الحرارية المتقدمة HAP", "تركيب المبردات الشيلر والمكثفات", "موازنة الهواء والماء TAB"]
    },
    {
      icon: "⚡",
      title: "الشبكات والقوى الكهربائية",
      desc: "مد وتأمين شبكات الجهد المتوسط والمنخفض، لوحات التوزيع الرئيسية MDB، المولدات الاحتياطية، وأنظمة المؤرض والصواعق.",
      features: ["محولات الطاقة الكهربائية الكبرى", "أنظمة عدم انقطاع التيار UPS", "الإضاءة الذكية والأنظمة الشمسية"]
    },
    {
      icon: "🚰",
      title: "شبكات التغذية والصرف والضخ",
      desc: "تأسيس شبكات الصرف الصحي، المعالجة، خزانات مياه الشرب، ومحطات الضخ والرفع الهيدروليكي للمباني العالية.",
      features: ["خزانات ومحطات ضخ مياه الشرب", "معالجة المياه الرمادية والصرف", "شبكات تصريف مياه الأمطار والسيول"]
    }
  ],
  stats: [
    { icon: "🏗️", number: "+٢.٥ مليار", label: "قيمة المشاريع المنجزة (ريال)" },
    { icon: "👷‍♂️", number: "+٣,٥٠٠", label: "مهندس وفني وعامل مهاري" },
    { icon: "⚙️", number: "+٤٥٠", label: "عقد تشغيل وصيانة شاملة" },
    { icon: "🛡️", number: "١٠٠٪", label: "الالتزام بأكواد السلامة والدفاع المدني" }
  ],
  footer: {
    copyright: "جميع الحقوق محفوظة © ٢٠٢٦ مؤسسة الرايق للمقاولات الكهروميكانيكية",
    about_text: "مؤسسة الرايق للمقاولات الكهروميكانيكية والأنظمة الشاملة، الرائد الهندسي المعتمد لحلول شبكات مكافحة الحريق، أنظمة التكييف المركزي HVAC، والصرف والشبكات الكهربائية."
  },
  contact: {
    title: "هل لديك مشروع عملاق وترغب في التعاون؟",
    desc: "يسعدنا استقبال استفساراتكم والمنافسة على المناقصات الكبرى للمشاريع الكهروميكانيكية، شبكات الإطفاء، والتكييف المركزي في المملكة ومصر.",
    address: "القاهرة، مصر / الرياض، المملكة العربية السعودية",
    phone: "+20-100-000-0000 | +966-50-000-0000",
    email: "info@alrayeq.com | tenders@alrayeq.com"
  }
};

export default function LandingPage() {
  const [landingContent, setLandingContent] = useState<any>(null);
  const [editContent, setEditContent] = useState<any>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [activeEditorTab, setActiveEditorTab] = useState('slides');
  const [savingEditor, setSavingEditor] = useState(false);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', company: '', phone: '', email: '', message: '' });

  const openEditor = () => {
    const rawContent = JSON.parse(JSON.stringify(landingContent || DEFAULT_LANDING_CONTENT));
    if (!rawContent.contact) {
      rawContent.contact = { ...(DEFAULT_LANDING_CONTENT.contact || {}) };
    }
    setEditContent(rawContent);
    setIsEditorOpen(true);
  };

  const updateSlide = (idx: number, key: string, val: string) => {
    if (!editContent) return;
    const updated = { ...editContent };
    updated.slides[idx][key] = val;
    setEditContent(updated);
  };

  const fetchLandingContent = async () => {
    try {
      const res = await fetch('/api/landing-page');
      const data = await res.json();
      if (data && !data.error) {
        setLandingContent(data);
      }
    } catch (err) {
      console.error('Failed to load landing content:', err);
    }
  };

  useEffect(() => {
    fetchLandingContent();
  }, []);

  const content = landingContent || DEFAULT_LANDING_CONTENT;
  const slides = content.slides || DEFAULT_LANDING_CONTENT.slides;

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

        .landing-admin-fab {
          position: fixed;
          bottom: 2rem;
          left: 2rem;
          z-index: 999;
          background: rgba(245, 158, 11, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          font-weight: 700;
          font-size: 0.9rem;
          padding: 0.75rem 1.25rem;
          border-radius: 50px;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .landing-admin-fab:hover {
          background: #d97706;
          transform: translateY(-3px);
          box-shadow: 0 15px 30px rgba(0,0,0,0.7);
        }

        .landing-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(11, 15, 25, 0.85);
          backdrop-filter: blur(15px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          animation: fadeIn 0.3s ease;
        }
        .landing-modal-content {
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 2.5rem;
          width: 100%;
          max-width: 450px;
          box-shadow: 0 25px 50px rgba(0,0,0,0.8);
          position: relative;
          direction: rtl;
        }
        .landing-editor-modal {
          max-width: 1000px;
          height: 85vh;
          display: flex;
          flex-direction: column;
          padding: 2rem;
          overflow: hidden;
        }
        .editor-tabs {
          display: flex;
          gap: 0.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 0.75rem;
          margin-bottom: 1.5rem;
          overflow-x: auto;
        }
        .editor-tab-btn {
          background: none;
          border: none;
          color: #94a3b8;
          font-weight: 600;
          padding: 0.5rem 1rem;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .editor-tab-btn.active {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }
        .editor-form-content {
          flex: 1;
          overflow-y: auto;
          padding-left: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .editor-section-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .editor-section-title {
          font-size: 1.1rem;
          color: #f59e0b;
          margin-bottom: 1.25rem;
          font-weight: 700;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 0.5rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          color: #94a3b8;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 0.4rem;
        }
        .editor-input, .editor-textarea {
          width: 100%;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: #fff;
          padding: 0.65rem 0.9rem;
          font-family: inherit;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }
        .editor-input:focus, .editor-textarea:focus {
          border-color: #f59e0b;
          outline: none;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
        }
        .editor-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 1rem;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      ` }} />

      {/* Top Navbar Header */}
      <nav className="navbar">
        <Link href="/" className="nav-brand">
          <img src="/logo.jpg" alt="Al-Rayeq Logo" className="nav-logo" />
          <div className="nav-title-box">
            <span className="nav-title">الرايق للمقاولات</span>
            <span className="nav-subtitle">المقاولات الكهروميكانيكية الحديثة</span>
          </div>
        </Link>

        <ul className="nav-links">
          <li><a href="#hero" className="nav-link">الرئيسية</a></li>
          <li><a href="#about" className="nav-link">عن المؤسسة</a></li>
          <li><a href="#services" className="nav-link">قطاعات الأعمال</a></li>
          <li><a href="#features" className="nav-link">مميزاتنا</a></li>
          <li><a href="#contact" className="nav-link">تواصل معنا</a></li>
        </ul>

        <div className="nav-actions">
          <Link href="/login" className="btn-nav-login">
            💼 بوابة الموظفين
          </Link>
        </div>

      </nav>

      {/* Hero Carousel Section */}
      <section id="hero" className="hero-section">
        {slides.map((slide: any, index: number) => (
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
          {slides.map((_: any, idx: number) => (
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
          {(content.stats || DEFAULT_LANDING_CONTENT.stats).map((stat: any, idx: number) => (
            <div key={idx} className="stat-card">
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-number">{stat.number}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* About the Company Section */}
      <section id="about" className="section" style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div>
            <div className="section-subtitle">{content.about?.subtitle || 'من نحن'}</div>
            <h2 className="section-title" style={{ textAlign: 'right', marginBottom: '1.5rem' }}>{content.about?.title || 'مؤسسة الرايق للمقاولات الكهروميكانيكية'}</h2>
            <p style={{ color: '#cbd5e1', lineHeight: '1.8', marginBottom: '1.2rem', fontSize: '1.05rem' }}>
              {content.about?.desc1}
            </p>
            <p style={{ color: '#cbd5e1', lineHeight: '1.8', marginBottom: '1.5rem', fontSize: '1.05rem' }}>
              {content.about?.desc2}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '1rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>🎯</span>
                <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{content.about?.vision_title || 'رؤيتنا'}</strong>
                <p style={{ color: '#cbd5e1', fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: '1.6' }}>{content.about?.vision_text}</p>
              </div>
              <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.2)', padding: '1rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>💎</span>
                <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{content.about?.values_title || 'قيمنا'}</strong>
                <p style={{ color: '#cbd5e1', fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: '1.6' }}>{content.about?.values_text}</p>
              </div>
            </div>
          </div>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: '100%',
              maxWidth: '450px',
              height: '380px',
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(0,0,0,0) 80%)',
              position: 'absolute',
              top: '-30px',
              zIndex: 1
            }} />
            <img src="/mep_hero_building.jpg" alt="MEP Projects" style={{
              width: '100%',
              maxHeight: '400px',
              objectFit: 'cover',
              borderRadius: '24px',
              border: '2px solid rgba(245, 158, 11, 0.25)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              zIndex: 2
            }} />
          </div>
        </div>
      </section>

      {/* Enterprise Engineering Sectors & Expertise */}
      <section id="services" className="section" style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
        <div className="section-header">
          <div className="section-subtitle">{content.services_subtitle || 'الخبرات والتخصصات الهندسية'}</div>
          <h2 className="section-title">{content.services_title || 'قطاعات الأعمال الكهروميكانيكية الكبرى'}</h2>
          <p className="section-description">
            {content.services_desc || 'نقدم حزمة متكاملة من الخدمات والتنفيذ الهندسي لمرافق البنية التحتية، الأبراج، المجمعات التجارية والمنشآت الصناعية'}
          </p>
        </div>

        <div className="services-grid">
          {(content.sectors || DEFAULT_LANDING_CONTENT.sectors).map((sector: any, idx: number) => (
            <div key={idx} className="service-card">
              <div className="service-icon-box">{sector.icon}</div>
              <h3 className="service-title">{sector.title}</h3>
              <p className="service-desc">{sector.desc}</p>
              <ul className="service-features">
                {(sector.features || []).map((feat: string, fIdx: number) => (
                  <li key={fIdx} className="service-feature-item">✓ {feat}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Company Features & Advantages Section */}
      <section id="features" className="section">
        <div className="section-header">
          <div className="section-subtitle">{content.advantages_subtitle || 'لماذا مؤسسة الرايق؟'}</div>
          <h2 className="section-title">{content.advantages_title || 'مميزات تجعلنا شريكك الهندسي الأول'}</h2>
          <p className="section-description">
            {content.advantages_desc || 'نجمع بين الخبرة الطويلة، والكوادر الهندسية المحترفة، والالتزام الصارم بأعلى معايير السلامة والجودة لنحقق رؤيتك واقعاً ملموساً.'}
          </p>
        </div>

        <div className="services-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
          {(content.advantages || DEFAULT_LANDING_CONTENT.advantages).map((adv: any, idx: number) => (
            <div key={idx} className="service-card" style={{ padding: '2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{adv.icon}</div>
              <h3 className="service-title" style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>{adv.title}</h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.8' }}>{adv.desc}</p>
            </div>
          ))}
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
            <h2 className="section-title" style={{ textAlign: 'right' }}>
              {content.contact?.title || DEFAULT_LANDING_CONTENT.contact.title}
            </h2>
            <p className="section-description" style={{ textAlign: 'right' }}>
              {content.contact?.desc || DEFAULT_LANDING_CONTENT.contact.desc}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.5rem', color: '#f59e0b' }}>📍</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>المقر الرئيسي:</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
                    {content.contact?.address || DEFAULT_LANDING_CONTENT.contact.address}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.5rem', color: '#f59e0b' }}>📞</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>الهاتف والتواصل:</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
                    {content.contact?.phone || DEFAULT_LANDING_CONTENT.contact.phone}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.5rem', color: '#f59e0b' }}>✉️</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>البريد الإلكتروني التجاري:</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
                    {content.contact?.email || DEFAULT_LANDING_CONTENT.contact.email}
                  </div>
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
              {content.footer?.about_text || 'الرائد الإقليمي في تنفيذ الأنظمة الكهروميكانيكية، شبكات مكافحة الحريق، والتكييف المركزي مع الالتزام بأعلى معايير الأمان والسلامة الهندسية.'}
            </p>
            <div style={{ marginTop: '1rem', color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem' }}>
              سجل تجاري: ١٠١٠١٢٣٤٥٦ | الرقم الضريبي: ٣٠٠٠١٢٣٤٥٦٠٠٠٠٣
            </div>
          </div>

          <div>
            <div className="footer-title">روابط سريعة</div>
            <ul className="footer-links">
              <li><a href="#hero" className="footer-link">الرئيسية</a></li>
              <li><a href="#about" className="footer-link">عن المؤسسة</a></li>
              <li><a href="#services" className="footer-link">قطاعات الأعمال</a></li>
              <li><a href="#features" className="footer-link">مميزاتنا</a></li>
              <li><a href="#contact" className="footer-link">تواصل معنا</a></li>
            </ul>
          </div>

          <div>
            <div className="footer-title">بوابة الموظفين</div>
            <ul className="footer-links">
              <li><Link href="/login" className="footer-link">🔐 تسجيل دخول النظام</Link></li>
              <li><Link href="/dashboard" className="footer-link">📊 لوحة قيادة المشاريع</Link></li>
              <li><Link href="/finance" className="footer-link">💰 التقارير المالية</Link></li>
              <li><Link href="/projects" className="footer-link">🏗️ متابعة المواقع</Link></li>
            </ul>
          </div>

          <div>
            <div className="footer-title">معايير الامتثال والجودة</div>
            <p className="footer-text" style={{ fontSize: '0.85rem' }}>
              جميع أعمالنا تنفذ طبقاً لمواصفات وتراخيص الدفاع المدني السعودي والمصري، مع الالتزام الصارم بـ معايير السلامة والأكواد العالمية والـ NFPA.
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <div>{content.footer?.copyright || `جميع الحقوق محفوظة © ${new Date().getFullYear()} مؤسسة الرايق للمقاولات الكهروميكانيكية.`}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span>موقع مؤسسة الرايق الرسمي</span>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#f59e0b',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.5)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
              }}
            >
              ⚙️ لوحة تحكم الواجهة
            </button>
          </div>
        </div>
      </footer>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="landing-modal-overlay">
          <div className="landing-modal-content">
            <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '1rem', fontWeight: 700, textAlign: 'center' }}>
              🔐 دخول لوحة تحكم الصفحة الرئيسية
            </h3>
            <div className="form-group">
              <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '0.5rem' }}>كلمة المرور</label>
              <input
                type="password"
                className="editor-input"
                value={passwordInput}
                onChange={e => {
                  setPasswordInput(e.target.value);
                  setPasswordError('');
                }}
                placeholder="أدخل كلمة المرور..."
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (passwordInput === 'elraye2123') {
                      setIsPasswordModalOpen(false);
                      setPasswordInput('');
                      openEditor();
                    } else {
                      setPasswordError('كلمة المرور غير صحيحة!');
                    }
                  }
                }}
              />
              {passwordError && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  {passwordError}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                className="btn-hero-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  if (passwordInput === 'elraye2123') {
                    setIsPasswordModalOpen(false);
                    setPasswordInput('');
                    openEditor();
                  } else {
                    setPasswordError('كلمة المرور غير صحيحة!');
                  }
                }}
              >
                دخول
              </button>
              <button
                className="btn-hero-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordInput('');
                  setPasswordError('');
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && editContent && (
        <div className="landing-modal-overlay">
          <div className="landing-modal-content landing-editor-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 800 }}>
                ⚙️ لوحة تعديل الصفحة الرئيسية
              </h2>
              <button
                style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: '1.5rem', cursor: 'pointer' }}
                onClick={() => setIsEditorOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="editor-tabs">
              <button
                className={`editor-tab-btn ${activeEditorTab === 'slides' ? 'active' : ''}`}
                onClick={() => setActiveEditorTab('slides')}
              >
                السلايدر الرئيسي 🌌
              </button>
              <button
                className={`editor-tab-btn ${activeEditorTab === 'about' ? 'active' : ''}`}
                onClick={() => setActiveEditorTab('about')}
              >
                عن الشركة 🏢
              </button>
              <button
                className={`editor-tab-btn ${activeEditorTab === 'sectors' ? 'active' : ''}`}
                onClick={() => setActiveEditorTab('sectors')}
              >
                قطاعات الأعمال 🏗️
              </button>
              <button
                className={`editor-tab-btn ${activeEditorTab === 'advantages' ? 'active' : ''}`}
                onClick={() => setActiveEditorTab('advantages')}
              >
                مميزاتنا التنافسية 🏆
              </button>
              <button
                className={`editor-tab-btn ${activeEditorTab === 'stats' ? 'active' : ''}`}
                onClick={() => setActiveEditorTab('stats')}
              >
                أرقام وإحصائيات 📊
              </button>
              <button
                className={`editor-tab-btn ${activeEditorTab === 'footer' ? 'active' : ''}`}
                onClick={() => setActiveEditorTab('footer')}
              >
                التواصل والفوتر 📞
              </button>
            </div>

            {/* Form Content */}
            <div className="editor-form-content">
              {activeEditorTab === 'slides' && (
                <div>
                  {(editContent.slides || []).map((slide: any, idx: number) => (
                    <div key={idx} className="editor-section-card">
                      <div className="editor-section-title">الشريحة رقم {idx + 1}</div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>الشارة العلوية (Badge)</label>
                          <input
                            type="text"
                            className="editor-input"
                            value={slide.badge || ''}
                            onChange={e => updateSlide(idx, 'badge', e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>العنوان الرئيسي (Title)</label>
                          <input
                            type="text"
                            className="editor-input"
                            value={slide.title || ''}
                            onChange={e => updateSlide(idx, 'title', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>العنوان الفرعي (Subtitle)</label>
                        <textarea
                          rows={2}
                          className="editor-input"
                          value={slide.subtitle || ''}
                          onChange={e => updateSlide(idx, 'subtitle', e.target.value)}
                        />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>رابط الصورة الخلفية</label>
                          <input
                            type="text"
                            className="editor-input"
                            value={slide.image || ''}
                            onChange={e => updateSlide(idx, 'image', e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>نص الزر الأول</label>
                          <input
                            type="text"
                            className="editor-input"
                            value={slide.primaryCta || ''}
                            onChange={e => updateSlide(idx, 'primaryCta', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeEditorTab === 'about' && (
                <div className="editor-section-card">
                  <div className="editor-section-title">قسم من نحن والتعريف بالمؤسسة</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>العنوان الجانبي</label>
                      <input
                        type="text"
                        className="editor-input"
                        value={editContent.about?.subtitle || ''}
                        onChange={e => setEditContent({
                          ...editContent,
                          about: { ...editContent.about, subtitle: e.target.value }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label>العنوان الرئيسي</label>
                      <input
                        type="text"
                        className="editor-input"
                        value={editContent.about?.title || ''}
                        onChange={e => setEditContent({
                          ...editContent,
                          about: { ...editContent.about, title: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>الوصف الفقرة الأولى</label>
                    <textarea
                      rows={3}
                      className="editor-input"
                      value={editContent.about?.desc1 || ''}
                      onChange={e => setEditContent({
                        ...editContent,
                        about: { ...editContent.about, desc1: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>الوصف الفقرة الثانية</label>
                    <textarea
                      rows={3}
                      className="editor-input"
                      value={editContent.about?.desc2 || ''}
                      onChange={e => setEditContent({
                        ...editContent,
                        about: { ...editContent.about, desc2: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>عنوان الرؤية</label>
                      <input
                        type="text"
                        className="editor-input"
                        value={editContent.about?.vision_title || ''}
                        onChange={e => setEditContent({
                          ...editContent,
                          about: { ...editContent.about, vision_title: e.target.value }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label>محتوى الرؤية</label>
                      <input
                        type="text"
                        className="editor-input"
                        value={editContent.about?.vision_text || ''}
                        onChange={e => setEditContent({
                          ...editContent,
                          about: { ...editContent.about, vision_text: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>عنوان القيم</label>
                      <input
                        type="text"
                        className="editor-input"
                        value={editContent.about?.values_title || ''}
                        onChange={e => setEditContent({
                          ...editContent,
                          about: { ...editContent.about, values_title: e.target.value }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label>محتوى القيم</label>
                      <input
                        type="text"
                        className="editor-input"
                        value={editContent.about?.values_text || ''}
                        onChange={e => setEditContent({
                          ...editContent,
                          about: { ...editContent.about, values_text: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeEditorTab === 'sectors' && (
                <div>
                  <div className="editor-section-card">
                    <div className="editor-section-title">العناوين العامة للقطاعات</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>العنوان الفرعي للقطاعات</label>
                        <input
                          type="text"
                          className="editor-input"
                          value={editContent.services_subtitle || ''}
                          onChange={e => setEditContent({ ...editContent, services_subtitle: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>العنوان الرئيسي للقطاعات</label>
                        <input
                          type="text"
                          className="editor-input"
                          value={editContent.services_title || ''}
                          onChange={e => setEditContent({ ...editContent, services_title: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>الوصف العام للقطاعات</label>
                      <input
                        type="text"
                        className="editor-input"
                        value={editContent.services_desc || ''}
                        onChange={e => setEditContent({ ...editContent, services_desc: e.target.value })}
                      />
                    </div>
                  </div>

                  {(editContent.sectors || []).map((sector: any, idx: number) => (
                    <div key={idx} className="editor-section-card">
                      <div className="editor-section-title">القطاع الكهروميكانيكي رقم {idx + 1}</div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>الأيقونة (Emoji)</label>
                          <input
                            type="text"
                            className="editor-input"
                            value={sector.icon || ''}
                            onChange={e => {
                              const updated = { ...editContent };
                              updated.sectors[idx].icon = e.target.value;
                              setEditContent(updated);
                            }}
                          />
                        </div>
                        <div className="form-group">
                          <label>اسم القطاع</label>
                          <input
                            type="text"
                            className="editor-input"
                            value={sector.title || ''}
                            onChange={e => {
                              const updated = { ...editContent };
                              updated.sectors[idx].title = e.target.value;
                              setEditContent(updated);
                            }}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>وصف القطاع</label>
                        <textarea
                          rows={2}
                          className="editor-input"
                          value={sector.desc || ''}
                          onChange={e => {
                            const updated = { ...editContent };
                            updated.sectors[idx].desc = e.target.value;
                            setEditContent(updated);
                          }}
                        />
                      </div>
                      <div className="form-group">
                        <label>المميزات (مفصولة بأسطر جديدة)</label>
                        <textarea
                          rows={3}
                          className="editor-input"
                          value={(sector.features || []).join('\n')}
                          onChange={e => {
                            const updated = { ...editContent };
                            updated.sectors[idx].features = e.target.value.split('\n').filter((x: string) => x.trim() !== '');
                            setEditContent(updated);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeEditorTab === 'advantages' && (
                <div>
                  <div className="editor-section-card">
                    <div className="editor-section-title">العناوين العامة للمميزات</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>العنوان الفرعي</label>
                        <input
                          type="text"
                          className="editor-input"
                          value={editContent.advantages_subtitle || ''}
                          onChange={e => setEditContent({ ...editContent, advantages_subtitle: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>العنوان الرئيسي</label>
                        <input
                          type="text"
                          className="editor-input"
                          value={editContent.advantages_title || ''}
                          onChange={e => setEditContent({ ...editContent, advantages_title: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>الوصف العام للمميزات</label>
                      <input
                        type="text"
                        className="editor-input"
                        value={editContent.advantages_desc || ''}
                        onChange={e => setEditContent({ ...editContent, advantages_desc: e.target.value })}
                      />
                    </div>
                  </div>

                  {(editContent.advantages || []).map((adv: any, idx: number) => (
                    <div key={idx} className="editor-section-card">
                      <div className="editor-section-title">الميزة رقم {idx + 1}</div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>الأيقونة (Emoji)</label>
                          <input
                            type="text"
                            className="editor-input"
                            value={adv.icon || ''}
                            onChange={e => {
                              const updated = { ...editContent };
                              updated.advantages[idx].icon = e.target.value;
                              setEditContent(updated);
                            }}
                          />
                        </div>
                        <div className="form-group">
                          <label>عنوان الميزة</label>
                          <input
                            type="text"
                            className="editor-input"
                            value={adv.title || ''}
                            onChange={e => {
                              const updated = { ...editContent };
                              updated.advantages[idx].title = e.target.value;
                              setEditContent(updated);
                            }}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>شرح الميزة بالتفصيل</label>
                        <textarea
                          rows={2}
                          className="editor-input"
                          value={adv.desc || ''}
                          onChange={e => {
                            const updated = { ...editContent };
                            updated.advantages[idx].desc = e.target.value;
                            setEditContent(updated);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeEditorTab === 'stats' && (
                <div>
                  {(editContent.stats || []).map((stat: any, idx: number) => (
                    <div key={idx} className="editor-section-card">
                      <div className="editor-section-title">الإحصائية رقم {idx + 1}</div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>الأيقونة</label>
                          <input
                            type="text"
                            className="editor-input"
                            value={stat.icon || ''}
                            onChange={e => {
                              const updated = { ...editContent };
                              updated.stats[idx].icon = e.target.value;
                              setEditContent(updated);
                            }}
                          />
                        </div>
                        <div className="form-group">
                          <label>الرقم أو النسبة</label>
                          <input
                            type="text"
                            className="editor-input"
                            value={stat.number || ''}
                            onChange={e => {
                              const updated = { ...editContent };
                              updated.stats[idx].number = e.target.value;
                              setEditContent(updated);
                            }}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>الوصف أو التسمية</label>
                        <input
                          type="text"
                          className="editor-input"
                          value={stat.label || ''}
                          onChange={e => {
                            const updated = { ...editContent };
                            updated.stats[idx].label = e.target.value;
                            setEditContent(updated);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeEditorTab === 'footer' && (
                <div className="editor-section-card">
                  <div className="editor-section-title">بيانات التواصل وحقوق الفوتر</div>
                  
                  <div className="form-group">
                    <label>عنوان قسم التواصل ("هل لديك مشروع عملاق وترغب في التعاون؟")</label>
                    <input
                      type="text"
                      className="editor-input"
                      value={editContent.contact?.title || ''}
                      onChange={e => setEditContent({
                        ...editContent,
                        contact: { ...editContent.contact, title: e.target.value }
                      })}
                    />
                  </div>

                  <div className="form-group">
                    <label>وصف قسم التواصل</label>
                    <textarea
                      rows={3}
                      className="editor-input"
                      value={editContent.contact?.desc || ''}
                      onChange={e => setEditContent({
                        ...editContent,
                        contact: { ...editContent.contact, desc: e.target.value }
                      })}
                    />
                  </div>

                  <div className="form-group">
                    <label>📍 المقر الرئيسي</label>
                    <input
                      type="text"
                      className="editor-input"
                      value={editContent.contact?.address || ''}
                      onChange={e => setEditContent({
                        ...editContent,
                        contact: { ...editContent.contact, address: e.target.value }
                      })}
                    />
                  </div>

                  <div className="form-group">
                    <label>📞 الهاتف والتواصل</label>
                    <input
                      type="text"
                      className="editor-input"
                      value={editContent.contact?.phone || ''}
                      onChange={e => setEditContent({
                        ...editContent,
                        contact: { ...editContent.contact, phone: e.target.value }
                      })}
                    />
                  </div>

                  <div className="form-group">
                    <label>✉️ البريد الإلكتروني التجاري</label>
                    <input
                      type="text"
                      className="editor-input"
                      value={editContent.contact?.email || ''}
                      onChange={e => setEditContent({
                        ...editContent,
                        contact: { ...editContent.contact, email: e.target.value }
                      })}
                    />
                  </div>

                  <div className="form-group" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <label>نص حقوق الملكية (Copyright)</label>
                    <input
                      type="text"
                      className="editor-input"
                      value={editContent.footer?.copyright || ''}
                      onChange={e => setEditContent({
                        ...editContent,
                        footer: { ...editContent.footer, copyright: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>نبذة المؤسسة في الفوتر</label>
                    <textarea
                      rows={3}
                      className="editor-input"
                      value={editContent.footer?.about_text || ''}
                      onChange={e => setEditContent({
                        ...editContent,
                        footer: { ...editContent.footer, about_text: e.target.value }
                      })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Editor Footer Actions */}
            <div className="editor-footer">
              <button
                className="btn-hero-primary"
                onClick={async () => {
                  setSavingEditor(true);
                  try {
                    const res = await fetch('/api/landing-page', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ password: 'elraye2123', content: editContent })
                    });
                    const resData = await res.json();
                    if (resData.success) {
                      setLandingContent(editContent);
                      setIsEditorOpen(false);
                      alert('تم حفظ التغييرات ونشرها بنجاح! 🎉');
                    } else {
                      alert('حدث خطأ أثناء الحفظ: ' + resData.error);
                    }
                  } catch (err) {
                    console.error(err);
                    alert('فشل الاتصال بالخادم لحفظ التعديلات.');
                  } finally {
                    setSavingEditor(false);
                  }
                }}
                disabled={savingEditor}
              >
                {savingEditor ? 'جاري الحفظ والنشـر...' : '💾 حفظ التعديلات ونشرها'}
              </button>
              <button
                className="btn-hero-secondary"
                onClick={() => setIsEditorOpen(false)}
                disabled={savingEditor}
              >
                إلغاء التغييرات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
