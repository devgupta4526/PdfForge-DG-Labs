# 📄 PDF Tools Application — Complete Documentation Package

I'll prepare two comprehensive documents for you: a **Feature Specification Document (FSD)** and a **Technical Implementation Document (TID)**. These are professional-grade docs that you can use to build and even share with future hires/investors.

---

# 📘 DOCUMENT 1: FEATURE SPECIFICATION DOCUMENT (FSD)

---

## **PROJECT: PDF Tools Web Application**
**Document Version:** 1.0
**Date:** 2025
**Status:** Draft for Development
**Author:** [Your Name]

---

## 1. EXECUTIVE SUMMARY

### 1.1 Product Vision
A free, fast, and privacy-focused web application offering 20+ essential PDF manipulation tools. The platform monetizes via advertisements and premium subscriptions, targeting users who need quick PDF operations without installing software.

### 1.2 Product Goals
- Provide best-in-class PDF tools accessible from any browser
- Achieve 100,000 monthly active users within 12 months
- Generate ₹3,00,000+ MRR by Month 12
- Rank in top 10 Google results for primary PDF tool keywords
- Maintain 99.9% uptime

### 1.3 Target Audience
- **Primary**: Students (18–25) needing quick PDF edits
- **Secondary**: Office professionals (25–45) needing daily PDF tools
- **Tertiary**: Small business owners managing documents
- **Geographic**: Global, with primary focus on India, USA, UK, Southeast Asia

### 1.4 Success Metrics (KPIs)
| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| Daily Active Users (DAU) | 500 | 5,000 | 25,000 |
| Monthly Active Users (MAU) | 5,000 | 50,000 | 200,000 |
| Premium Subscribers | 20 | 200 | 2,000 |
| Monthly Recurring Revenue | ₹4,000 | ₹40,000 | ₹4,00,000 |
| Tool Operations/Day | 1,000 | 25,000 | 1,00,000 |
| Avg. Session Duration | 2 min | 3 min | 4 min |
| Bounce Rate | <60% | <50% | <40% |

---

## 2. PRODUCT OVERVIEW

### 2.1 Problem Statement
Users frequently need to perform PDF operations (merge, split, convert) but face friction:
- Desktop software is expensive (Adobe Acrobat: ₹1,675/month)
- Existing free tools have file size limits, watermarks, or privacy concerns
- Mobile users have very limited PDF tool options
- Most tools force account creation

### 2.2 Solution
A web-based PDF tools platform that:
- Works without registration for most operations
- Processes files client-side when possible (privacy)
- Offers comprehensive tool suite in one place
- Mobile-responsive design
- Free tier with reasonable limits + affordable premium

### 2.3 Unique Value Propositions (UVPs)
1. **Privacy-First**: Files processed in browser when possible
2. **No Signup**: Use 80% of tools without account
3. **Speed**: Optimized for sub-3-second processing
4. **Comprehensive**: 20+ tools in single platform
5. **Affordable**: Premium at ₹199/month vs Adobe ₹1,675/month
6. **Multi-language**: English, Hindi, Spanish support from launch

---

## 3. USER PERSONAS

### 3.1 Persona 1: Rahul — The Student
- **Age**: 21
- **Occupation**: College student
- **Tech Savviness**: High
- **Pain Points**: Needs to merge assignment PDFs, compress for upload limits
- **Usage Frequency**: 3–5 times/week
- **Willingness to Pay**: Low (uses free tier)
- **Device**: 70% mobile, 30% laptop

### 3.2 Persona 2: Priya — The Office Professional
- **Age**: 32
- **Occupation**: HR Manager
- **Tech Savviness**: Medium
- **Pain Points**: Daily PDF conversions, signing documents
- **Usage Frequency**: Daily
- **Willingness to Pay**: High (₹500–₹1,000/month for time savings)
- **Device**: 80% laptop, 20% mobile

### 3.3 Persona 3: Amit — The Small Business Owner
- **Age**: 38
- **Occupation**: Runs a printing shop
- **Tech Savviness**: Low-Medium
- **Pain Points**: Bulk PDF processing for clients
- **Usage Frequency**: Multiple times daily
- **Willingness to Pay**: High (needs API access)
- **Device**: 90% desktop

---

## 4. FEATURE SPECIFICATIONS

### 4.1 FEATURE CATEGORIES

The product has **6 major feature areas**:

```
1. Core PDF Tools (20 tools)
2. User Account System
3. Subscription & Billing
4. Dashboard & History
5. Marketing Pages
6. Admin Panel
```

---

### 4.2 CORE PDF TOOLS (Detailed Specifications)

---

#### **TOOL #1: MERGE PDF**

**Description**: Combine multiple PDF files into a single document.

**User Stories:**
- As a user, I want to drag and drop multiple PDFs to merge them
- As a user, I want to reorder files before merging
- As a user, I want to remove individual files before merging
- As a user, I want to download the merged file instantly

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F1.1 | Accept PDF files via drag-and-drop | Must |
| F1.2 | Accept PDF files via file picker | Must |
| F1.3 | Display file thumbnails after upload | Must |
| F1.4 | Allow drag-to-reorder files | Must |
| F1.5 | Show file size next to each file | Must |
| F1.6 | Allow removing individual files | Must |
| F1.7 | Show progress during merging | Must |
| F1.8 | Auto-download merged file | Must |
| F1.9 | Allow custom output filename | Should |
| F1.10 | Show estimated output size | Could |

