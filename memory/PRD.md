# HireFlow AI - Product Requirements Document

## Original Problem Statement
Create a full-stack web application called "HireFlow AI" with user authentication, database integration, and deployment. Use a clean, professional dashboard UI.

## User Choices
- **Core Purpose**: AI-assisted resume builder/analyzer with job application tracking
- **AI Features**: Resume analysis/scoring, Job description matching, AI-generated cover letters, Interview preparation assistant
- **Dashboard Features**: Job application tracking with status updates, Analytics/statistics dashboard, Calendar integration for interviews with email reminders
- **Design**: Both light and dark theme (user toggleable)
- **AI Provider**: Emergent LLM key (universal key for OpenAI GPT-5.2)

## User Personas
1. **Job Seekers**: Primary users looking to optimize their job search process
2. **Career Changers**: Professionals transitioning careers who need resume feedback
3. **Recent Graduates**: Entry-level candidates seeking their first job

## Core Requirements (Static)
- User authentication (register/login with JWT)
- Resume management with AI analysis/scoring
- Job application tracking with CRUD operations
- AI-powered cover letter generation
- Calendar for interview scheduling with email reminders
- Analytics dashboard
- Light/Dark theme toggle

---

## What's Been Implemented

### Backend (FastAPI + MongoDB)
- ✅ User Authentication: Register, Login, JWT tokens
- ✅ Resume API: Create, Read, Delete, AI Analysis/Scoring, File Upload (PDF/DOCX)
  - OCR fallback for scanned/image-based resumes (Tesseract + pdf2image)
  - Extraction metadata: method (parser/ocr), status (success/partial/failed)
- ✅ Job Applications API: Full CRUD with status tracking and filtering
- ✅ Cover Letter Generator: AI-powered generation with optional resume context
- ✅ Job Match Analysis: Enhanced resume-to-job matching with comprehensive analysis
  - Match score (0-100)
  - Skill match analysis (matched/partial/missing)
  - Experience match scoring
  - Missing skills identification
  - Weak areas detection
  - Actionable suggestions
  - Keyword analysis
  - Stored in database, retrievable via history
- ✅ Interview Prep: AI-generated questions with STAR guidance, stored in DB
- ✅ Calendar API: Event CRUD for interview scheduling with reminder fields
- ✅ **Email Notification System** (Completed Feb 2025):
  - APScheduler running every 5 minutes to check for upcoming interviews
  - 24-hour and 1-hour reminder emails via Resend API
  - Professional HTML email templates with interview details
  - Notification logs stored in database
  - Test reminder endpoint for manual testing
  - Reminder flags (reminder_24hr_sent, reminder_1hr_sent) prevent duplicate sends
- ✅ Analytics API: Stats aggregation

### Frontend (React + Tailwind + Shadcn UI)
- ✅ Landing Page: Hero section, features, stats, CTA
- ✅ Auth Pages: Login and Register with form validation
- ✅ Dashboard: Overview with stats, recent applications, quick actions
- ✅ Resumes Page: Create, upload (PDF/DOCX), view, AI analyze with scoring
- ✅ Job Match Page: Enhanced resume-to-job analysis with history
- ✅ Interview Prep Page: AI-generated interview questions with STAR guidance
  - Fixed dialog opening issue with conditional render
- ✅ Applications Page: Table/Card views, search, filters, CRUD dialogs
- ✅ Cover Letters Page: AI generation, view, copy, delete
- ✅ **Calendar Page** (Enhanced Feb 2025):
  - Interview type selector (HR, Technical, Managerial, Final, Panel, Other)
  - Meeting link input for Zoom/Meet/Teams URLs
  - Link events to job applications
  - Email reminders toggle with visual indicator
  - Reminder status display (24hr pending/sent, 1hr pending/sent)
  - Send Test Reminder button for testing
  - Full event CRUD with date/time pickers
- ✅ Settings Page: Profile info, theme toggle, notifications

