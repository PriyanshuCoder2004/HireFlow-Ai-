# 🚀 HireFlow AI

**HireFlow AI** is a full-stack AI-powered job search assistant designed to help users streamline and optimize their job application process.

It provides intelligent tools for **resume analysis, job application tracking, interview preparation, and AI-generated cover letters** — all within a modern and professional dashboard UI.

---

# 🎯 Project Overview

HireFlow AI helps job seekers manage their entire job search workflow in one place.

The platform combines **AI insights with productivity tools** to help users:

* Analyze resumes using AI
* Track job applications
* Generate personalized cover letters
* Prepare for interviews
* Schedule interviews with automated reminders
* Monitor job search analytics

---

# 👥 User Personas

### 💼 Job Seekers

Primary users actively applying for jobs who want better organization and resume insights.

### 🔄 Career Changers

Professionals transitioning to new industries who need resume optimization and skill gap analysis.

### 🎓 Recent Graduates

Entry-level candidates preparing resumes and interviews for their first job.

---

# 🧠 Core Features

## 🔐 Authentication System

* User registration and login
* Secure authentication using **JWT**
* Password hashing using **bcrypt**

---

## 📄 Resume Management

Users can upload and analyze resumes.

### Features

* Upload resumes (**PDF / DOCX**)
* Extract resume text automatically
* AI-powered resume scoring
* Resume improvement suggestions

### OCR Fallback

For scanned or image-based resumes:

* **Tesseract OCR**
* **pdf2image**

Extraction metadata stored:

* extraction method (parser / OCR)
* extraction status (success / partial / failed)

---

## 📊 Job Application Tracker

Manage all job applications in one place.

### Features

* Create applications
* Update application status
* Delete applications
* Filter and search applications
* Track stages (Applied → Interview → Offer)

---

## ✉️ AI Cover Letter Generator

Generate tailored cover letters instantly.

### Features

* Uses **resume + job description context**
* ATS-friendly formatting
* 250–400 word professional tone
* Export cover letters as **PDF**

### API Endpoints

```
POST /api/cover-letter/generate
GET /api/cover-letter
GET /api/cover-letter/{id}
PUT /api/cover-letter/{id}
DELETE /api/cover-letter/{id}
GET /api/cover-letter/{id}/pdf
```

---

## 🧠 Resume–Job Match Analysis

Compare a resume against a job description.

### Output Includes

* Match score (0–100)
* Skill match analysis
* Missing skills detection
* Experience match scoring
* Weak areas identification
* Keyword analysis
* Actionable improvement suggestions

All results are stored and retrievable from history.

---

## 🎤 Interview Preparation Assistant

AI generates role-specific interview preparation materials.

### Includes

* Technical questions
* Behavioral questions
* STAR method guidance
* Suggested answer structure

All preparation sessions are saved in the database.

---

## 📅 Interview Calendar & Scheduling

Schedule interviews directly from the dashboard.

### Features

* Interview event creation
* Interview type selection
* Meeting link support (Zoom / Meet / Teams)
* Link events to job applications
* Email reminder system

### Interview Types

* HR
* Technical
* Managerial
* Final
* Panel
* Other

---

## 📧 Automated Email Reminder System

Automated interview reminders are sent via email.

### Features

* **24-hour reminder**
* **1-hour reminder**
* Email delivery via **Resend API**

### Background Job

Uses **APScheduler** to check upcoming interviews every **5 minutes**.

Additional features:

* Prevent duplicate reminder emails
* Reminder status tracking
* Notification logs stored in database

---

# 📈 Analytics Dashboard

Users can monitor their job search performance.

### Metrics

* Total applications
* Interview rate
* Application status breakdown
* Activity statistics

---

# 🖥️ Frontend

Built using **React + Tailwind + Shadcn UI**.

### Pages Included

* Landing Page
* Login / Register
* Dashboard Overview
* Resume Management
* Job Match Analysis
* Interview Preparation
* Applications Tracker
* Cover Letter Generator
* Interview Calendar
* Settings Page