**Limits:**
| Tier | Max Files | Max File Size | Daily Limit |
|------|-----------|---------------|-------------|
| Free | 10 | 50 MB | 5 operations |
| Premium | 50 | 500 MB | Unlimited |

**Acceptance Criteria:**
- ✅ User can merge 2–10 PDFs in <10 seconds
- ✅ Output PDF maintains original quality
- ✅ Page order matches user-defined order
- ✅ Works on Chrome, Firefox, Safari, Edge
- ✅ Mobile-responsive interface

**Error Handling:**
- File too large → Show error with upgrade prompt
- Invalid PDF → Show error, allow re-upload
- Browser memory limit → Fallback to server processing

---

#### **TOOL #2: SPLIT PDF**

**Description**: Extract specific pages or split PDF into multiple files.

**User Stories:**
- As a user, I want to split a PDF by page ranges
- As a user, I want to extract specific pages
- As a user, I want to split every N pages
- As a user, I want to preview pages before splitting

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F2.1 | Accept single PDF file | Must |
| F2.2 | Show page thumbnails preview | Must |
| F2.3 | Mode: Split by page range (e.g., 1-5, 8-10) | Must |
| F2.4 | Mode: Extract single pages | Must |
| F2.5 | Mode: Split every N pages | Should |
| F2.6 | Download as ZIP if multiple outputs | Must |
| F2.7 | Show page numbers on thumbnails | Must |

**Limits:**
| Tier | Max File Size | Max Pages |
|------|---------------|-----------|
| Free | 50 MB | 100 pages |
| Premium | 500 MB | Unlimited |

---

#### **TOOL #3: COMPRESS PDF**

**Description**: Reduce PDF file size while maintaining quality.

**User Stories:**
- As a user, I want to compress a PDF for email attachment
- As a user, I want to choose compression level
- As a user, I want to see size reduction percentage

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F3.1 | Accept PDF file | Must |
| F3.2 | Three compression levels: Low, Medium, High | Must |
| F3.3 | Show original size and estimated output size | Must |
| F3.4 | Show compression percentage achieved | Must |
| F3.5 | Allow comparison preview | Could |

**Compression Levels:**
- **Low (Better Quality)**: 30–40% reduction
- **Medium (Recommended)**: 50–70% reduction
- **High (Smaller Size)**: 70–85% reduction

---

#### **TOOL #4: PDF TO WORD**

**Description**: Convert PDF documents to editable Word (DOCX) format.

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F4.1 | Accept PDF file (max 100MB free, 500MB premium) | Must |
| F4.2 | Preserve text formatting | Must |
| F4.3 | Preserve images | Must |
| F4.4 | Preserve tables | Should |
| F4.5 | OCR for scanned PDFs (Premium only) | Should |
| F4.6 | Output: DOCX file | Must |

**Quality Targets:**
- Text-based PDFs: 95% accuracy
- Scanned PDFs (with OCR): 85% accuracy

---

#### **TOOL #5: PDF TO JPG**

**Description**: Convert PDF pages to JPG images.

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F5.1 | Accept PDF file | Must |
| F5.2 | Convert each page to separate JPG | Must |
| F5.3 | Quality settings: Low, Medium, High | Must |
| F5.4 | DPI options: 72, 150, 300 | Should |
| F5.5 | Download as ZIP | Must |
| F5.6 | Option: Extract images only (vs render pages) | Could |

---

#### **TOOL #6: JPG TO PDF**

**Description**: Convert images to PDF document.

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F6.1 | Accept JPG, PNG, WEBP, HEIC images | Must |
| F6.2 | Drag to reorder images | Must |
| F6.3 | Page size options: A4, Letter, Custom | Must |
| F6.4 | Page orientation: Portrait, Landscape | Must |
| F6.5 | Margin options: None, Small, Big | Must |
| F6.6 | Auto-fit images to page | Must |

---

#### **TOOL #7: ROTATE PDF**

**Description**: Rotate PDF pages 90°, 180°, or 270°.

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F7.1 | Accept PDF file | Must |
| F7.2 | Show all pages as thumbnails | Must |
| F7.3 | Rotate individual pages | Must |
| F7.4 | Rotate all pages at once | Must |
| F7.5 | Rotation options: 90°, 180°, 270° | Must |

---

#### **TOOL #8: UNLOCK PDF**

**Description**: Remove password protection from PDF (only if user has password or for owner-restricted PDFs).

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F8.1 | Accept password-protected PDF | Must |
| F8.2 | Prompt for password | Must |
| F8.3 | Remove password protection | Must |
| F8.4 | Legal disclaimer about ownership | Must |

> ⚠️ **Legal**: Display disclaimer that user must own/have rights to the document.

---

#### **TOOL #9: PROTECT PDF**

**Description**: Add password protection to PDF.

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F9.1 | Accept PDF file | Must |
| F9.2 | Set user password (open password) | Must |
| F9.3 | Set owner password (permissions) | Should |
| F9.4 | Configure permissions (print, edit, copy) | Should |
| F9.5 | Encryption strength: 128-bit, 256-bit | Must |

---

#### **TOOL #10: ADD WATERMARK**

