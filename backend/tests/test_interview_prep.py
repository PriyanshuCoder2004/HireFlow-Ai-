"""
Test Interview Preparation Feature
- POST /api/interview-prep/generate - Always returns result (AI or fallback)
- Response includes ai_generated field (true/false)
- Fallback includes: HR questions (5+), Technical questions (5+), Scenario questions (3+)
- Fallback includes: weak_areas, general_tips, company_research_points, questions_to_ask
- GET /api/interview-prep - Returns saved preparations
- DELETE /api/interview-prep/{id} - Deletes preparation
- POST /api/interview-prep/{id}/regenerate - Regenerates preparation
"""

import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInterviewPrepFeature:
    """Test Interview Preparation Feature with fallback mechanism"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data - create user, resume, and application"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Create unique test user
        self.test_email = f"test_interview_prep_{uuid.uuid4().hex[:8]}@example.com"
        self.test_password = "TestPass123!"
        self.test_name = "Interview Prep Tester"
        
        # Register user
        register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name
        })
        assert register_response.status_code == 200, f"Registration failed: {register_response.text}"
        
        auth_data = register_response.json()
        self.token = auth_data["token"]
        self.user_id = auth_data["user"]["id"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Create test resume
        resume_response = self.session.post(f"{BASE_URL}/api/resumes", json={
            "title": "Test Resume for Interview Prep",
            "content": """
            John Doe
            Senior Software Engineer
            
            EXPERIENCE:
            - 5 years of Python development
            - 3 years of React and JavaScript
            - Experience with AWS, Docker, Kubernetes
            - Led team of 5 developers
            - Implemented CI/CD pipelines
            
            SKILLS:
            Python, JavaScript, React, Node.js, AWS, Docker, PostgreSQL, MongoDB
            
            EDUCATION:
            BS Computer Science, MIT
            """
        })
        assert resume_response.status_code == 200, f"Resume creation failed: {resume_response.text}"
        self.resume_id = resume_response.json()["id"]
        
        # Create test job application
        app_response = self.session.post(f"{BASE_URL}/api/applications", json={
            "company": "TechCorp Inc",
            "position": "Senior Software Engineer",
            "job_description": """
            We are looking for a Senior Software Engineer with:
            - 5+ years of Python experience
            - Experience with React and modern JavaScript
            - AWS cloud experience
            - Strong problem-solving skills
            - Team leadership experience
            """,
            "status": "applied"
        })
        assert app_response.status_code == 200, f"Application creation failed: {app_response.text}"
        self.application_id = app_response.json()["id"]
        
        yield
        
        # Cleanup - delete test data
        try:
            self.session.delete(f"{BASE_URL}/api/resumes/{self.resume_id}")
            self.session.delete(f"{BASE_URL}/api/applications/{self.application_id}")
        except:
            pass
    
    def test_generate_interview_prep_returns_result(self):
        """Test POST /api/interview-prep/generate always returns a result"""
        response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "include_match_analysis": True
        })
        
        # Should always return 200, never error
        assert response.status_code == 200, f"Interview prep generation failed: {response.text}"
        
        data = response.json()
        
        # Verify required fields exist
        assert "id" in data, "Response missing 'id' field"
        assert "user_id" in data, "Response missing 'user_id' field"
        assert "application_id" in data, "Response missing 'application_id' field"
        assert "resume_id" in data, "Response missing 'resume_id' field"
        assert "job_title" in data, "Response missing 'job_title' field"
        assert "company_name" in data, "Response missing 'company_name' field"
        assert "analysis" in data, "Response missing 'analysis' field"
        assert "created_at" in data, "Response missing 'created_at' field"
        
        # Store prep_id for later tests
        self.prep_id = data["id"]
        
        print(f"✓ Interview prep generated successfully: {data['id']}")
        print(f"  - Job Title: {data['job_title']}")
        print(f"  - Company: {data['company_name']}")
    
    def test_response_includes_ai_generated_field(self):
        """Test that response includes ai_generated field (true/false)"""
        response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "include_match_analysis": True
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # ai_generated field must exist and be boolean
        assert "ai_generated" in data, "Response missing 'ai_generated' field"
        assert isinstance(data["ai_generated"], bool), f"ai_generated should be boolean, got {type(data['ai_generated'])}"
        
        print(f"✓ ai_generated field present: {data['ai_generated']}")
        
        # Store for cleanup
        self.prep_id = data["id"]
    
    def test_fallback_has_hr_questions(self):
        """Test fallback includes HR questions (5+)"""
        response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "include_match_analysis": False
        })
        
        assert response.status_code == 200
        data = response.json()
        analysis = data["analysis"]
        
        # Check HR behavioral questions
        assert "hr_behavioral_questions" in analysis, "Missing hr_behavioral_questions"
        hr_questions = analysis["hr_behavioral_questions"]
        assert len(hr_questions) >= 5, f"Expected 5+ HR questions, got {len(hr_questions)}"
        
        # Verify question structure
        for q in hr_questions:
            assert "question" in q, "HR question missing 'question' field"
            assert "category" in q, "HR question missing 'category' field"
            assert "difficulty" in q, "HR question missing 'difficulty' field"
            assert "guidance" in q, "HR question missing 'guidance' field"
            assert "sample_points" in q, "HR question missing 'sample_points' field"
        
        print(f"✓ HR behavioral questions: {len(hr_questions)} questions")
        
        self.prep_id = data["id"]
    
    def test_fallback_has_technical_questions(self):
        """Test fallback includes Technical questions (5+)"""
        response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "include_match_analysis": False
        })
        
        assert response.status_code == 200
        data = response.json()
        analysis = data["analysis"]
        
        # Check technical questions
        assert "technical_questions" in analysis, "Missing technical_questions"
        tech_questions = analysis["technical_questions"]
        assert len(tech_questions) >= 5, f"Expected 5+ technical questions, got {len(tech_questions)}"
        
        # Verify question structure
        for q in tech_questions:
            assert "question" in q, "Technical question missing 'question' field"
            assert "category" in q, "Technical question missing 'category' field"
            assert "difficulty" in q, "Technical question missing 'difficulty' field"
            assert "guidance" in q, "Technical question missing 'guidance' field"
        
        print(f"✓ Technical questions: {len(tech_questions)} questions")
        
        self.prep_id = data["id"]
    
    def test_fallback_has_scenario_questions(self):
        """Test fallback includes Scenario questions (3+)"""
        response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "include_match_analysis": False
        })
        
        assert response.status_code == 200
        data = response.json()
        analysis = data["analysis"]
        
        # Check scenario questions
        assert "scenario_questions" in analysis, "Missing scenario_questions"
        scenario_questions = analysis["scenario_questions"]
        assert len(scenario_questions) >= 3, f"Expected 3+ scenario questions, got {len(scenario_questions)}"
        
        # Verify question structure
        for q in scenario_questions:
            assert "question" in q, "Scenario question missing 'question' field"
            assert "category" in q, "Scenario question missing 'category' field"
            assert "difficulty" in q, "Scenario question missing 'difficulty' field"
        
        print(f"✓ Scenario questions: {len(scenario_questions)} questions")
        
        self.prep_id = data["id"]
    
    def test_fallback_has_weak_areas(self):
        """Test fallback includes weak_areas"""
        response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "include_match_analysis": False
        })
        
        assert response.status_code == 200
        data = response.json()
        analysis = data["analysis"]
        
        # Check weak_areas
        assert "weak_areas" in analysis, "Missing weak_areas"
        weak_areas = analysis["weak_areas"]
        assert len(weak_areas) > 0, "Expected at least 1 weak area"
        
        # Verify weak area structure
        for area in weak_areas:
            assert "topic" in area, "Weak area missing 'topic' field"
            assert "reason" in area, "Weak area missing 'reason' field"
            assert "preparation_tips" in area, "Weak area missing 'preparation_tips' field"
        
        print(f"✓ Weak areas: {len(weak_areas)} areas")
        
        self.prep_id = data["id"]
    
    def test_fallback_has_general_tips(self):
        """Test fallback includes general_tips"""
        response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "include_match_analysis": False
        })
        
        assert response.status_code == 200
        data = response.json()
        analysis = data["analysis"]
        
        # Check general_tips
        assert "general_tips" in analysis, "Missing general_tips"
        tips = analysis["general_tips"]
        assert len(tips) > 0, "Expected at least 1 general tip"
        assert all(isinstance(tip, str) for tip in tips), "Tips should be strings"
        
        print(f"✓ General tips: {len(tips)} tips")
        
        self.prep_id = data["id"]
    
    def test_fallback_has_company_research_points(self):
        """Test fallback includes company_research_points"""
        response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "include_match_analysis": False
        })
        
        assert response.status_code == 200
        data = response.json()
        analysis = data["analysis"]
        
        # Check company_research_points
        assert "company_research_points" in analysis, "Missing company_research_points"
        research_points = analysis["company_research_points"]
        assert len(research_points) > 0, "Expected at least 1 company research point"
        
        print(f"✓ Company research points: {len(research_points)} points")
        
        self.prep_id = data["id"]
    
    def test_fallback_has_questions_to_ask(self):
        """Test fallback includes questions_to_ask"""
        response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "include_match_analysis": False
        })
        
        assert response.status_code == 200
        data = response.json()
        analysis = data["analysis"]
        
        # Check questions_to_ask
        assert "questions_to_ask" in analysis, "Missing questions_to_ask"
        questions = analysis["questions_to_ask"]
        assert len(questions) > 0, "Expected at least 1 question to ask"
        
        print(f"✓ Questions to ask: {len(questions)} questions")
        
        self.prep_id = data["id"]
    
    def test_get_saved_preparations(self):
        """Test GET /api/interview-prep returns saved preparations"""
        # First generate a prep
        gen_response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "include_match_analysis": False
        })
        assert gen_response.status_code == 200
        prep_id = gen_response.json()["id"]
        
        # Get all preparations
        response = self.session.get(f"{BASE_URL}/api/interview-prep")
        assert response.status_code == 200, f"Failed to get preparations: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 1, "Should have at least 1 preparation"
        
        # Find our prep
        found = any(p["id"] == prep_id for p in data)
        assert found, "Generated prep not found in list"
        
        print(f"✓ GET /api/interview-prep returned {len(data)} preparations")
        
        self.prep_id = prep_id
    
    def test_get_single_preparation(self):
        """Test GET /api/interview-prep/{id} returns specific preparation"""
        # First generate a prep
        gen_response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "include_match_analysis": False
        })
        assert gen_response.status_code == 200
        prep_id = gen_response.json()["id"]
        
        # Get specific preparation
        response = self.session.get(f"{BASE_URL}/api/interview-prep/{prep_id}")
        assert response.status_code == 200, f"Failed to get preparation: {response.text}"
        
        data = response.json()
        assert data["id"] == prep_id
        assert "analysis" in data
        
        print(f"✓ GET /api/interview-prep/{prep_id} returned preparation")
        
        self.prep_id = prep_id
    
    def test_delete_preparation(self):
        """Test DELETE /api/interview-prep/{id} deletes preparation"""
        # First generate a prep
        gen_response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "include_match_analysis": False
        })
        assert gen_response.status_code == 200
        prep_id = gen_response.json()["id"]
        
        # Delete preparation
        response = self.session.delete(f"{BASE_URL}/api/interview-prep/{prep_id}")
        assert response.status_code == 200, f"Failed to delete preparation: {response.text}"
        
        # Verify deleted
        get_response = self.session.get(f"{BASE_URL}/api/interview-prep/{prep_id}")
        assert get_response.status_code == 404, "Preparation should be deleted"
        
        print(f"✓ DELETE /api/interview-prep/{prep_id} successful")
    
    def test_regenerate_preparation(self):
        """Test POST /api/interview-prep/{id}/regenerate regenerates preparation"""
        # First generate a prep
        gen_response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "include_match_analysis": False
        })
        assert gen_response.status_code == 200
        original_prep = gen_response.json()
        original_id = original_prep["id"]
        
        # Regenerate
        response = self.session.post(f"{BASE_URL}/api/interview-prep/{original_id}/regenerate")
        assert response.status_code == 200, f"Failed to regenerate: {response.text}"
        
        new_prep = response.json()
        
        # Should have new ID
        assert new_prep["id"] != original_id, "Regenerated prep should have new ID"
        assert "analysis" in new_prep
        assert "ai_generated" in new_prep
        
        print(f"✓ Regenerate successful: {original_id} -> {new_prep['id']}")
        
        self.prep_id = new_prep["id"]
    
    def test_missing_application_returns_404(self):
        """Test that missing application returns 404"""
        response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": "nonexistent-app-id",
            "resume_id": self.resume_id,
            "include_match_analysis": False
        })
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Missing application returns 404")
    
    def test_missing_resume_returns_404(self):
        """Test that missing resume returns 404"""
        response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": "nonexistent-resume-id",
            "include_match_analysis": False
        })
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Missing resume returns 404")
    
    def test_unauthorized_access(self):
        """Test that unauthorized access returns 401/403"""
        # Remove auth header
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id
        })
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized access properly rejected")


class TestInterviewPrepContentQuality:
    """Test the quality and completeness of interview prep content"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Create unique test user
        self.test_email = f"test_prep_quality_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register user
        register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": "TestPass123!",
            "name": "Quality Tester"
        })
        assert register_response.status_code == 200
        
        auth_data = register_response.json()
        self.token = auth_data["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Create test resume
        resume_response = self.session.post(f"{BASE_URL}/api/resumes", json={
            "title": "Quality Test Resume",
            "content": "Software Engineer with Python, React, AWS experience"
        })
        assert resume_response.status_code == 200
        self.resume_id = resume_response.json()["id"]
        
        # Create test application
        app_response = self.session.post(f"{BASE_URL}/api/applications", json={
            "company": "Quality Corp",
            "position": "Full Stack Developer",
            "job_description": "Looking for Python, React, AWS skills",
            "status": "applied"
        })
        assert app_response.status_code == 200
        self.application_id = app_response.json()["id"]
        
        yield
        
        # Cleanup
        try:
            self.session.delete(f"{BASE_URL}/api/resumes/{self.resume_id}")
            self.session.delete(f"{BASE_URL}/api/applications/{self.application_id}")
        except:
            pass
    
    def test_questions_have_proper_difficulty_levels(self):
        """Test that questions have valid difficulty levels"""
        response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "include_match_analysis": False
        })
        
        assert response.status_code == 200
        analysis = response.json()["analysis"]
        
        valid_difficulties = ["easy", "medium", "hard"]
        
        all_questions = (
            analysis.get("hr_behavioral_questions", []) +
            analysis.get("technical_questions", []) +
            analysis.get("scenario_questions", [])
        )
        
        for q in all_questions:
            assert q["difficulty"] in valid_difficulties, f"Invalid difficulty: {q['difficulty']}"
        
        print(f"✓ All {len(all_questions)} questions have valid difficulty levels")
    
    def test_questions_have_guidance(self):
        """Test that all questions have guidance"""
        response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "include_match_analysis": False
        })
        
        assert response.status_code == 200
        analysis = response.json()["analysis"]
        
        all_questions = (
            analysis.get("hr_behavioral_questions", []) +
            analysis.get("technical_questions", []) +
            analysis.get("scenario_questions", [])
        )
        
        for q in all_questions:
            assert len(q["guidance"]) > 0, f"Question missing guidance: {q['question'][:50]}"
        
        print(f"✓ All {len(all_questions)} questions have guidance")
    
    def test_company_name_in_content(self):
        """Test that company name appears in personalized content"""
        response = self.session.post(f"{BASE_URL}/api/interview-prep/generate", json={
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "include_match_analysis": False
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Company name should be in response
        assert data["company_name"] == "Quality Corp"
        
        # Check if company name appears in content
        analysis = data["analysis"]
        content_str = str(analysis)
        
        # Company name should appear somewhere in the content
        assert "Quality Corp" in content_str or "quality corp" in content_str.lower(), \
            "Company name should appear in personalized content"
        
        print("✓ Company name appears in personalized content")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
