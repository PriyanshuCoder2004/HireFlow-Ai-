from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
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

app = FastAPI(title="HireFlow AI API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

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
    event_type: str = "interview"
    start_date: str
    end_date: Optional[str] = None
    job_application_id: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class CalendarEventResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    event_type: str
    start_date: str
    end_date: Optional[str] = None
    job_application_id: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

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

# ===================== FILE TEXT EXTRACTION =====================

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text content from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text_content = []
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_content.append(page_text)
        return "\n".join(text_content).strip()
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        raise HTTPException(status_code=400, detail="Failed to extract text from PDF file")

def extract_text_from_docx(file_content: bytes) -> str:
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
        return "\n".join(text_content).strip()
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        raise HTTPException(status_code=400, detail="Failed to extract text from DOCX file")

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
    """Upload a PDF or DOCX resume file and extract text content"""
    # Validate file type
    allowed_types = {
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "application/msword": "doc"
    }
    
    content_type = file.content_type
    if content_type not in allowed_types:
        # Also check by file extension
        file_ext = file.filename.lower().split(".")[-1] if file.filename else ""
        if file_ext not in ["pdf", "docx", "doc"]:
            raise HTTPException(
                status_code=400, 
                detail="Invalid file type. Please upload a PDF or DOCX file."
            )
        file_type = file_ext
    else:
        file_type = allowed_types[content_type]
    
    # Read file content
    file_content = await file.read()
    
    # Check file size (max 10MB)
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    # Extract text based on file type
    if file_type == "pdf":
        extracted_text = extract_text_from_pdf(file_content)
    elif file_type in ["docx", "doc"]:
        extracted_text = extract_text_from_docx(file_content)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format")
    
    if not extracted_text or len(extracted_text.strip()) < 50:
        raise HTTPException(
            status_code=400, 
            detail="Could not extract sufficient text from the file. Please ensure the file contains readable text."
        )
    
    # Create resume record
    resume_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    resume_doc = {
        "id": resume_id,
        "user_id": current_user["id"],
        "title": title,
        "content": extracted_text,
        "file_name": file.filename,
        "file_type": file_type,
        "analysis": None,
        "score": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.resumes.insert_one(resume_doc)
    logger.info(f"Resume uploaded successfully: {file.filename} for user {current_user['id']}")
    
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