**Description**: Add text or image watermark to PDF.

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| F10.1 | Accept PDF file | Must |
| F10.2 | Text watermark with custom text | Must |
| F10.3 | Image watermark | Must |
| F10.4 | Position options (9 positions) | Must |
| F10.5 | Opacity slider (0–100%) | Must |
| F10.6 | Rotation angle slider | Must |
| F10.7 | Font and size selection | Must |
| F10.8 | Color picker | Must |
| F10.9 | Apply to specific pages or all | Should |

---

#### **TOOLS #11–20: Quick Specifications**

| Tool | Description | Priority |
|------|-------------|----------|
| 11. PDF to Excel | Convert PDF tables to XLSX | Must |
| 12. Excel to PDF | Convert XLSX to PDF | Must |
| 13. PDF to PowerPoint | Convert PDF to PPTX | Should |
| 14. PowerPoint to PDF | Convert PPTX to PDF | Should |
| 15. Word to PDF | Convert DOCX to PDF | Must |
| 16. PDF to Text | Extract plain text | Must |
| 17. Add Page Numbers | Insert page numbers | Must |
| 18. Delete Pages | Remove specific pages | Must |
| 19. Reorder Pages | Rearrange page order | Must |
| 20. eSign PDF | Add digital signature | Should |

---

### 4.3 USER ACCOUNT SYSTEM

#### 4.3.1 Authentication Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Email/Password Signup | Standard registration | Must |
| Email Verification | OTP via email | Must |
| Google OAuth | "Sign in with Google" | Must |
| Password Reset | Email-based reset | Must |
| Remember Me | Long-lived sessions | Must |
| Session Management | Multi-device sessions | Should |
| 2FA | Two-factor authentication | Could |

#### 4.3.2 User Profile

**Profile Fields:**
- Full Name (required)
- Email (required, unique)
- Password (required, min 8 chars)
- Profile Picture (optional)
- Country (optional)
- Phone (optional, for SMS notifications)
- Notification preferences

#### 4.3.3 User Tiers

| Tier | Daily Limit | Max File Size | Features |
|------|-------------|---------------|----------|
| **Anonymous** | 3 ops/day | 25 MB | Basic tools only |
| **Free** | 10 ops/day | 50 MB | All basic tools, with ads |
| **Premium Monthly** | Unlimited | 500 MB | All tools, no ads, OCR, API access |
| **Premium Yearly** | Unlimited | 500 MB | Same as monthly + 30% discount |
| **Business** | Unlimited | 1 GB | API + team accounts + priority |

---

### 4.4 SUBSCRIPTION & BILLING

#### 4.4.1 Pricing Plans

| Plan | Price (INR) | Price (USD) | Billing |
|------|------------|-------------|---------|
| Free | ₹0 | $0 | — |
| Premium Monthly | ₹199 | $2.99 | Monthly |
| Premium Yearly | ₹1,499 | $24.99 | Yearly (37% off) |
| Business | ₹999/user | $14.99/user | Monthly |

#### 4.4.2 Payment Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Razorpay Integration | Indian payments | Must |
| Stripe Integration | International | Should |
| UPI Payments | UPI for India | Must |
| Card Payments | Credit/Debit | Must |
| Auto-renewal | Subscription auto-charge | Must |
| Cancel Anytime | One-click cancel | Must |
| Refund Policy | 7-day refund | Must |
| Invoice Generation | GST-compliant invoices | Must |
| Payment History | View past payments | Must |
| Failed Payment Retry | Auto-retry failed payments | Should |

---

### 4.5 DASHBOARD & USER FEATURES

#### 4.5.1 Dashboard Sections

| Section | Description |
|---------|-------------|
| **Overview** | Stats: total operations, this month's usage, current plan |
| **History** | Last 50 operations with files (premium: 30 days storage) |
| **Billing** | Subscription, payment methods, invoices |
| **Settings** | Profile, password, notifications, language |
| **API Keys** | (Premium only) Generate and manage API keys |

#### 4.5.2 History Feature
- View last 50 operations
- Re-download files (Premium: 30 days, Free: 1 hour)
- Filter by tool type, date
- Search functionality
- Delete history option

---

### 4.6 MARKETING PAGES

| Page | Purpose | Content |
|------|---------|---------|
| Homepage | Tool discovery + brand | Hero, tool grid, features, testimonials |
| About | Company info | Mission, team, values |
| Pricing | Conversion | Pricing table, FAQ, comparison |
| Blog | SEO content | Articles, tutorials |
| Tool Pages (×20) | SEO + Tool | Hero + tool + content + FAQ |
| Privacy Policy | Legal | DPDP-compliant policy |
| Terms of Service | Legal | Standard ToS |
| Contact | Support | Form, email, chat |
| FAQ | Support | Common questions |
| Help/Docs | Support | Tool tutorials |

---

### 4.7 ADMIN PANEL

**For internal use only** — built in Phase 2

| Feature | Description |
|---------|-------------|
| User Management | View, search, ban users |
| Subscription Management | Manual upgrades, refunds |
| Analytics Dashboard | Real-time usage stats |
| Tool Performance | Success/error rates per tool |
| Content Management | Manage blog, FAQ |
| System Health | Monitor uptime, errors |
| Revenue Reports | MRR, churn, LTV |

---

## 5. NON-FUNCTIONAL REQUIREMENTS

### 5.1 Performance Requirements

