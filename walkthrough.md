# الرايق للمقاولات الكهروميكانيكية - ERP Walkthrough

This document outlines the complete implementation of the **الرايق ERP System**, a full-stack Contracting ERP web application tailored for electromechanical and fire fighting projects.

---

## 🛠️ Tech Stack & Architectural Foundation

1. **Backend & Database**:
   - **PostgreSQL**: Hosted on Supabase.
   - Designed 39 relational tables, views, and indexes to support 7 modules.
   - Built server-side connection pool (`src/lib/db.ts`) with type-safe query parameters.
   
2. **Frontend UI**:
   - **Next.js 14 / React 18**: Built with type safety, server-side redirects, and responsive routing.
   - **Vanilla CSS Theme**: Configured in `globals.css` with a responsive dark glassmorphism system and custom fonts (Cairo).
   - **RTL Arabic Layout**: Arabic-first design with RTL alignment.

---

## 🏗️ Implemented Modules

### 1. Dashboard (لوحة التحكم)
- Aggregates system-wide KPIs: active projects, portfolio contract value, employees on sites, and open emergency tickets.
- Features dynamic financial charts (expenses, progress tracking, labor allocation vs daily wages) using `Chart.js`.

### 2. Project Management (إدارة المشاريع)
- Tracks electromechanical site stages (Networks, Risers, Fixtures).
- Interactive modals to add and update projects.

### 3. Engineering & Estimation (الهندسة والتسعير)
- Supports adding Bills of Quantities (BOQ) with specific calculations for overhead and profit percentages.

### 4. Procurement & Inventory (المشتريات والمخازن)
- Handles material requests from site engineers, consultant submittals tracking, and site stock levels.
- Automated alerts for low stock levels.

### 5. Subcontractors & Labor (مقاولو الباطن والعمالة اليومية)
- Records subcontractors contracts and issues Interim Payment Certificates (IPCs).
- Daily labor wages sheet and attendance ledger.

### 6. Finance & Invoicing (المالية والمستخلصات)
- Generates Client IPCs based on approved quantities.
- Real-time cash flow monitoring (income vs expenses).

### 7. Maintenance & Post-Handover (الصيانة والتشغيل)
- Post-handover contracts management, scheduled periodic maintenance visits, and emergency fault ticket reporting.

### 8. Interactive Settings & Control Center (الإعدادات العامة وإدارة المستخدمين)
- **Company Profile Settings**: Editable company Arabic name, English name, CR number, VAT number, Address, Phone, and Email. Saves/updates database records.
- **System Defaults**: Configurable default VAT percentage and retention percentage.
- **Users & Roles Control**: Add new system users (engineers, accountants, store keepers, admins) with assigned roles and live directory listing.

---

## 💡 Enhancements & Fixes Applied

- **Egyptian Pound Currency Integration**: Changed all money formatting and currency indicators across all 8 modules (Dashboard, Projects, Labor, Maintenance, Subcontractors, Finance, Estimation, Procurement) from SAR (ر.س) to Egyptian Pound (ج.م) formatted in Egyptian locale (`ar-EG`).
- **Interactive Header Navigation**: Added full interactivity to the top bar:
  - Settings Gear now redirects to `/settings`.
  - Notifications Bell opens a dropdown displaying recent alerts (document expiry warning, pending overtime approval, new fault ticket) with a quick navigation link.
  - User profile menu opens a dropdown showing current session role and a simulation logout button.
- **Interactive Settings Page**: Implemented tabs for Company Profile, Users Management, and System Defaults. Form submission updates database records instantly.

---

## 📊 Verification and Compilation Status

- **Database**: Schema applied successfully, and table counts verified.
- **Compilation**: Clean production build completed successfully without any compilation or TypeScript errors.
- **RTL Compliance**: Tested and verified.
