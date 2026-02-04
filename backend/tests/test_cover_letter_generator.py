"""
Test Suite for Phase 1 AI Cover Letter Generator
Tests all CRUD operations and PDF generation for cover letters
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_EMAIL = f"test_coverletter_{uuid.uuid4().hex[:8]}@example.com"
TEST_PASSWORD = "TestPass123!"
TEST_NAME = "Cover Letter Tester"


class TestCoverLetterGenerator:
    """Test suite for Cover Letter Generator API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Register a test user and get auth token"""
        # Register new user
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        
        if response.status_code == 400:
            # User exists, try login
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
        
        assert response.status_code in [200, 201], f"Auth failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Create authenticated session"""
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    @pytest.fixture(scope="class")
    def test_resume(self, api_client):
        """Create a test resume for cover letter generation"""
        resume_data = {
            "title": "Test Resume for Cover Letter",
            "content": """
John Doe
Software Engineer
john.doe@email.com | (555) 123-4567

SUMMARY
Experienced software engineer with 5+ years of experience in full-stack development.
Proficient in Python, JavaScript, React, and cloud technologies.

EXPERIENCE
Senior Software Engineer | Tech Corp | 2020-Present
- Led development of microservices architecture serving 1M+ users
- Implemented CI/CD pipelines reducing deployment time by 60%
- Mentored junior developers and conducted code reviews

Software Engineer | StartupXYZ | 2018-2020
- Built RESTful APIs using Python/FastAPI
- Developed React frontend applications
- Collaborated with cross-functional teams

SKILLS
Python, JavaScript, React, Node.js, AWS, Docker, PostgreSQL, MongoDB

EDUCATION
BS Computer Science | State University | 2018
"""
        }
        response = api_client.post(f"{BASE_URL}/api/resumes", json=resume_data)
        assert response.status_code == 200, f"Failed to create resume: {response.text}"
        return response.json()
    
    @pytest.fixture(scope="class")
    def test_application(self, api_client):
        """Create a test job application for cover letter generation"""
        app_data = {
            "company": "Acme Corporation",
            "position": "Senior Software Engineer",
            "job_description": """
We are looking for a Senior Software Engineer to join our team.

Requirements:
- 5+ years of software development experience
- Strong proficiency in Python and JavaScript
- Experience with React and modern frontend frameworks
- Knowledge of cloud services (AWS preferred)
- Experience with microservices architecture
- Strong communication and teamwork skills

Responsibilities:
- Design and implement scalable backend services
- Collaborate with product and design teams
- Mentor junior engineers
- Participate in code reviews
""",
            "status": "applied",
            "notes": "Applied via company website"
        }
        response = api_client.post(f"{BASE_URL}/api/applications", json=app_data)
        assert response.status_code == 200, f"Failed to create application: {response.text}"
        return response.json()
    
    # ==================== GENERATE COVER LETTER TESTS ====================
    
    def test_generate_cover_letter_success(self, api_client, test_resume, test_application):
        """Test POST /api/cover-letter/generate - successful generation"""
        response = api_client.post(f"{BASE_URL}/api/cover-letter/generate", json={
            "resume_id": test_resume["id"],
            "job_application_id": test_application["id"],
            "customization_notes": "Emphasize leadership experience"
        })
        
        assert response.status_code == 200, f"Generate failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "content" in data
        assert "word_count" in data
        assert "company_name" in data
        assert "position" in data
        assert "created_at" in data
        
        # Verify content
        assert data["company_name"] == "Acme Corporation"
        assert data["position"] == "Senior Software Engineer"
        assert data["word_count"] > 100  # Should have substantial content
        assert len(data["content"]) > 200  # Content should be meaningful
        
        # Store for later tests
        self.__class__.generated_letter_id = data["id"]
        print(f"✓ Cover letter generated successfully: {data['word_count']} words")
    
    def test_generate_cover_letter_missing_resume(self, api_client, test_application):
        """Test POST /api/cover-letter/generate - missing resume"""
        response = api_client.post(f"{BASE_URL}/api/cover-letter/generate", json={
            "resume_id": "nonexistent-resume-id",
            "job_application_id": test_application["id"]
        })
        
        assert response.status_code == 404
        assert "Resume not found" in response.json()["detail"]
        print("✓ Correctly returns 404 for missing resume")
    
    def test_generate_cover_letter_missing_application(self, api_client, test_resume):
        """Test POST /api/cover-letter/generate - missing application"""
        response = api_client.post(f"{BASE_URL}/api/cover-letter/generate", json={
            "resume_id": test_resume["id"],
            "job_application_id": "nonexistent-app-id"
        })
        
        assert response.status_code == 404
        assert "Job application not found" in response.json()["detail"]
        print("✓ Correctly returns 404 for missing application")
    
    # ==================== GET ALL COVER LETTERS TESTS ====================
    
    def test_get_all_cover_letters(self, api_client):
        """Test GET /api/cover-letter - returns all saved cover letters"""
        response = api_client.get(f"{BASE_URL}/api/cover-letter")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1  # At least the one we generated
        
        # Verify structure of first item
        letter = data[0]
        assert "id" in letter
        assert "content" in letter
        assert "word_count" in letter
        assert "company_name" in letter
        assert "position" in letter
        print(f"✓ Retrieved {len(data)} cover letters")
    
    # ==================== GET SINGLE COVER LETTER TESTS ====================
    
    def test_get_single_cover_letter(self, api_client):
        """Test GET /api/cover-letter/{id} - returns single cover letter"""
        letter_id = getattr(self.__class__, 'generated_letter_id', None)
        assert letter_id, "No letter ID from previous test"
        
        response = api_client.get(f"{BASE_URL}/api/cover-letter/{letter_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == letter_id
        assert "content" in data
        assert "word_count" in data
        print(f"✓ Retrieved single cover letter: {data['position']} at {data['company_name']}")
    
    def test_get_nonexistent_cover_letter(self, api_client):
        """Test GET /api/cover-letter/{id} - returns 404 for nonexistent"""
        response = api_client.get(f"{BASE_URL}/api/cover-letter/nonexistent-id")
        
        assert response.status_code == 404
        assert "Cover letter not found" in response.json()["detail"]
        print("✓ Correctly returns 404 for nonexistent cover letter")
    
    # ==================== UPDATE COVER LETTER TESTS ====================
    
    def test_update_cover_letter_content(self, api_client):
        """Test PUT /api/cover-letter/{id} - update content"""
        letter_id = getattr(self.__class__, 'generated_letter_id', None)
        assert letter_id, "No letter ID from previous test"
        
        new_content = "This is updated cover letter content for testing purposes. " * 20
        
        response = api_client.put(f"{BASE_URL}/api/cover-letter/{letter_id}", json={
            "content": new_content
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["content"] == new_content
        assert data["word_count"] == len(new_content.split())
        print(f"✓ Updated cover letter content: {data['word_count']} words")
    
    def test_update_cover_letter_title(self, api_client):
        """Test PUT /api/cover-letter/{id} - update title"""
        letter_id = getattr(self.__class__, 'generated_letter_id', None)
        assert letter_id, "No letter ID from previous test"
        
        new_title = "Updated Cover Letter Title"
        
        response = api_client.put(f"{BASE_URL}/api/cover-letter/{letter_id}", json={
            "title": new_title
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["title"] == new_title
        print(f"✓ Updated cover letter title: {data['title']}")
    
    def test_update_cover_letter_no_data(self, api_client):
        """Test PUT /api/cover-letter/{id} - no update data provided"""
        letter_id = getattr(self.__class__, 'generated_letter_id', None)
        assert letter_id, "No letter ID from previous test"
        
        response = api_client.put(f"{BASE_URL}/api/cover-letter/{letter_id}", json={})
        
        assert response.status_code == 400
        assert "No update data provided" in response.json()["detail"]
        print("✓ Correctly returns 400 for empty update")
    
    def test_update_nonexistent_cover_letter(self, api_client):
        """Test PUT /api/cover-letter/{id} - nonexistent letter"""
        response = api_client.put(f"{BASE_URL}/api/cover-letter/nonexistent-id", json={
            "content": "New content"
        })
        
        assert response.status_code == 404
        assert "Cover letter not found" in response.json()["detail"]
        print("✓ Correctly returns 404 for nonexistent cover letter update")
    
    # ==================== PDF DOWNLOAD TESTS ====================
    
    def test_download_cover_letter_pdf(self, api_client):
        """Test GET /api/cover-letter/{id}/pdf - download as PDF"""
        letter_id = getattr(self.__class__, 'generated_letter_id', None)
        assert letter_id, "No letter ID from previous test"
        
        response = api_client.get(f"{BASE_URL}/api/cover-letter/{letter_id}/pdf")
        
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        
        # Check Content-Disposition header
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition
        assert ".pdf" in content_disposition
        
        # Verify PDF content (starts with %PDF)
        assert response.content[:4] == b'%PDF'
        print(f"✓ PDF downloaded successfully: {len(response.content)} bytes")
    
    def test_download_nonexistent_pdf(self, api_client):
        """Test GET /api/cover-letter/{id}/pdf - nonexistent letter"""
        response = api_client.get(f"{BASE_URL}/api/cover-letter/nonexistent-id/pdf")
        
        assert response.status_code == 404
        print("✓ Correctly returns 404 for nonexistent PDF download")
    
    # ==================== DELETE COVER LETTER TESTS ====================
    
    def test_delete_cover_letter(self, api_client, test_resume, test_application):
        """Test DELETE /api/cover-letter/{id} - delete cover letter"""
        # First create a new letter to delete
        response = api_client.post(f"{BASE_URL}/api/cover-letter/generate", json={
            "resume_id": test_resume["id"],
            "job_application_id": test_application["id"]
        })
        assert response.status_code == 200
        letter_id = response.json()["id"]
        
        # Now delete it
        delete_response = api_client.delete(f"{BASE_URL}/api/cover-letter/{letter_id}")
        assert delete_response.status_code == 200
        assert "deleted" in delete_response.json()["message"].lower()
        
        # Verify it's gone
        get_response = api_client.get(f"{BASE_URL}/api/cover-letter/{letter_id}")
        assert get_response.status_code == 404
        print("✓ Cover letter deleted successfully")
    
    def test_delete_nonexistent_cover_letter(self, api_client):
        """Test DELETE /api/cover-letter/{id} - nonexistent letter"""
        response = api_client.delete(f"{BASE_URL}/api/cover-letter/nonexistent-id")
        
        assert response.status_code == 404
        assert "Cover letter not found" in response.json()["detail"]
        print("✓ Correctly returns 404 for nonexistent delete")
    
    # ==================== CLEANUP ====================
    
    def test_cleanup_test_data(self, api_client, test_resume, test_application):
        """Cleanup test data after all tests"""
        # Delete test resume
        api_client.delete(f"{BASE_URL}/api/resumes/{test_resume['id']}")
        
        # Delete test application
        api_client.delete(f"{BASE_URL}/api/applications/{test_application['id']}")
        
        # Delete any remaining cover letters
        letter_id = getattr(self.__class__, 'generated_letter_id', None)
        if letter_id:
            api_client.delete(f"{BASE_URL}/api/cover-letter/{letter_id}")
        
        print("✓ Test data cleaned up")


class TestCoverLetterEdgeCases:
    """Test edge cases and validation for Cover Letter Generator"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Register a test user and get auth token"""
        test_email = f"test_edge_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "name": "Edge Case Tester"
        })
        
        if response.status_code == 400:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": "TestPass123!"
            })
        
        assert response.status_code in [200, 201]
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Create authenticated session"""
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_generate_without_job_description(self, api_client):
        """Test generation when job application has no job description"""
        # Create resume
        resume_resp = api_client.post(f"{BASE_URL}/api/resumes", json={
            "title": "Minimal Resume",
            "content": "John Doe - Software Engineer with 5 years experience in Python and JavaScript."
        })
        assert resume_resp.status_code == 200
        resume_id = resume_resp.json()["id"]
        
        # Create application without job description
        app_resp = api_client.post(f"{BASE_URL}/api/applications", json={
            "company": "NoDesc Corp",
            "position": "Developer",
            "status": "applied"
        })
        assert app_resp.status_code == 200
        app_id = app_resp.json()["id"]
        
        # Generate cover letter - should still work
        gen_resp = api_client.post(f"{BASE_URL}/api/cover-letter/generate", json={
            "resume_id": resume_id,
            "job_application_id": app_id
        })
        
        assert gen_resp.status_code == 200
        data = gen_resp.json()
        assert len(data["content"]) > 100
        print("✓ Cover letter generated even without job description")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/resumes/{resume_id}")
        api_client.delete(f"{BASE_URL}/api/applications/{app_id}")
        api_client.delete(f"{BASE_URL}/api/cover-letter/{data['id']}")
    
    def test_unauthorized_access(self):
        """Test that unauthorized requests are rejected"""
        # No auth header
        response = requests.get(f"{BASE_URL}/api/cover-letter")
        assert response.status_code in [401, 403]
        print("✓ Unauthorized access correctly rejected")
    
    def test_invalid_token(self):
        """Test that invalid tokens are rejected"""
        response = requests.get(
            f"{BASE_URL}/api/cover-letter",
            headers={"Authorization": "Bearer invalid-token-here"}
        )
        assert response.status_code == 401
        print("✓ Invalid token correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