| Metric | Target |
|--------|--------|
| Page Load Time | <2 seconds |
| Time to Interactive | <3 seconds |
| Tool Processing (small files) | <5 seconds |
| Tool Processing (large files) | <30 seconds |
| API Response Time | <200ms (p95) |
| Uptime | 99.9% |

### 5.2 Security Requirements

| Requirement | Description |
|-------------|-------------|
| HTTPS | Mandatory across all pages |
| File Encryption | Files encrypted at rest |
| Auto-deletion | Files deleted after 1 hour |
| Password Hashing | bcrypt with salt |
| Rate Limiting | Per-IP and per-user limits |
| CSRF Protection | All forms protected |
| XSS Prevention | Input sanitization |
| SQL Injection | Parameterized queries |
| DDoS Protection | Cloudflare |
| GDPR Compliance | EU users |
| DPDP Compliance | Indian users |

### 5.3 Scalability Requirements
- Support 100,000 daily active users by Year 1
- Handle 1M operations/day at peak
- Horizontal scaling capability
- CDN for static assets globally

### 5.4 Compatibility Requirements

**Browsers:**
- Chrome 90+ (priority)
- Firefox 88+
- Safari 14+
- Edge 90+

**Devices:**
- Desktop (1920×1080, 1366×768)
- Tablet (iPad, Android tablets)
- Mobile (320px+ width)

### 5.5 Accessibility (WCAG 2.1 AA)
- Keyboard navigation
- Screen reader support
- Alt text on images
- Sufficient color contrast
- Focus indicators

### 5.6 Localization
- **Phase 1**: English
- **Phase 2**: Hindi, Spanish
- **Phase 3**: French, German, Portuguese, Arabic

---

## 6. USER FLOWS

### 6.1 Anonymous User Flow (Merge PDF)
```
Land on Homepage
    ↓
Click "Merge PDF" tool
    ↓
Drag/Upload 2+ PDFs
    ↓
Reorder if needed
    ↓
Click "Merge"
    ↓
Processing (with progress bar)
    ↓
Auto-download merged PDF
    ↓
See "Try Other Tools" suggestions
    ↓
[Optional] CTA to sign up for premium
```

### 6.2 Premium Conversion Flow
```
User exceeds free limit
    ↓
See upgrade modal
    ↓
Click "Upgrade to Premium"
    ↓
Sign up (if not logged in)
    ↓
Choose plan (monthly/yearly)
    ↓
Razorpay checkout
    ↓
Payment success
    ↓
Account upgraded instantly
    ↓
Redirect to dashboard
    ↓
Welcome email sent
```

### 6.3 Returning User Flow
```
User logs in
    ↓
Lands on dashboard
    ↓
Sees recent operations
    ↓
Quick access to favorite tools
    ↓
Selects tool → Performs operation
    ↓
Operation saved to history
```

---

## 7. CONTENT REQUIREMENTS

### 7.1 SEO Content per Tool Page (1,500+ words)

Each tool page must contain:
1. **H1 Title** (with primary keyword)
2. **Hero section** with tool widget
3. **"How to Use"** — step-by-step (3–5 steps with screenshots)
4. **Why use our tool** — 4–6 benefits
5. **Features list** — 8–10 features
6. **FAQ section** — 8–10 questions
7. **Related tools** — internal links
8. **Use cases** — 3–4 scenarios
9. **Comparison table** (vs competitors, optional)

### 7.2 Blog Content Strategy
- Tutorials: "How to merge PDF on Mac", "How to compress PDF for email"
- Comparisons: "TopBrand vs Competitors"
- Use case posts: "Best PDF tools for students"
- Industry posts: "PDF accessibility guide"

---

## 8. ANALYTICS & TRACKING

### 8.1 Events to Track

| Event | When |
|-------|------|
| `page_view` | User visits any page |
| `tool_started` | User opens a tool |
| `file_uploaded` | File uploaded |
| `tool_completed` | Operation successful |
| `tool_failed` | Operation failed |
| `signup_started` | User starts signup |
| `signup_completed` | Signup finished |
| `subscription_started` | Checkout started |
| `subscription_completed` | Payment success |
| `subscription_cancelled` | User cancels |
| `download_clicked` | File downloaded |

### 8.2 Tools
- **Google Analytics 4** — Web analytics
- **PostHog** — Product analytics, funnels
- **Sentry** — Error tracking
- **Hotjar** (later) — Session recording

---

## 9. RELEASE PHASES

### Phase 1: MVP Launch (Week 1–8)
- 6 core tools (Merge, Split, Compress, PDF↔JPG, Rotate)
- Basic auth (email + Google)
- Free tier only
- Homepage + tool pages

### Phase 2: Monetization (Week 9–12)
- Premium subscription
- Razorpay integration
- Dashboard + history
- 8 more tools (conversions)
- AdSense integration

### Phase 3: Growth (Month 4–6)
- Remaining 6 tools
- Hindi language
- Blog launch
- Referral program
- API for developers

### Phase 4: Scale (Month 6+)
- Mobile app (React Native)
- More languages
- Enterprise plans
- Image tools expansion

---

# 📗 DOCUMENT 2: TECHNICAL IMPLEMENTATION DOCUMENT (TID)

---

## **PROJECT: PDF Tools Web Application**
**Document Type:** Technical Implementation Specification
**Version:** 1.0

---