### Design System
- Electric Obsidian theme (dark/light)
- Manrope (headings) + Inter (body) fonts
- Shadcn UI components
- Responsive design
- Glass morphism effects

---

## Prioritized Backlog

### P0 (Critical)
- ✅ All P0 features implemented

### P1 (High Priority)
- ✅ Resume file upload (PDF/DOCX parsing) - Completed Jan 2025
- ✅ Interview preparation assistant - Completed Jan 2025
- ✅ Email notifications for interview reminders - Completed Feb 2025
- [ ] Settings page for reminder preferences (enable/disable specific reminder types)

### P2 (Medium Priority)
- [ ] Bulk application import
- [ ] Export applications to CSV
- [ ] Resume templates
- [ ] Password change functionality
- [ ] Account deletion

### P3 (Nice to Have)
- [ ] Social login (Google)
- [ ] Mobile app
- [ ] Browser extension for quick apply tracking
- [ ] AI interview practice with voice
- [ ] AI-powered job board scraping
- [ ] AI feedback on user-provided interview answers
- [ ] Export interview prep notes as PDF

---

## Technical Architecture

### Tech Stack
- **Backend**: FastAPI, Python 3.11, MongoDB (motor async driver)
- **Frontend**: React 18, Tailwind CSS, Shadcn UI
- **Authentication**: JWT tokens with bcrypt password hashing
- **AI**: Emergent LLM Key (OpenAI GPT-5.2)
- **Text Extraction**: PyPDF2, python-docx, Pytesseract (OCR), pdf2image
- **Background Jobs**: APScheduler (AsyncIOScheduler)
- **Email**: Resend API

### Key API Endpoints
- `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- `/api/resumes`, `/api/resumes/upload`, `/api/resumes/{id}/analyze`
- `/api/applications` (CRUD)
- `/api/cover-letters/generate`
- `/api/match/analyze`, `/api/match/history`
- `/api/interview-prep/generate`, `/api/interview-prep`
- `/api/calendar` (CRUD), `/api/calendar/{id}/test-reminder`
- `/api/notifications/logs`
- `/api/analytics/stats`

### Database Collections
- `users`: User accounts with hashed passwords
- `resumes`: Resume content with extraction metadata
- `applications`: Job application tracking
- `cover_letters`: Generated cover letters
- `job_matches`: Resume-job match analyses
- `interview_preps`: Generated interview preparations
- `calendar_events`: Scheduled interviews with reminder flags
- `notification_logs`: Email delivery tracking

---

## Recent Changes (Feb 2025)

### Email Notification System
- Implemented APScheduler background job running every 5 minutes
- Added `send_interview_reminder` function with Resend API integration
- Created professional HTML email template with interview details
- Added `/api/calendar/{id}/test-reminder` endpoint for manual testing
- Added `/api/notifications/logs` endpoint for viewing notification history
- Calendar events now store: `reminders_enabled`, `reminder_24hr_sent`, `reminder_1hr_sent`
- **Bug Fix (Feb 2025)**: Fixed reminder toggle bug - emails no longer sent when reminders disabled
  - Setting reminder flags to True when disabling prevents scheduler from picking up events
  - Using explicit `$eq: True` in MongoDB queries ensures only enabled events are fetched
  - Re-fetching event in process_reminder before sending prevents race conditions

### Calendar Page Enhancements
- Added interview type dropdown (HR, Technical, Managerial, Final, Panel, Other)
- Added meeting link input field
- Added job application linking dropdown
- Added email reminders toggle with visual feedback
- Added reminder status section showing sent/pending status
- Added "Send Test Reminder" button in edit dialog

### Interview Prep Dialog Fix
- Fixed dialog not opening on first click by wrapping with conditional render
- Added guard clause in click handler to ensure prep data exists

---

## Next Tasks
1. Add Settings page UI for managing notification preferences
2. UI polish for calendar interview scheduling
3. Consider refactoring `backend/server.py` into modular routers
