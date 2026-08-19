# Hesaby ERP — Mobile App Launch & Store Submission Guide

This document outlines everything needed to package, distribute, and publish **Hesaby ERP** (`com.hesaby.erp`) to clients and app stores.

---

## 1. App Store & Google Play Listing Information

### 📱 General App Details
- **App Name (EN)**: Hesaby ERP — Construction Management
- **App Name (AR)**: حسابي ERP — إدارة المشروعات الهندسية
- **Package / Bundle Identifier**: `com.hesaby.erp`
- **Default Category**: Business / Productivity
- **Primary Language**: Arabic (Egypt) + English

### 📝 Short Description (80 characters)
- **EN**: Construction site management, daily site reports, ledger, and AI copilot.
- **AR**: إدارة مواقع التشييد، الحسابات المالية، التقارير اليومية والمساعد الذكي.

### 📄 Full Store Description (English)
> **Hesaby ERP** is the all-in-one mobile companion for civil engineers, site managers, and construction contractors.
> 
> Key Capabilities:
> - **AI Voice & Receipt Capture**: Speak site expenses or snap receipts — the AI drafts ledger transactions automatically.
> - **Daily Site Reports (DSR)**: Log daily site progress, weather, workforce counts, and equipment on site.
> - **Engineer Custody & Wallets**: Real-time custody balance tracking, expense clearance, and funding requests.
> - **Operations Hub**: Manage raw materials, workmen wages, overdue invoices, and supplier accounts.
> - **AI Copilot**: Ask questions about your projects and cashflow in plain Arabic or English.

### 📄 Full Store Description (Arabic)
> **حسابي ERP** هو التطبيق الميداني المتكامل لمهندسي المواقع، مديري المشروعات، وشركات المقاولات.
> 
> المميزات الرئيسية:
> - **مسودات الذكاء الاصطناعي**: سجل المصروفات صوتياً أو التقط صورة الإيصال — وسيتولى المساعد الذكي تسجيل المعاملة المالية تلقائياً.
> - **التقارير اليومية للموقع (DSR)**: توثيق سير الأعمال، الطقس، أعداد العمالة، والمعدات اليومية.
> - **العهدة المالية للمهندس**: متابعة رصيد العهدة الفعلي، المبالغ المعلقة، وتصفية النفقات فورياً.
> - **مركز العمليات والموارد**: إدارة مخزون الخامات، أجور العمالة والصنائعية، الفواتير والمطالبات، ودليل الموردين.
> - **المساعد الذكي (AI Copilot)**: محادثة فورية باللغة العربية أو الإنجليزية للاستفسار عن تكاليف المشاريع وأرصدة الدفاتر.

---

## 2. Privacy Policy & Store Requirements

Both Apple and Google require a publicly accessible Privacy Policy URL during review.

- **Required URL**: `https://<your-domain>/privacy` (or a hosted markdown page).
- **Data Access Justifications**:
  1. **Camera (`NSCameraUsageDescription`)**: Used solely for photographing physical invoices, receipts, and construction site progress photos.
  2. **Microphone (`NSMicrophoneUsageDescription`)**: Used to record short voice memos for AI transaction drafting.
  3. **Photo Library (`NSPhotoLibraryUsageDescription`)**: Used to attach previously taken receipts and drawings from the device gallery.

---

## 3. How to Build & Distribute the App

### 🛠️ Step 1: Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### 📦 Step 2: Generate Direct-Install Android APK (Shareable with Clients)
```bash
cd mobile
eas build -p android --profile preview
```
- EAS Cloud will compile the `.apk`.
- You will receive a direct download link and QR code to share via WhatsApp or email.

### 🚀 Step 3: Production Store Builds
- **Google Play Bundle (AAB)**:
  ```bash
  cd mobile
  eas build -p android --profile production
  ```
- **Apple App Store / TestFlight**:
  ```bash
  cd mobile
  eas build -p ios --profile production
  ```

### ⚡ Step 4: Push Instant Over-The-Air (OTA) Updates
Fix bugs or update screens without waiting for store reviews:
```bash
cd mobile
eas update --branch production --message "UI improvements and updates"
```