## 1. SYSTEM ARCHITECTURE

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER LAYER                           │
│   Web Browser (Desktop/Mobile)                          │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓ HTTPS
┌─────────────────────────────────────────────────────────┐
│              CDN & SECURITY LAYER                       │
│   Cloudflare (CDN, DDoS Protection, WAF)               │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│              APPLICATION LAYER                          │
│                                                         │
│   ┌──────────────────────────────────────────────────┐ │
│   │  Next.js 14 (Vercel)                            │ │
│   │  • Server Components (SEO)                      │ │
│   │  • API Routes                                   │ │
│   │  • Edge Functions                               │ │
│   │  • ISR for content pages                        │ │
│   └──────────────────────────────────────────────────┘ │
│                                                         │
│   ┌──────────────────────────────────────────────────┐ │
│   │  Backend Service (Railway/Render)               │ │
│   │  • Node.js + Express + TypeScript               │ │
│   │  • Heavy PDF operations                         │ │
│   │  • Background jobs                              │ │
│   └──────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│                 DATA LAYER                              │
│                                                         │
│   ┌─────────────────┐  ┌──────────────┐  ┌──────────┐ │
│   │  PostgreSQL     │  │   Redis      │  │  R2      │ │
│   │  (Supabase)     │  │  (Upstash)   │  │  Storage │ │
│   │  • Users        │  │  • Cache     │  │  • Files │ │
│   │  • Subscriptions│  │  • Rate limit│  │  • Auto- │ │
│   │  • History      │  │  • Sessions  │  │    delete│ │
│   └─────────────────┘  └──────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                          │
│   Razorpay │ Clerk │ Resend │ Sentry │ PostHog │ GA4   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Next.js Frontend** | UI, SEO pages, light PDF ops |
| **Next.js API Routes** | Auth, payments, light backend |
| **Node.js Backend** | Heavy PDF ops, conversions |
| **PostgreSQL** | User data, history, subscriptions |
| **Redis** | Caching, rate limiting, queues |
| **Cloudflare R2** | Temporary file storage |
| **Cloudflare CDN** | Static asset delivery |

---

## 2. TECHNOLOGY STACK (FINAL)

### 2.1 Frontend Stack
```json
{
  "framework": "Next.js 14.2+",
  "language": "TypeScript 5.3+",
  "styling": "Tailwind CSS 3.4+",
  "components": "shadcn/ui (Radix UI)",
  "stateManagement": "Zustand",
  "forms": "React Hook Form + Zod",
  "fileUpload": "react-dropzone",
  "icons": "Lucide React",
  "animations": "Framer Motion",
  "notifications": "Sonner (toast)",
  "pdfClientLib": "pdf-lib, pdfjs-dist"
}
```

### 2.2 Backend Stack
```json
{
  "runtime": "Node.js 20 LTS",
  "framework": "Express.js or NestJS",
  "language": "TypeScript",
  "orm": "Drizzle ORM",
  "database": "PostgreSQL 15+",
  "cache": "Redis 7+",
  "queue": "BullMQ",
  "fileStorage": "Cloudflare R2 (S3-compatible)",
  "auth": "Clerk OR NextAuth.js",
  "validation": "Zod",
  "logging": "Winston / Pino"
}
```

### 2.3 PDF Processing Libraries
```json
{
  "client": {
    "pdf-lib": "Merge, split, edit, basic operations",
    "pdfjs-dist": "Render PDFs, generate thumbnails",
    "jspdf": "Create PDFs from scratch"
  },
  "server": {
    "pdf-lib": "Server-side PDF manipulation",
    "sharp": "Image processing, compression",
    "pdf-parse": "Text extraction",
    "pdf2pic": "PDF to image conversion",
    "pdfkit": "Generate PDFs",
    "mammoth": "Word document processing",
    "exceljs": "Excel processing",
    "tesseract.js": "OCR (optional)",
    "libreoffice": "Office conversions (Docker)"
  }
}
```

### 2.4 DevOps & Infrastructure
```json
{
  "frontend_hosting": "Vercel",
  "backend_hosting": "Railway",
  "database_hosting": "Supabase",
  "redis_hosting": "Upstash",
  "fileStorage": "Cloudflare R2",
  "cdn": "Cloudflare",
  "monitoring": "Sentry + UptimeRobot",
  "ci_cd": "GitHub Actions",
  "domain": "Namecheap",
  "email": "Resend"
}
```

---

## 3. DATABASE SCHEMA

### 3.1 Core Tables

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  country VARCHAR(2),
  phone VARCHAR(20),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- Subscriptions Table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL, -- 'free', 'premium_monthly', 'premium_yearly', 'business'
  status VARCHAR(50) NOT NULL, -- 'active', 'cancelled', 'expired', 'past_due'
  razorpay_subscription_id VARCHAR(255),
  razorpay_customer_id VARCHAR(255),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Operations History Table
CREATE TABLE operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  anonymous_id VARCHAR(255), -- For anonymous users (IP+fingerprint hash)
  tool_slug VARCHAR(100) NOT NULL, -- 'merge-pdf', 'split-pdf', etc.
  status VARCHAR(50) NOT NULL, -- 'started', 'processing', 'completed', 'failed'
  input_files_count INT DEFAULT 1,
  input_size_bytes BIGINT,
  output_size_bytes BIGINT,
  output_file_url TEXT, -- R2 URL (with expiry)
  output_file_expires_at TIMESTAMPTZ,
  error_message TEXT,
  processing_time_ms INT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_operations_user ON operations(user_id);
