from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status, Form, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import re
import tempfile
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import PyPDF2
from docx import Document
import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image
import resend
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'hireflow_ai_secret_key_2025')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Email Configuration (Resend)
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

app = FastAPI(title="HireFlow AI API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Background Scheduler for email reminders
scheduler = AsyncIOScheduler()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class ResumeCreate(BaseModel):
    content: str
    title: str

class ResumeResponse(BaseModel):
    id: str
    user_id: str
    title: str
    content: str
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    extraction_method: Optional[str] = None  # "parser" or "ocr"
    extraction_status: Optional[str] = None  # "success" or "partial" or "failed"
    ocr_used: bool = False
    analysis: Optional[dict] = None
    score: Optional[int] = None
    created_at: str
    updated_at: str

class JobApplicationCreate(BaseModel):
    company: str
    position: str
    job_url: Optional[str] = None
    job_description: Optional[str] = None
    status: str = "applied"
    notes: Optional[str] = None
    applied_date: Optional[str] = None

class JobApplicationUpdate(BaseModel):
    company: Optional[str] = None
    position: Optional[str] = None
    job_url: Optional[str] = None
    job_description: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class JobApplicationResponse(BaseModel):
    id: str
    user_id: str
    company: str
    position: str
    job_url: Optional[str] = None
    job_description: Optional[str] = None
    status: str
    notes: Optional[str] = None
    applied_date: str
    created_at: str
    updated_at: str

class CoverLetterRequest(BaseModel):
    job_description: str
    company_name: str
    position: str
    resume_id: Optional[str] = None

class CoverLetterResponse(BaseModel):
    id: str
    user_id: str
    company_name: str
    position: str
    content: str
    created_at: str

class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str = "interview"  # interview, phone_screen, video_call, follow_up, other
    interview_type: Optional[str] = None  # hr, technical, managerial, final, other
    start_date: str
    end_date: Optional[str] = None
    job_application_id: Optional[str] = None
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    notes: Optional[str] = None
    reminders_enabled: bool = True
    reminder_24hr_sent: bool = False
    reminder_1hr_sent: bool = False

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    interview_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    notes: Optional[str] = None
    reminders_enabled: Optional[bool] = None

class CalendarEventResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    event_type: str
    interview_type: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    job_application_id: Optional[str] = None
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    notes: Optional[str] = None
    reminders_enabled: bool = True
    reminder_24hr_sent: bool = False
    reminder_1hr_sent: bool = False
    created_at: str

# ===================== NOTIFICATION MODELS =====================

class NotificationLog(BaseModel):
    id: str
    user_id: str
    event_id: str
    job_application_id: Optional[str] = None
    reminder_type: str  # "24hr" or "1hr"
    delivery_status: str  # "sent", "failed", "pending"
    error_message: Optional[str] = None
    sent_timestamp: Optional[str] = None
    created_at: str

class NotificationPreferences(BaseModel):
    email_reminders_enabled: bool = True
    reminder_24hr: bool = True
    reminder_1hr: bool = True

class MatchRequest(BaseModel):
    resume_id: str
    job_description: str
    job_title: Optional[str] = None
    company_name: Optional[str] = None

class MatchAnalysis(BaseModel):
    match_score: int
    skill_match: dict
    experience_match: dict
    missing_skills: List[str]
    weak_areas: List[str]
    strengths: List[str]
    suggestions: List[str]
    keyword_analysis: dict
    summary: str

class JobMatchResponse(BaseModel):
    id: str
    user_id: str
    resume_id: str
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    job_description: str
    analysis: MatchAnalysis
    created_at: str

class MatchResponse(BaseModel):
    match_score: int
    strengths: List[str]
    gaps: List[str]
    suggestions: List[str]

# ===================== INTERVIEW PREP MODELS =====================

class InterviewQuestion(BaseModel):
    question: str
    category: str  # "hr_behavioral", "technical", "scenario"
    difficulty: str  # "easy", "medium", "hard"
    guidance: List[str]  # STAR method hints or bullet points
    sample_points: List[str]  # Key points to cover

class WeakArea(BaseModel):
    topic: str
    reason: str
    preparation_tips: List[str]
    resources: Optional[List[str]] = None

class InterviewPrepAnalysis(BaseModel):
    hr_behavioral_questions: List[InterviewQuestion]
    technical_questions: List[InterviewQuestion]
    scenario_questions: List[InterviewQuestion]
    weak_areas: List[WeakArea]
    general_tips: List[str]
    company_research_points: List[str]
    questions_to_ask: List[str]

class InterviewPrepRequest(BaseModel):
    application_id: str
    resume_id: str
    include_match_analysis: bool = True

class InterviewPrepResponse(BaseModel):
    id: str
    user_id: str
    application_id: str
    resume_id: str
    job_title: str
    company_name: str
    analysis: InterviewPrepAnalysis
    match_score: Optional[int] = None
    created_at: str
    updated_at: str

# ===================== HELPERS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_llm_response(system_message: str, user_message: str) -> str:
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        message = UserMessage(text=user_message)
        response = await chat.send_message(message)
        return response
    except Exception as e:
        logger.error(f"LLM error: {e}")
        raise HTTPException(status_code=500, detail="AI service temporarily unavailable")

# ===================== FILE TEXT EXTRACTION WITH OCR =====================

# Minimum character threshold for valid text extraction
MIN_TEXT_LENGTH = 100
MIN_WORD_COUNT = 20

class ExtractionResult:
    """Result of text extraction with metadata"""
    def __init__(self, text: str, method: str, status: str, ocr_used: bool = False):
        self.text = text
        self.method = method  # "parser" or "ocr"
        self.status = status  # "success", "partial", "failed"
        self.ocr_used = ocr_used

def is_text_readable(text: str) -> bool:
    """Check if extracted text is readable and meaningful"""
    if not text or len(text.strip()) < MIN_TEXT_LENGTH:
        return False
    
    # Count words (at least MIN_WORD_COUNT readable words)
    words = re.findall(r'\b[a-zA-Z]{2,}\b', text)
    if len(words) < MIN_WORD_COUNT:
        return False
    
    # Check for high ratio of special characters (might indicate garbled text)
    alpha_ratio = len(re.findall(r'[a-zA-Z]', text)) / len(text) if text else 0
    if alpha_ratio < 0.3:  # Less than 30% alphabetic characters
        return False
    
    return True

def extract_text_from_pdf_parser(file_content: bytes) -> str:
    """Extract text content from PDF using PyPDF2 parser"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text_content = []
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_content.append(page_text)
        return "\n".join(text_content).strip()
    except Exception as e:
        logger.error(f"PDF parser extraction error: {e}")
        return ""

def extract_text_from_pdf_ocr(file_content: bytes) -> str:
    """Extract text from PDF using OCR (for scanned/image-based PDFs)"""
    try:
        # Convert PDF pages to images
        images = convert_from_bytes(file_content, dpi=300)
        
        text_content = []
        for i, image in enumerate(images):
            # Use Tesseract OCR on each page image
            page_text = pytesseract.image_to_string(image, lang='eng')
            if page_text and page_text.strip():
                text_content.append(page_text.strip())
            logger.info(f"OCR processed page {i+1}/{len(images)}")
        
        return "\n\n".join(text_content).strip()
    except Exception as e:
        logger.error(f"PDF OCR extraction error: {e}")
        return ""

def extract_text_from_image_ocr(file_content: bytes) -> str:
    """Extract text from image file using OCR"""
    try:
        image = Image.open(io.BytesIO(file_content))
        text = pytesseract.image_to_string(image, lang='eng')
        return text.strip()
    except Exception as e:
        logger.error(f"Image OCR extraction error: {e}")
        return ""

def extract_text_from_pdf(file_content: bytes) -> ExtractionResult:
    """Extract text from PDF with OCR fallback"""
    # Step 1: Try standard PDF text extraction
    logger.info("Attempting PDF text extraction with parser...")
    parser_text = extract_text_from_pdf_parser(file_content)
    
    if is_text_readable(parser_text):
        logger.info(f"Parser extraction successful: {len(parser_text)} chars")
        return ExtractionResult(
            text=parser_text,
            method="parser",
            status="success",
            ocr_used=False
        )
    
    # Step 2: Parser failed or text unreadable, try OCR
    logger.info("Parser extraction insufficient, attempting OCR fallback...")
    ocr_text = extract_text_from_pdf_ocr(file_content)
    
    if is_text_readable(ocr_text):
        logger.info(f"OCR extraction successful: {len(ocr_text)} chars")
        return ExtractionResult(
            text=ocr_text,
            method="ocr",
            status="success",
            ocr_used=True
        )
    
    # Step 3: Both methods produced some text but below threshold
    # Return the better result with partial status
    if len(ocr_text) > len(parser_text):
        if ocr_text:
            return ExtractionResult(
                text=ocr_text,
                method="ocr",
                status="partial",
                ocr_used=True
            )
    elif parser_text:
        return ExtractionResult(
            text=parser_text,
            method="parser",
            status="partial",
            ocr_used=False
        )
    
    # Step 4: Complete failure
    return ExtractionResult(
        text="",
        method="failed",
        status="failed",
        ocr_used=True
    )

def extract_text_from_docx(file_content: bytes) -> ExtractionResult:
    """Extract text content from DOCX file"""
    try:
        doc = Document(io.BytesIO(file_content))
        text_content = []
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_content.append(paragraph.text)
        # Also extract text from tables
        for table in doc.tables:
            for row in table.rows:
                row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_text:
                    text_content.append(" | ".join(row_text))
        
        text = "\n".join(text_content).strip()
        
        if is_text_readable(text):
            return ExtractionResult(
                text=text,
                method="parser",
                status="success",
                ocr_used=False
            )
        elif text:
            return ExtractionResult(
                text=text,
                method="parser",
                status="partial",
                ocr_used=False
            )
        else:
            return ExtractionResult(
                text="",
                method="failed",
                status="failed",
                ocr_used=False
            )
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        return ExtractionResult(
            text="",
            method="failed",
            status="failed",
            ocr_used=False
        )

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    
    return TokenResponse(
        token=token,
        user=UserResponse(id=user_id, email=user_data.email, name=user_data.name, created_at=now)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    return TokenResponse(
        token=token,
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ===================== RESUME ROUTES =====================

@api_router.post("/resumes", response_model=ResumeResponse)
async def create_resume(resume_data: ResumeCreate, current_user: dict = Depends(get_current_user)):
    resume_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    resume_doc = {
        "id": resume_id,
        "user_id": current_user["id"],
        "title": resume_data.title,
        "content": resume_data.content,
        "file_name": None,
        "file_type": None,
        "extraction_method": "manual",
        "extraction_status": "success",
        "ocr_used": False,
        "analysis": None,
        "score": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.resumes.insert_one(resume_doc)
    return ResumeResponse(**{k: v for k, v in resume_doc.items() if k != "_id"})

@api_router.post("/resumes/upload", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    title: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a PDF or DOCX resume file and extract text content with OCR fallback"""
    # Validate file type
    allowed_types = {
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "application/msword": "doc",
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg"
    }
    
    content_type = file.content_type
    if content_type not in allowed_types:
        # Also check by file extension
        file_ext = file.filename.lower().split(".")[-1] if file.filename else ""
        if file_ext not in ["pdf", "docx", "doc", "png", "jpg", "jpeg"]:
            raise HTTPException(
                status_code=400, 
                detail="Invalid file type. Please upload a PDF, DOCX, or image file."
            )
        file_type = file_ext
    else:
        file_type = allowed_types[content_type]
    
    # Read file content
    file_content = await file.read()
    
    # Check file size (max 10MB)
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    # Extract text based on file type with OCR fallback
    extraction_result = None
    
    if file_type == "pdf":
        logger.info(f"Processing PDF file: {file.filename}")
        extraction_result = extract_text_from_pdf(file_content)
    elif file_type in ["docx", "doc"]:
        logger.info(f"Processing DOCX file: {file.filename}")
        extraction_result = extract_text_from_docx(file_content)
    elif file_type in ["png", "jpg", "jpeg"]:
        logger.info(f"Processing image file with OCR: {file.filename}")
        ocr_text = extract_text_from_image_ocr(file_content)
        if is_text_readable(ocr_text):
            extraction_result = ExtractionResult(
                text=ocr_text,
                method="ocr",
                status="success",
                ocr_used=True
            )
        elif ocr_text:
            extraction_result = ExtractionResult(
                text=ocr_text,
                method="ocr",
                status="partial",
                ocr_used=True
            )
        else:
            extraction_result = ExtractionResult(
                text="",
                method="failed",
                status="failed",
                ocr_used=True
            )
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format")
    
    # Handle extraction failures
    if extraction_result.status == "failed":
        raise HTTPException(
            status_code=400, 
            detail="Could not extract text from the file. Please upload an ATS-friendly resume (searchable PDF or DOCX) with clear, readable text."
        )
    
    # Warn about partial extraction but still process
    if extraction_result.status == "partial" and len(extraction_result.text) < 50:
        raise HTTPException(
            status_code=400, 
            detail="Extracted text is too short. Please upload a resume with more content, preferably in DOCX or searchable PDF format."
        )
    
    # Create resume record with extraction metadata
    resume_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    resume_doc = {
        "id": resume_id,
        "user_id": current_user["id"],
        "title": title,
        "content": extraction_result.text,
        "file_name": file.filename,
        "file_type": file_type,
        "extraction_method": extraction_result.method,
        "extraction_status": extraction_result.status,
        "ocr_used": extraction_result.ocr_used,
        "analysis": None,
        "score": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.resumes.insert_one(resume_doc)
    
    log_msg = f"Resume uploaded: {file.filename} | Method: {extraction_result.method} | OCR: {extraction_result.ocr_used} | Status: {extraction_result.status} | Chars: {len(extraction_result.text)}"
    logger.info(log_msg)
    
    return ResumeResponse(**{k: v for k, v in resume_doc.items() if k != "_id"})

@api_router.get("/resumes", response_model=List[ResumeResponse])
async def get_resumes(current_user: dict = Depends(get_current_user)):
    resumes = await db.resumes.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return [ResumeResponse(**r) for r in resumes]

@api_router.get("/resumes/{resume_id}", response_model=ResumeResponse)
async def get_resume(resume_id: str, current_user: dict = Depends(get_current_user)):
    resume = await db.resumes.find_one({"id": resume_id, "user_id": current_user["id"]}, {"_id": 0})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return ResumeResponse(**resume)

@api_router.post("/resumes/{resume_id}/analyze", response_model=ResumeResponse)
async def analyze_resume(resume_id: str, current_user: dict = Depends(get_current_user)):
    resume = await db.resumes.find_one({"id": resume_id, "user_id": current_user["id"]}, {"_id": 0})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    system_msg = """You are an expert resume analyst. Analyze the resume and provide:
1. An overall score from 0-100
2. Key strengths (list 3-5)
3. Areas for improvement (list 3-5)
4. Industry keywords present
5. Formatting suggestions

Respond in JSON format:
{
    "score": <number>,
    "strengths": ["..."],
    "improvements": ["..."],
    "keywords": ["..."],
    "formatting_tips": ["..."],
    "summary": "..."
}"""
    
    response = await get_llm_response(system_msg, f"Analyze this resume:\n\n{resume['content']}")
    
    try:
        import json
        # Clean the response - remove markdown code blocks if present
        clean_response = response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        if clean_response.startswith("```"):
            clean_response = clean_response[3:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        analysis = json.loads(clean_response.strip())
        score = analysis.get("score", 70)
    except:
        analysis = {"summary": response, "score": 70}
        score = 70
    
    now = datetime.now(timezone.utc).isoformat()
    await db.resumes.update_one(
        {"id": resume_id},
        {"$set": {"analysis": analysis, "score": score, "updated_at": now}}
    )
    
    resume["analysis"] = analysis
    resume["score"] = score
    resume["updated_at"] = now
    return ResumeResponse(**resume)

@api_router.delete("/resumes/{resume_id}")
async def delete_resume(resume_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.resumes.delete_one({"id": resume_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"message": "Resume deleted"}

# ===================== JOB APPLICATION ROUTES =====================

@api_router.post("/applications", response_model=JobApplicationResponse)
async def create_application(app_data: JobApplicationCreate, current_user: dict = Depends(get_current_user)):
    app_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    applied_date = app_data.applied_date or now
    
    app_doc = {
        "id": app_id,
        "user_id": current_user["id"],
        "company": app_data.company,
        "position": app_data.position,
        "job_url": app_data.job_url,
        "job_description": app_data.job_description,
        "status": app_data.status,
        "notes": app_data.notes,
        "applied_date": applied_date,
        "created_at": now,
        "updated_at": now
    }
    
    await db.applications.insert_one(app_doc)
    return JobApplicationResponse(**{k: v for k, v in app_doc.items() if k != "_id"})

@api_router.get("/applications", response_model=List[JobApplicationResponse])
async def get_applications(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if status:
        query["status"] = status
    applications = await db.applications.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [JobApplicationResponse(**a) for a in applications]

@api_router.get("/applications/{app_id}", response_model=JobApplicationResponse)
async def get_application(app_id: str, current_user: dict = Depends(get_current_user)):
    application = await db.applications.find_one({"id": app_id, "user_id": current_user["id"]}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return JobApplicationResponse(**application)

@api_router.put("/applications/{app_id}", response_model=JobApplicationResponse)
async def update_application(app_id: str, app_data: JobApplicationUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in app_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.applications.update_one(
        {"id": app_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    
    updated = await db.applications.find_one({"id": app_id}, {"_id": 0})
    return JobApplicationResponse(**updated)

@api_router.delete("/applications/{app_id}")
async def delete_application(app_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.applications.delete_one({"id": app_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Application deleted"}

# ===================== COVER LETTER ROUTES =====================

@api_router.post("/cover-letters/generate", response_model=CoverLetterResponse)
async def generate_cover_letter(request: CoverLetterRequest, current_user: dict = Depends(get_current_user)):
    resume_content = ""
    if request.resume_id:
        resume = await db.resumes.find_one({"id": request.resume_id, "user_id": current_user["id"]}, {"_id": 0})
        if resume:
            resume_content = resume.get("content", "")
    
    system_msg = """You are an expert cover letter writer. Write a professional, compelling cover letter that:
1. Is tailored to the specific job and company
2. Highlights relevant experience and skills
3. Shows enthusiasm for the role
4. Is concise (300-400 words)
5. Has a professional tone but shows personality

Format it properly with greeting, body paragraphs, and professional closing."""

    user_msg = f"""Write a cover letter for:
Company: {request.company_name}
Position: {request.position}
Job Description: {request.job_description}

{"My Resume:" + resume_content if resume_content else ""}"""

    content = await get_llm_response(system_msg, user_msg)
    
    letter_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    letter_doc = {
        "id": letter_id,
        "user_id": current_user["id"],
        "company_name": request.company_name,
        "position": request.position,
        "content": content,
        "created_at": now
    }
    
    await db.cover_letters.insert_one(letter_doc)
    return CoverLetterResponse(**{k: v for k, v in letter_doc.items() if k != "_id"})

@api_router.get("/cover-letters", response_model=List[CoverLetterResponse])
async def get_cover_letters(current_user: dict = Depends(get_current_user)):
    letters = await db.cover_letters.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [CoverLetterResponse(**l) for l in letters]

@api_router.delete("/cover-letters/{letter_id}")
async def delete_cover_letter(letter_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.cover_letters.delete_one({"id": letter_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    return {"message": "Cover letter deleted"}

# ===================== JOB MATCHING ROUTES =====================

@api_router.post("/match/analyze", response_model=JobMatchResponse)
async def analyze_resume_job_match(request: MatchRequest, current_user: dict = Depends(get_current_user)):
    """Enhanced resume-to-job matching with comprehensive analysis stored in database"""
    resume = await db.resumes.find_one({"id": request.resume_id, "user_id": current_user["id"]}, {"_id": 0})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    system_msg = """You are an expert career advisor and resume analyst. Analyze how well the resume matches the job description.

Provide a comprehensive, structured analysis including:
1. Overall match score (0-100) based on skills, experience, and qualifications alignment
2. Skill match analysis - which required skills are present vs missing
3. Experience match - how well the experience level and type matches
4. Missing skills - specific skills from the job that are not in the resume
5. Weak areas - skills mentioned but not strongly demonstrated
6. Strengths - areas where the candidate excels for this role
7. Actionable suggestions - specific, role-targeted improvements
8. Keyword analysis - important keywords from job description found/missing in resume

Respond ONLY in this exact JSON format:
{
    "match_score": <number 0-100>,
    "skill_match": {
        "matched_skills": ["skill1", "skill2"],
        "partial_match": ["skill3"],
        "missing_skills": ["skill4", "skill5"]
    },
    "experience_match": {
        "score": <number 0-100>,
        "analysis": "brief explanation of experience alignment"
    },
    "missing_skills": ["specific skill 1", "specific skill 2"],
    "weak_areas": ["area needing improvement 1", "area 2"],
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "suggestions": [
        "Specific actionable suggestion 1",
        "Specific actionable suggestion 2",
        "Specific actionable suggestion 3"
    ],
    "keyword_analysis": {
        "found": ["keyword1", "keyword2"],
        "missing": ["keyword3", "keyword4"],
        "recommendation": "Add these keywords naturally to your resume"
    },
    "summary": "2-3 sentence summary of the match and key recommendations"
}"""

    job_context = f"Job Title: {request.job_title}\nCompany: {request.company_name}\n" if request.job_title else ""
    
    user_msg = f"""Analyze this resume against the job description:

{job_context}
RESUME CONTENT:
{resume['content']}

JOB DESCRIPTION:
{request.job_description}

Provide detailed, actionable analysis."""

    response = await get_llm_response(system_msg, user_msg)
    
    try:
        import json
        clean_response = response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        if clean_response.startswith("```"):
            clean_response = clean_response[3:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        analysis_data = json.loads(clean_response.strip())
        
        # Ensure all required fields exist with defaults
        analysis = MatchAnalysis(
            match_score=analysis_data.get("match_score", 50),
            skill_match=analysis_data.get("skill_match", {"matched_skills": [], "partial_match": [], "missing_skills": []}),
            experience_match=analysis_data.get("experience_match", {"score": 50, "analysis": "Analysis not available"}),
            missing_skills=analysis_data.get("missing_skills", []),
            weak_areas=analysis_data.get("weak_areas", []),
            strengths=analysis_data.get("strengths", []),
            suggestions=analysis_data.get("suggestions", []),
            keyword_analysis=analysis_data.get("keyword_analysis", {"found": [], "missing": [], "recommendation": ""}),
            summary=analysis_data.get("summary", "Analysis completed")
        )
    except Exception as e:
        logger.error(f"Failed to parse LLM response: {e}")
        analysis = MatchAnalysis(
            match_score=50,
            skill_match={"matched_skills": [], "partial_match": [], "missing_skills": []},
            experience_match={"score": 50, "analysis": "Unable to analyze experience match"},
            missing_skills=["Unable to determine - please try again"],
            weak_areas=[],
            strengths=["Resume content detected"],
            suggestions=["Please try the analysis again for detailed results"],
            keyword_analysis={"found": [], "missing": [], "recommendation": "Retry analysis"},
            summary="Analysis encountered an error. Please try again."
        )
    
    # Store the analysis in database
    match_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    match_doc = {
        "id": match_id,
        "user_id": current_user["id"],
        "resume_id": request.resume_id,
        "job_title": request.job_title,
        "company_name": request.company_name,
        "job_description": request.job_description,
        "analysis": analysis.model_dump(),
        "created_at": now
    }
    
    await db.job_matches.insert_one(match_doc)
    logger.info(f"Job match analysis saved: {match_id} for user {current_user['id']}")
    
    return JobMatchResponse(**{k: v for k, v in match_doc.items() if k != "_id"})

@api_router.get("/match/history", response_model=List[JobMatchResponse])
async def get_match_history(resume_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get all job match analyses for the user, optionally filtered by resume"""
    query = {"user_id": current_user["id"]}
    if resume_id:
        query["resume_id"] = resume_id
    
    matches = await db.job_matches.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [JobMatchResponse(**m) for m in matches]

@api_router.get("/match/{match_id}", response_model=JobMatchResponse)
async def get_match_analysis(match_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific job match analysis"""
    match = await db.job_matches.find_one({"id": match_id, "user_id": current_user["id"]}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match analysis not found")
    return JobMatchResponse(**match)

@api_router.delete("/match/{match_id}")
async def delete_match_analysis(match_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a job match analysis"""
    result = await db.job_matches.delete_one({"id": match_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Match analysis not found")
    return {"message": "Match analysis deleted"}

@api_router.post("/match", response_model=MatchResponse)
async def match_resume_to_job(request: MatchRequest, current_user: dict = Depends(get_current_user)):
    """Legacy simple match endpoint for backward compatibility"""
    resume = await db.resumes.find_one({"id": request.resume_id, "user_id": current_user["id"]}, {"_id": 0})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    system_msg = """You are an expert job matching analyst. Compare the resume to the job description and provide:
1. A match score (0-100)
2. Key strengths that align with the job
3. Gaps or missing qualifications
4. Suggestions to improve the match

Respond in JSON format:
{
    "match_score": <number>,
    "strengths": ["..."],
    "gaps": ["..."],
    "suggestions": ["..."]
}"""

    user_msg = f"""Compare this resume to the job description:

RESUME:
{resume['content']}

JOB DESCRIPTION:
{request.job_description}"""

    response = await get_llm_response(system_msg, user_msg)
    
    try:
        import json
        clean_response = response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        if clean_response.startswith("```"):
            clean_response = clean_response[3:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        data = json.loads(clean_response.strip())
        return MatchResponse(**data)
    except:
        return MatchResponse(
            match_score=70,
            strengths=["Unable to parse detailed analysis"],
            gaps=[],
            suggestions=["Please try again"]
        )

# ===================== CALENDAR ROUTES =====================

@api_router.post("/calendar", response_model=CalendarEventResponse)
async def create_event(event_data: CalendarEventCreate, current_user: dict = Depends(get_current_user)):
    event_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    event_doc = {
        "id": event_id,
        "user_id": current_user["id"],
        "title": event_data.title,
        "description": event_data.description,
        "event_type": event_data.event_type,
        "start_date": event_data.start_date,
        "end_date": event_data.end_date,
        "job_application_id": event_data.job_application_id,
        "location": event_data.location,
        "notes": event_data.notes,
        "created_at": now
    }
    
    await db.calendar_events.insert_one(event_doc)
    return CalendarEventResponse(**{k: v for k, v in event_doc.items() if k != "_id"})

@api_router.get("/calendar", response_model=List[CalendarEventResponse])
async def get_events(month: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    events = await db.calendar_events.find(query, {"_id": 0}).sort("start_date", 1).to_list(500)
    return [CalendarEventResponse(**e) for e in events]

@api_router.put("/calendar/{event_id}", response_model=CalendarEventResponse)
async def update_event(event_id: str, event_data: CalendarEventUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in event_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.calendar_events.update_one(
        {"id": event_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    updated = await db.calendar_events.find_one({"id": event_id}, {"_id": 0})
    return CalendarEventResponse(**updated)

@api_router.delete("/calendar/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.calendar_events.delete_one({"id": event_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}

# ===================== INTERVIEW PREPARATION ROUTES =====================

@api_router.post("/interview-prep/generate", response_model=InterviewPrepResponse)
async def generate_interview_prep(request: InterviewPrepRequest, current_user: dict = Depends(get_current_user)):
    """Generate comprehensive interview preparation based on job application and resume"""
    
    # Get the job application
    application = await db.applications.find_one(
        {"id": request.application_id, "user_id": current_user["id"]}, 
        {"_id": 0}
    )
    if not application:
        raise HTTPException(status_code=404, detail="Job application not found")
    
    # Get the resume
    resume = await db.resumes.find_one(
        {"id": request.resume_id, "user_id": current_user["id"]}, 
        {"_id": 0}
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Optionally get the most recent job match analysis for this resume
    match_analysis = None
    match_score = None
    if request.include_match_analysis:
        match = await db.job_matches.find_one(
            {"user_id": current_user["id"], "resume_id": request.resume_id},
            {"_id": 0}
        )
        if match:
            match_analysis = match.get("analysis", {})
            match_score = match_analysis.get("match_score")
    
    # Build context for AI
    weak_areas_context = ""
    if match_analysis:
        missing_skills = match_analysis.get("missing_skills", [])
        weak_areas = match_analysis.get("weak_areas", [])
        if missing_skills or weak_areas:
            weak_areas_context = f"""
Based on previous analysis, the candidate has these gaps:
- Missing Skills: {', '.join(missing_skills) if missing_skills else 'None identified'}
- Weak Areas: {', '.join(weak_areas) if weak_areas else 'None identified'}

Focus interview questions on these areas to help the candidate prepare.
"""
    
    system_msg = """You are an expert interview coach and career advisor. Generate comprehensive interview preparation materials.

Create a structured interview preparation guide with:

1. HR/Behavioral Questions (5-7 questions):
   - Questions about teamwork, leadership, conflict resolution, career goals
   - Use STAR method guidance (Situation, Task, Action, Result)
   - Include difficulty level

2. Technical Questions (5-8 questions):
   - Based on job requirements and technical skills needed
   - Range from basic to advanced
   - Include hints for answering

3. Scenario-Based Questions (3-5 questions):
   - Real-world problem-solving scenarios
   - Role-specific challenges
   - Include approach guidance

4. Weak Areas to Prepare:
   - Topics the candidate should study
   - Specific preparation tips
   - Learning resources if applicable

5. General Tips:
   - Interview best practices
   - Company-specific advice

6. Company Research Points:
   - What to research about the company
   - Industry trends to know

7. Questions to Ask the Interviewer:
   - Smart questions showing interest and preparation

Respond ONLY in this exact JSON format:
{
    "hr_behavioral_questions": [
        {
            "question": "Tell me about a time...",
            "category": "hr_behavioral",
            "difficulty": "medium",
            "guidance": ["Use STAR method", "Focus on your specific role", "Quantify results"],
            "sample_points": ["Key point 1", "Key point 2"]
        }
    ],
    "technical_questions": [
        {
            "question": "How would you...",
            "category": "technical",
            "difficulty": "medium",
            "guidance": ["Explain concept first", "Give practical example"],
            "sample_points": ["Technical point 1", "Technical point 2"]
        }
    ],
    "scenario_questions": [
        {
            "question": "Imagine you are...",
            "category": "scenario",
            "difficulty": "hard",
            "guidance": ["Break down the problem", "Consider stakeholders"],
            "sample_points": ["Approach step 1", "Approach step 2"]
        }
    ],
    "weak_areas": [
        {
            "topic": "Topic name",
            "reason": "Why this needs preparation",
            "preparation_tips": ["Tip 1", "Tip 2"],
            "resources": ["Resource 1", "Resource 2"]
        }
    ],
    "general_tips": ["Tip 1", "Tip 2"],
    "company_research_points": ["Research point 1", "Research point 2"],
    "questions_to_ask": ["Question 1", "Question 2"]
}"""

    user_msg = f"""Generate interview preparation for:

POSITION: {application.get('position', 'Not specified')}
COMPANY: {application.get('company', 'Not specified')}

JOB DESCRIPTION:
{application.get('job_description', 'No job description provided')}

CANDIDATE'S RESUME:
{resume.get('content', '')}

{weak_areas_context}

Create comprehensive, role-specific interview preparation materials."""

    response = await get_llm_response(system_msg, user_msg)
    
    try:
        import json
        clean_response = response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        if clean_response.startswith("```"):
            clean_response = clean_response[3:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        prep_data = json.loads(clean_response.strip())
        
        # Parse and validate the response
        analysis = InterviewPrepAnalysis(
            hr_behavioral_questions=[InterviewQuestion(**q) for q in prep_data.get("hr_behavioral_questions", [])],
            technical_questions=[InterviewQuestion(**q) for q in prep_data.get("technical_questions", [])],
            scenario_questions=[InterviewQuestion(**q) for q in prep_data.get("scenario_questions", [])],
            weak_areas=[WeakArea(**w) for w in prep_data.get("weak_areas", [])],
            general_tips=prep_data.get("general_tips", []),
            company_research_points=prep_data.get("company_research_points", []),
            questions_to_ask=prep_data.get("questions_to_ask", [])
        )
    except Exception as e:
        logger.error(f"Failed to parse interview prep response: {e}")
        # Provide default structure
        analysis = InterviewPrepAnalysis(
            hr_behavioral_questions=[
                InterviewQuestion(
                    question="Tell me about yourself and why you're interested in this role.",
                    category="hr_behavioral",
                    difficulty="easy",
                    guidance=["Keep it professional", "Connect to the role", "Be concise (2-3 minutes)"],
                    sample_points=["Your background", "Relevant experience", "Why this company"]
                )
            ],
            technical_questions=[
                InterviewQuestion(
                    question="Describe your technical background and key skills.",
                    category="technical",
                    difficulty="easy",
                    guidance=["Focus on relevant skills", "Give examples"],
                    sample_points=["Primary technologies", "Projects completed"]
                )
            ],
            scenario_questions=[
                InterviewQuestion(
                    question="How would you handle a challenging project deadline?",
                    category="scenario",
                    difficulty="medium",
                    guidance=["Show problem-solving", "Demonstrate leadership"],
                    sample_points=["Prioritization", "Communication", "Delivery"]
                )
            ],
            weak_areas=[],
            general_tips=["Research the company", "Prepare questions", "Arrive early"],
            company_research_points=["Company mission", "Recent news", "Products/services"],
            questions_to_ask=["What does success look like in this role?", "What are the team dynamics?"]
        )
    
    # Store in database
    prep_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    prep_doc = {
        "id": prep_id,
        "user_id": current_user["id"],
        "application_id": request.application_id,
        "resume_id": request.resume_id,
        "job_title": application.get("position", ""),
        "company_name": application.get("company", ""),
        "analysis": analysis.model_dump(),
        "match_score": match_score,
        "created_at": now,
        "updated_at": now
    }
    
    await db.interview_preps.insert_one(prep_doc)
    logger.info(f"Interview prep generated: {prep_id} for user {current_user['id']}")
    
    return InterviewPrepResponse(**{k: v for k, v in prep_doc.items() if k != "_id"})

@api_router.get("/interview-prep", response_model=List[InterviewPrepResponse])
async def get_interview_preps(application_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get all interview preparations for the user, optionally filtered by application"""
    query = {"user_id": current_user["id"]}
    if application_id:
        query["application_id"] = application_id
    
    preps = await db.interview_preps.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [InterviewPrepResponse(**p) for p in preps]

@api_router.get("/interview-prep/{prep_id}", response_model=InterviewPrepResponse)
async def get_interview_prep(prep_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific interview preparation"""
    prep = await db.interview_preps.find_one({"id": prep_id, "user_id": current_user["id"]}, {"_id": 0})
    if not prep:
        raise HTTPException(status_code=404, detail="Interview preparation not found")
    return InterviewPrepResponse(**prep)

@api_router.delete("/interview-prep/{prep_id}")
async def delete_interview_prep(prep_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an interview preparation"""
    result = await db.interview_preps.delete_one({"id": prep_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Interview preparation not found")
    return {"message": "Interview preparation deleted"}

@api_router.post("/interview-prep/{prep_id}/regenerate", response_model=InterviewPrepResponse)
async def regenerate_interview_prep(prep_id: str, current_user: dict = Depends(get_current_user)):
    """Regenerate interview preparation with fresh questions"""
    existing = await db.interview_preps.find_one({"id": prep_id, "user_id": current_user["id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Interview preparation not found")
    
    # Delete old and create new
    await db.interview_preps.delete_one({"id": prep_id})
    
    request = InterviewPrepRequest(
        application_id=existing["application_id"],
        resume_id=existing["resume_id"],
        include_match_analysis=True
    )
    
    return await generate_interview_prep(request, current_user)

# ===================== ANALYTICS ROUTES =====================

@api_router.get("/analytics")
async def get_analytics(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    # Get application stats
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.applications.aggregate(pipeline).to_list(20)
    
    total_apps = sum(s["count"] for s in status_counts)
    status_breakdown = {s["_id"]: s["count"] for s in status_counts}
    
    # Get recent applications
    recent_apps = await db.applications.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    # Get resume count
    resume_count = await db.resumes.count_documents({"user_id": user_id})
    
    # Get cover letter count
    cover_letter_count = await db.cover_letters.count_documents({"user_id": user_id})
    
    # Get upcoming events
    now = datetime.now(timezone.utc).isoformat()
    upcoming_events = await db.calendar_events.find(
        {"user_id": user_id, "start_date": {"$gte": now}}, 
        {"_id": 0}
    ).sort("start_date", 1).limit(5).to_list(5)
    
    # Calculate response rate
    responded_statuses = ["interviewing", "offer", "rejected"]
    responded = sum(status_breakdown.get(s, 0) for s in responded_statuses)
    response_rate = round((responded / total_apps * 100) if total_apps > 0 else 0, 1)
    
    return {
        "total_applications": total_apps,
        "status_breakdown": status_breakdown,
        "response_rate": response_rate,
        "resume_count": resume_count,
        "cover_letter_count": cover_letter_count,
        "recent_applications": recent_apps,
        "upcoming_events": upcoming_events
    }

# ===================== HEALTH CHECK =====================

@api_router.get("/")
async def root():
    return {"message": "HireFlow AI API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router and add middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