---

# 🎨 Design System

HireFlow AI uses a modern UI system.

### Design Features

* 🌙 Light / Dark theme toggle
* ⚡ Electric Obsidian theme
* 🧩 Shadcn UI components
* 📱 Fully responsive design
* ✨ Glassmorphism UI effects

### Fonts

* **Manrope** – Headings
* **Inter** – Body text

---

# 🏗️ Technical Architecture

## 🧰 Tech Stack

### Backend

* FastAPI
* Python 3.11
* MongoDB (Motor async driver)

### Frontend

* React 18
* Tailwind CSS
* Shadcn UI

### Authentication

* JWT tokens
* bcrypt password hashing

### AI Integration

* Emergent LLM Key (OpenAI GPT-5.2)

### Text Extraction

* PyPDF2
* python-docx
* Tesseract OCR
* pdf2image

### Background Jobs

* APScheduler (AsyncIOScheduler)

### Email Service

* Resend API

---

# 🗄️ Database Collections

| Collection        | Purpose                    |
| ----------------- | -------------------------- |
| users             | User accounts              |
| resumes           | Uploaded resume data       |
| applications      | Job applications           |
| cover_letters     | Generated cover letters    |
| job_matches       | Resume-job match analysis  |
| interview_preps   | Interview preparation data |
| calendar_events   | Interview scheduling       |
| notification_logs | Email delivery tracking    |

---

# 🔗 Key API Endpoints

### Authentication

```
/api/auth/register
/api/auth/login
/api/auth/me
```

### Resume APIs

```
/api/resumes
/api/resumes/upload
/api/resumes/{id}/analyze
```

### Applications

```
/api/applications
```

### AI Features

```
/api/match/analyze
/api/match/history
/api/interview-prep/generate
/api/interview-prep
```

### Calendar

```
/api/calendar
/api/calendar/{id}/test-reminder
```

### Notifications

```
/api/notifications/logs
```

### Analytics

```
/api/analytics/stats
```

---

# 🆕 Recent Updates (Feb 2025)

## 📧 Email Reminder System

Implemented:

* APScheduler background scheduler
* Automated reminder emails
* HTML email templates
* Notification history logging

---

## 🐞 Bug Fixes

### Reminder Toggle Fix

Emails are no longer sent when reminders are disabled.

### Scheduler Fix

Resolved automated scheduler not triggering reminders.

Improvements include:

* Proper timezone-aware datetime parsing
* Debug logging
* Race condition prevention
* Improved MongoDB filtering

---

# 🛠️ Debug Endpoints (Development Only)

Available only when:

```
DEBUG_MODE=true
```

Endpoints:

```
GET /api/debug/scheduler
POST /api/debug/scheduler/trigger
```

Used for monitoring and manually triggering reminder checks.

---

# 🧾 Calendar Page Enhancements

* Interview type dropdown
* Meeting link input
* Job application linking
* Reminder toggle UI
* Reminder status indicators
* "Send Test Reminder" button

---

# 🧪 Interview Prep Dialog Fix

Resolved issue where dialog failed to open on first click.

Fix included:

* Conditional rendering
* Guard clause for data validation

---

# 📌 Next Development Tasks

### High Priority

* Settings page for managing reminder preferences

### Improvements

* UI polish for interview calendar
* Backend refactor

---

# 🧱 Planned Backend Refactor

Currently the backend uses a single file:

```
backend/server.py
```

Future refactoring will split logic into modular routers:

* auth_router
* resume_router
* applications_router
* calendar_router
* analytics_router

This will improve maintainability and scalability.

---

# 📊 Project Status

### ✅ Completed

* Authentication
* Resume analysis
* Job tracking
* Cover letter generation
* Interview preparation
* Interview calendar
* Email reminder system
* Analytics dashboard

### 🔧 Remaining

* Settings UI for notifications
* Backend modular refactor

---

# 📄 License

This project is intended for **educational and portfolio purposes**.