CREATE INDEX idx_operations_tool ON operations(tool_slug);
CREATE INDEX idx_operations_created ON operations(created_at);
CREATE INDEX idx_operations_status ON operations(status);

-- Payments Table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  amount_inr DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'refunded'
  razorpay_payment_id VARCHAR(255) UNIQUE,
  razorpay_order_id VARCHAR(255),
  invoice_number VARCHAR(50),
  invoice_url TEXT,
  payment_method VARCHAR(50), -- 'card', 'upi', 'netbanking'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Usage Tracking Table (for rate limiting)
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  anonymous_id VARCHAR(255),
  date DATE NOT NULL,
  operations_count INT DEFAULT 0,
  bytes_processed BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date),
  UNIQUE(anonymous_id, date)
);

CREATE INDEX idx_usage_user_date ON usage_tracking(user_id, date);

-- API Keys Table (for premium users)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Blog Posts Table (for SEO)
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  author_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published', 'archived'
  meta_title VARCHAR(255),
  meta_description VARCHAR(500),
  published_at TIMESTAMPTZ,
  views_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Newsletter Subscribers
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);
```

### 3.2 Drizzle Schema Example

```typescript
// lib/db/schema.ts
import { pgTable, uuid, varchar, timestamp, boolean, integer, bigint, text, decimal, date, inet } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: varchar('clerk_id', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  country: varchar('country', { length: 2 }),
  phone: varchar('phone', { length: 20 }),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
  isActive: boolean('is_active').default(true),
});

