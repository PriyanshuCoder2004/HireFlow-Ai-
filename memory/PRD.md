# HireFlow AI - Product Requirements Document

## Original Problem Statement
Create a full-stack web application called "HireFlow AI" with user authentication, database integration, and deployment. Use a clean, professional dashboard UI.

## User Choices
- **Core Purpose**: AI-assisted resume builder/analyzer with job application tracking
- **AI Features**: Resume analysis/scoring, Job description matching, AI-generated cover letters
- **Dashboard Features**: Job application tracking with status updates, Analytics/statistics dashboard, Calendar integration for interviews
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
- Calendar for interview scheduling
- Analytics dashboard
- Light/Dark theme toggle

## What's Been Implemented (January 2025)

### Backend (FastAPI + MongoDB)
- ✅ User Authentication: Register, Login, JWT tokens
- ✅ Resume API: Create, Read, Delete, AI Analysis/Scoring, File Upload (PDF/DOCX)
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
- ✅ Calendar API: Event CRUD for interview scheduling
- ✅ Analytics API: Stats aggregation

### Frontend (React + Tailwind + Shadcn UI)
- ✅ Landing Page: Hero section, features, stats, CTA
- ✅ Auth Pages: Login and Register with form validation
- ✅ Dashboard: Overview with stats, recent applications, quick actions
- ✅ Resumes Page: Create, upload (PDF/DOCX), view, AI analyze with scoring
- ✅ Job Match Page: Enhanced resume-to-job analysis with history
- ✅ Applications Page: Table/Card views, search, filters, CRUD dialogs
- ✅ Cover Letters Page: AI generation, view, copy, delete
- ✅ Calendar Page: Calendar component, event management
- ✅ Settings Page: Profile info, theme toggle, notifications

### Design System
- Electric Obsidian theme (dark/light)
- Manrope (headings) + Inter (body) fonts
- Shadcn UI components
- Responsive design
- Glass morphism effects

## Prioritized Backlog

### P0 (Critical)
- ✅ All P0 features implemented

### P1 (High Priority)
- [x] Resume file upload (PDF/DOCX parsing) - Completed Jan 2025
- [ ] Interview preparation assistant (Phase 2)
- [ ] Email notifications for interview reminders

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

## Next Tasks
1. Add resume file upload with PDF text extraction
2. Implement interview preparation assistant
3. Add email notifications
4. Enhance job matching with detailed recommendations
