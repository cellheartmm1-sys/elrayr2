import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';

const defaultLandingContent = {
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

async function ensureTableExists() {
  await query(`
    CREATE TABLE IF NOT EXISTS landing_page_content (
      id SERIAL PRIMARY KEY,
      key VARCHAR(100) UNIQUE NOT NULL,
      value JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

export async function GET() {
  try {
    await ensureTableExists();
    const res = await query("SELECT value FROM landing_page_content WHERE key = 'content' LIMIT 1");
    if (res.rows.length === 0) {
      // Insert default value
      await query(
        "INSERT INTO landing_page_content (key, value) VALUES ('content', $1)",
        [JSON.stringify(defaultLandingContent)]
      );
      return NextResponse.json(defaultLandingContent);
    }
    return NextResponse.json(res.rows[0].value);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTableExists();
    const { password, content } = await request.json();

    if (password !== 'elraye2123') {
      return NextResponse.json({ error: 'كلمة المرور غير صحيحة!' }, { status: 401 });
    }

    await query(`
      INSERT INTO landing_page_content (key, value, updated_at)
      VALUES ('content', $1, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
    `, [JSON.stringify(content)]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