export const operations = pgTable('operations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  anonymousId: varchar('anonymous_id', { length: 255 }),
  toolSlug: varchar('tool_slug', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  inputFilesCount: integer('input_files_count').default(1),
  inputSizeBytes: bigint('input_size_bytes', { mode: 'number' }),
  outputSizeBytes: bigint('output_size_bytes', { mode: 'number' }),
  outputFileUrl: text('output_file_url'),
  outputFileExpiresAt: timestamp('output_file_expires_at'),
  errorMessage: text('error_message'),
  processingTimeMs: integer('processing_time_ms'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## 4. API SPECIFICATION

### 4.1 RESTful API Design

**Base URL**: `https://api.yourbrand.com/v1` (production)

### 4.2 Authentication Endpoints

```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
```

### 4.3 PDF Tool Endpoints

```
POST   /api/pdf/merge
POST   /api/pdf/split
POST   /api/pdf/compress
POST   /api/pdf/rotate
POST   /api/pdf/unlock
POST   /api/pdf/protect
POST   /api/pdf/watermark
POST   /api/pdf/page-numbers
POST   /api/pdf/extract-text
POST   /api/pdf/delete-pages
POST   /api/pdf/reorder-pages
```

### 4.4 Conversion Endpoints

```
POST   /api/convert/pdf-to-word
POST   /api/convert/pdf-to-excel
POST   /api/convert/pdf-to-ppt
POST   /api/convert/pdf-to-jpg
POST   /api/convert/pdf-to-text
POST   /api/convert/word-to-pdf
POST   /api/convert/excel-to-pdf
POST   /api/convert/ppt-to-pdf
POST   /api/convert/jpg-to-pdf
```

### 4.5 User & Subscription Endpoints

```
GET    /api/user/profile
PATCH  /api/user/profile
GET    /api/user/history
DELETE /api/user/history/:id
GET    /api/user/usage

GET    /api/subscription
POST   /api/subscription/create
POST   /api/subscription/cancel
POST   /api/subscription/resume
GET    /api/subscription/invoices
```

### 4.6 Payment Endpoints

```
POST   /api/payments/create-order
POST   /api/payments/verify
POST   /api/payments/webhook (Razorpay)
GET    /api/payments/history
```

### 4.7 API Request/Response Examples

#### Example: Merge PDF Endpoint

**Request:**
```http
POST /api/pdf/merge HTTP/1.1
Content-Type: multipart/form-data
Authorization: Bearer <token> (optional)

files[]: file1.pdf
files[]: file2.pdf
options: {"filename": "merged.pdf"}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "operationId": "uuid-here",
    "downloadUrl": "https://r2.cloudflare.com/files/merged-uuid.pdf",
    "expiresAt": "2025-01-15T15:30:00Z",
    "fileSize": 2048576,
    "processingTimeMs": 3245
  }
}
```

**Error Response (429 - Rate Limited):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You've reached your daily limit of 5 operations.",
    "upgradeUrl": "/pricing",
    "retryAfter": 86400
  }
}
```

**Error Response (413 - File Too Large):**
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds 50MB limit. Upgrade to Premium for 500MB.",
    "maxSizeAllowed": 52428800,
    "upgradeUrl": "/pricing"
  }
}
```

---

## 5. FILE PROCESSING STRATEGY

### 5.1 Decision Tree: Client vs Server Processing

```
Is file size < 25MB?
├─ YES → Is operation supported in browser?
│        ├─ YES → Process Client-Side ✅
│        └─ NO → Process Server-Side
└─ NO → Process Server-Side
```

### 5.2 Client-Side Operations (Faster, More Private)
- Merge PDF
- Split PDF
- Rotate PDF
- Delete pages
- Reorder pages
- JPG to PDF (small)
- PDF to text (basic)

### 5.3 Server-Side Operations (Heavy Processing)
- Compress PDF (advanced)
- PDF to Word/Excel/PPT
- Word/Excel/PPT to PDF
- OCR
- Add watermark with images
- Large files (>25MB)

### 5.4 File Upload Flow

```
1. User selects file in browser
   ↓
2. Client validates (size, type, count)
   ↓
3a. If client-side: Process in browser using pdf-lib
   ↓
3b. If server-side:
    a. Get presigned URL from API
    b. Upload directly to R2 from browser
    c. Server processes file from R2
    d. Server stores output in R2
    e. Returns presigned download URL
   ↓
4. User downloads result
   ↓
5. File auto-deleted after 1 hour
```

### 5.5 Auto-Deletion Strategy

**Approach 1: Cloudflare R2 Lifecycle Rules**
```yaml
LifecycleRules:
  - Filter:
      Prefix: "temp/"
    Expiration:
      Days: 1  # Auto-delete after 1 day
```

**Approach 2: Background Job (BullMQ)**
- Schedule deletion task when file uploaded
- Runs after 1 hour
- Logs deletion for audit

---

## 6. SECURITY IMPLEMENTATION

### 6.1 Authentication Flow

```
User Login Flow:
1. User submits email + password
2. Frontend sends to /api/auth/login
3. Server validates with Clerk
4. Clerk returns JWT
5. JWT stored in httpOnly cookie
6. All subsequent requests include cookie
7. Middleware validates JWT on protected routes
```

### 6.2 Rate Limiting Strategy

```typescript
// Middleware: rate-limit.ts
const rateLimits = {
  anonymous: {
    operations: 3,        // per day
    requests: 30,         // per minute
  },
  free: {
    operations: 10,       // per day
    requests: 60,         // per minute
  },
  premium: {
    operations: -1,       // unlimited
    requests: 300,        // per minute
  },
  business: {
    operations: -1,
    requests: 1000,
  }
};

// Implementation using Upstash Redis
async function checkRateLimit(userId: string | null, ip: string) {
  const identifier = userId || `ip:${ip}`;
  const key = `ratelimit:${identifier}:${getCurrentDay()}`;
  
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 86400); // 24 hours
  }
  
  const limit = userId ? userLimit : anonymousLimit;
  if (count > limit) {
    throw new RateLimitError();
  }
}
```

### 6.3 File Validation

```typescript
function validateFile(file: File, options: ValidationOptions) {
  // Check file extension
  if (!options.allowedExtensions.includes(getExtension(file.name))) {
    throw new InvalidFileError("Invalid file type");
  }
  
  // Check MIME type
  if (!options.allowedMimeTypes.includes(file.type)) {
    throw new InvalidFileError("Invalid MIME type");
  }
  
  // Check file size
  if (file.size > options.maxSize) {
    throw new FileTooLargeError(`Max size: ${options.maxSize / 1024 / 1024}MB`);
  }
  
  // Verify magic bytes (PDF starts with %PDF-)
  // Read first few bytes and verify
}
```

### 6.4 Security Headers

```typescript
// next.config.js
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: "..." }
];
```

---

## 7. PERFORMANCE OPTIMIZATION

### 7.1 Frontend Performance

**Strategies:**
- Use Next.js Image component for all images
- Code splitting with `dynamic()` imports
- Lazy load heavy libraries (pdf-lib only when tool is used)
- Use React Server Components for static content
- Implement ISR for tool pages (1-hour revalidation)
- Service Worker for offline support
- Preload critical fonts

**Code Example:**
```typescript
// Lazy load PDF library
const MergeTool = dynamic(() => import('./MergeTool'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

### 7.2 Backend Performance

**Strategies:**
- Worker threads for CPU-intensive operations
- Stream processing for large files
- Redis caching for repeated operations
- Database connection pooling
- Compress API responses (gzip/brotli)

### 7.3 Database Performance

```sql
-- Indexes for common queries
CREATE INDEX CONCURRENTLY idx_operations_user_created 
  ON operations(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_subscriptions_active 
  ON subscriptions(user_id) 
  WHERE status = 'active';

-- Partitioning for operations table (by month)
-- Implement when table > 10M rows
```

---

## 8. DEPLOYMENT STRATEGY

### 8.1 Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| Local | Development | localhost:3000 |
| Staging | Pre-production testing | staging.yourbrand.com |
| Production | Live | yourbrand.com |

### 8.2 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
  
  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          
  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: railway-app/cli@v1
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
          command: up
```

### 8.3 Environment Variables

```bash
# .env.example

# App
NEXT_PUBLIC_APP_URL=https://yourbrand.com
NEXT_PUBLIC_API_URL=https://api.yourbrand.com

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Redis
REDIS_URL=redis://...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=pdf-tools-files
R2_PUBLIC_URL=https://files.yourbrand.com

# Email (Resend)
RESEND_API_KEY=...
EMAIL_FROM=noreply@yourbrand.com

# Analytics
NEXT_PUBLIC_GA_ID=G-...
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...

# Sentry
SENTRY_DSN=...
SENTRY_AUTH_TOKEN=...
```

---

## 9. TESTING STRATEGY

### 9.1 Testing Pyramid

```
        /\
       /  \  E2E Tests (10%)
      /────\
     /      \  Integration Tests (30%)
    /────────\
   /          \  Unit Tests (60%)
  /────────────\
```

### 9.2 Tools

- **Unit Tests**: Vitest
- **Integration Tests**: Vitest + Supertest
- **E2E Tests**: Playwright
- **Component Tests**: React Testing Library
- **Load Tests**: k6

### 9.3 Test Coverage Goals

| Layer | Coverage |
|-------|----------|
| Utilities | 90%+ |
| API Routes | 80%+ |
| Components | 70%+ |
| E2E Critical Paths | 100% |

---

## 10. MONITORING & OBSERVABILITY

### 10.1 Metrics to Monitor

**Application Metrics:**
- Request count (per endpoint)
- Response time (p50, p95, p99)
- Error rate
- Active users
- Operations per second

**Business Metrics:**
- Daily/Monthly Active Users
- Conversion rate (free → paid)
- Tool usage distribution
- Payment success rate
- Churn rate

**Infrastructure Metrics:**
- CPU usage
- Memory usage
- Disk I/O
- Network bandwidth
- Database query time

### 10.2 Alerting Rules

| Alert | Threshold | Action |
|-------|-----------|--------|
| Error rate > 5% | 5 min sustained | Page on-call |
| Response time p95 > 3s | 10 min | Slack notification |
| Disk usage > 80% | Immediate | Email + Slack |
| Failed payments > 10% | 30 min | Slack |
| Uptime < 99% | Daily report | Email |

---

## 11. DEVELOPMENT WORKFLOW

### 11.1 Git Branching Strategy

```
main (production)
  ├── develop (staging)
  │     ├── feature/merge-pdf-tool
  │     ├── feature/razorpay-integration
  │     └── fix/file-upload-bug
  └── hotfix/critical-issue
```

### 11.2 Commit Message Convention

```
feat: Add PDF merge tool
fix: Resolve file upload error on mobile
docs: Update API documentation
refactor: Improve PDF processing performance
test: Add tests for split PDF
chore: Update dependencies
```

### 11.3 Code Review Checklist

- [ ] Code follows TypeScript strict mode
- [ ] All functions have proper types
- [ ] Tests added for new functionality
- [ ] No console.logs in production code
- [ ] Security implications considered
- [ ] Performance impact assessed
- [ ] Documentation updated

---

## 12. LAUNCH CHECKLIST

### Pre-Launch (T-7 days)

- [ ] All 6 MVP tools tested
- [ ] Payment system tested end-to-end
- [ ] SSL certificate installed
- [ ] DNS configured
- [ ] Backup strategy in place
- [ ] Privacy Policy + ToS published
- [ ] Cookie consent banner active
- [ ] Sitemap submitted to Google
- [ ] Analytics installed
- [ ] Error tracking active
- [ ] Performance: Lighthouse score >90
- [ ] Mobile tested on 5+ devices
- [ ] Cross-browser testing complete
- [ ] Security audit done
- [ ] Load testing complete (1000 concurrent users)

### Launch Day

- [ ] DNS propagated
- [ ] Monitoring dashboards open
- [ ] Support email ready
- [ ] Social media posts scheduled
- [ ] Product Hunt submission live
- [ ] Reddit/IndieHackers posts
- [ ] Press release sent

### Post-Launch (T+7 days)

- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Analyze conversion funnel
- [ ] Fix critical bugs
- [ ] Plan first iteration

---

## 13. APPENDIX

### 13.1 Glossary

- **MVP**: Minimum Viable Product
- **CDN**: Content Delivery Network
- **SSR**: Server-Side Rendering
- **ISR**: Incremental Static Regeneration
- **JWT**: JSON Web Token
- **OCR**: Optical Character Recognition
- **MRR**: Monthly Recurring Revenue
- **DAU/MAU**: Daily/Monthly Active Users

### 13.2 External Documentation Links

- [Next.js Docs](https://nextjs.org/docs)
- [pdf-lib](https://pdf-lib.js.org/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Razorpay API](https://razorpay.com/docs)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Drizzle ORM](https://orm.drizzle.team/)

### 13.3 Estimated Development Effort

| Phase | Duration | Effort |
|-------|----------|--------|
| Setup & Foundation | 1 week | 40 hours |
| Core 6 Tools (MVP) | 3 weeks | 120 hours |
| Auth + Dashboard | 1 week | 40 hours |
| Payments | 1 week | 40 hours |
| 14 More Tools | 4 weeks | 160 hours |
| Polish + SEO | 1 week | 40 hours |
| **TOTAL MVP** | **8 weeks** | **440 hours** |

---

# 📦 SUMMARY & NEXT STEPS

You now have:

1. ✅ **Feature Specification Document** — What to build
2. ✅ **Technical Implementation Document** — How to build it

### **Save These Documents:**
- Create a `docs/` folder in your GitHub repo
- Save FSD as `docs/FEATURE_SPEC.md`
- Save TID as `docs/TECHNICAL_IMPLEMENTATION.md`
- Reference them throughout development

### **Your Next Steps:**

1. **Today**: Read both documents thoroughly
2. **Tomorrow**: Set up development environment
3. **Day 3**: Initialize project with `npx create-next-app`
4. **Week 1**: Build foundation + first tool (Merge PDF)

---
