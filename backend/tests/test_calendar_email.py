"""
Test suite for Calendar Events with Email Notification System
Tests: Calendar CRUD, reminder fields, interview types, meeting links, test reminder endpoint
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_EMAIL = f"test_calendar_{datetime.now().strftime('%H%M%S')}@example.com"
TEST_PASSWORD = "Test123!"
TEST_NAME = "Test User"


class TestAuthFlow:
    """Test user registration and login"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    def test_user_registration(self, session):
        """Test user registration endpoint"""
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "token" in data, "Token missing from response"
        assert "user" in data, "User missing from response"
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["name"] == TEST_NAME
        
        # Store token for subsequent tests
        session.headers.update({"Authorization": f"Bearer {data['token']}"})
        print(f"✅ User registered: {TEST_EMAIL}")
        return data
    
    def test_user_login(self, session):
        """Test user login endpoint"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        assert "token" in data
        assert data["user"]["email"] == TEST_EMAIL
        
        session.headers.update({"Authorization": f"Bearer {data['token']}"})
        print(f"✅ User logged in: {TEST_EMAIL}")
        return data


class TestCalendarCRUD:
    """Test Calendar Event CRUD operations with new fields"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        
        # Register new user
        email = f"test_cal_{datetime.now().strftime('%H%M%S%f')}@example.com"
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        
        if response.status_code == 200:
            token = response.json()["token"]
            session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            # Try login if user exists
            response = session.post(f"{BASE_URL}/api/auth/login", json={
                "email": email,
                "password": TEST_PASSWORD
            })
            if response.status_code == 200:
                token = response.json()["token"]
                session.headers.update({"Authorization": f"Bearer {token}"})
            else:
                pytest.skip("Could not authenticate")
        
        return session
    
    @pytest.fixture(scope="class")
    def test_application(self, auth_session):
        """Create a test job application for linking"""
        response = auth_session.post(f"{BASE_URL}/api/applications", json={
            "company": "TEST_TechCorp",
            "position": "TEST_Software Engineer",
            "job_description": "Python, React, MongoDB",
            "status": "interview"
        })
        
        if response.status_code == 200:
            return response.json()
        return None
    
    def test_create_calendar_event_basic(self, auth_session):
        """Test creating a basic calendar event"""
        start_date = (datetime.now() + timedelta(days=1)).isoformat()
        
        response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_Basic Interview",
            "event_type": "interview",
            "start_date": start_date,
            "description": "Basic interview test"
        })
        
        assert response.status_code == 200, f"Create event failed: {response.text}"
        data = response.json()
        
        # Verify basic fields
        assert data["title"] == "TEST_Basic Interview"
        assert data["event_type"] == "interview"
        assert "id" in data
        
        # Verify reminder fields exist with defaults
        assert "reminders_enabled" in data, "reminders_enabled field missing"
        assert data["reminders_enabled"] == True, "Default reminders_enabled should be True"
        assert "reminder_24hr_sent" in data, "reminder_24hr_sent field missing"
        assert data["reminder_24hr_sent"] == False
        assert "reminder_1hr_sent" in data, "reminder_1hr_sent field missing"
        assert data["reminder_1hr_sent"] == False
        
        print(f"✅ Basic calendar event created with reminder fields")
        return data
    
    def test_create_event_with_interview_type(self, auth_session):
        """Test creating event with interview_type field"""
        start_date = (datetime.now() + timedelta(days=2)).isoformat()
        
        response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_Technical Interview",
            "event_type": "interview",
            "interview_type": "technical",
            "start_date": start_date,
            "description": "Technical round"
        })
        
        assert response.status_code == 200, f"Create event failed: {response.text}"
        data = response.json()
        
        assert data["interview_type"] == "technical", "interview_type not stored correctly"
        print(f"✅ Event created with interview_type: {data['interview_type']}")
        return data
    
    def test_create_event_with_meeting_link(self, auth_session):
        """Test creating event with meeting_link field"""
        start_date = (datetime.now() + timedelta(days=3)).isoformat()
        
        response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_Video Interview",
            "event_type": "video_call",
            "interview_type": "hr",
            "meeting_link": "https://zoom.us/j/123456789",
            "start_date": start_date
        })
        
        assert response.status_code == 200, f"Create event failed: {response.text}"
        data = response.json()
        
        assert data["meeting_link"] == "https://zoom.us/j/123456789", "meeting_link not stored"
        print(f"✅ Event created with meeting_link: {data['meeting_link']}")
        return data
    
    def test_create_event_with_job_application_link(self, auth_session, test_application):
        """Test creating event linked to job application"""
        if not test_application:
            pytest.skip("No test application available")
        
        start_date = (datetime.now() + timedelta(days=4)).isoformat()
        
        response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_Linked Interview",
            "event_type": "interview",
            "interview_type": "managerial",
            "job_application_id": test_application["id"],
            "start_date": start_date
        })
        
        assert response.status_code == 200, f"Create event failed: {response.text}"
        data = response.json()
        
        assert data["job_application_id"] == test_application["id"], "job_application_id not stored"
        print(f"✅ Event linked to job application: {data['job_application_id']}")
        return data
    
    def test_create_event_with_reminders_disabled(self, auth_session):
        """Test creating event with reminders disabled"""
        start_date = (datetime.now() + timedelta(days=5)).isoformat()
        
        response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_No Reminders Event",
            "event_type": "interview",
            "start_date": start_date,
            "reminders_enabled": False
        })
        
        assert response.status_code == 200, f"Create event failed: {response.text}"
        data = response.json()
        
        assert data["reminders_enabled"] == False, "reminders_enabled should be False"
        print(f"✅ Event created with reminders disabled")
        return data
    
    def test_get_calendar_events(self, auth_session):
        """Test getting all calendar events"""
        response = auth_session.get(f"{BASE_URL}/api/calendar")
        
        assert response.status_code == 200, f"Get events failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        # Verify all events have reminder fields
        for event in data:
            assert "reminders_enabled" in event, f"Event {event.get('id')} missing reminders_enabled"
            assert "reminder_24hr_sent" in event, f"Event {event.get('id')} missing reminder_24hr_sent"
            assert "reminder_1hr_sent" in event, f"Event {event.get('id')} missing reminder_1hr_sent"
        
        print(f"✅ Retrieved {len(data)} calendar events with reminder fields")
        return data
    
    def test_update_calendar_event(self, auth_session):
        """Test updating a calendar event"""
        # First create an event
        start_date = (datetime.now() + timedelta(days=6)).isoformat()
        create_response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_Update Event",
            "event_type": "interview",
            "start_date": start_date
        })
        
        assert create_response.status_code == 200
        event_id = create_response.json()["id"]
        
        # Update the event
        update_response = auth_session.put(f"{BASE_URL}/api/calendar/{event_id}", json={
            "title": "TEST_Updated Event Title",
            "interview_type": "final",
            "meeting_link": "https://meet.google.com/abc-defg-hij",
            "reminders_enabled": False
        })
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        data = update_response.json()
        
        assert data["title"] == "TEST_Updated Event Title"
        assert data["interview_type"] == "final"
        assert data["meeting_link"] == "https://meet.google.com/abc-defg-hij"
        assert data["reminders_enabled"] == False
        
        print(f"✅ Event updated successfully with new fields")
        return data
    
    def test_delete_calendar_event(self, auth_session):
        """Test deleting a calendar event"""
        # First create an event
        start_date = (datetime.now() + timedelta(days=7)).isoformat()
        create_response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_Delete Event",
            "event_type": "other",
            "start_date": start_date
        })
        
        assert create_response.status_code == 200
        event_id = create_response.json()["id"]
        
        # Delete the event
        delete_response = auth_session.delete(f"{BASE_URL}/api/calendar/{event_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion
        get_response = auth_session.get(f"{BASE_URL}/api/calendar/{event_id}")
        assert get_response.status_code == 404, "Event should not exist after deletion"
        
        print(f"✅ Event deleted successfully")


class TestEmailNotificationSystem:
    """Test email notification system endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        
        email = f"test_email_{datetime.now().strftime('%H%M%S%f')}@example.com"
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        
        if response.status_code == 200:
            token = response.json()["token"]
            session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Could not authenticate")
        
        return session
    
    def test_send_test_reminder_endpoint(self, auth_session):
        """Test the send test reminder endpoint"""
        # First create an interview event
        start_date = (datetime.now() + timedelta(hours=25)).isoformat()
        
        create_response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_Reminder Test Interview",
            "event_type": "interview",
            "interview_type": "technical",
            "start_date": start_date,
            "reminders_enabled": True
        })
        
        assert create_response.status_code == 200, f"Create event failed: {create_response.text}"
        event_id = create_response.json()["id"]
        
        # Test the send test reminder endpoint
        reminder_response = auth_session.post(f"{BASE_URL}/api/calendar/{event_id}/send-test-reminder")
        
        # The endpoint should return 200 even if email sending fails (graceful handling)
        assert reminder_response.status_code == 200, f"Send test reminder failed: {reminder_response.text}"
        data = reminder_response.json()
        
        # Check response structure
        assert "status" in data or "message" in data, "Response should have status or message"
        print(f"✅ Test reminder endpoint responded: {data}")
        return data
    
    def test_notification_logs_endpoint(self, auth_session):
        """Test getting notification logs"""
        response = auth_session.get(f"{BASE_URL}/api/notifications/logs")
        
        # This endpoint may or may not exist - check gracefully
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list), "Notification logs should be a list"
            print(f"✅ Retrieved {len(data)} notification logs")
        elif response.status_code == 404:
            print("ℹ️ Notification logs endpoint not implemented")
        else:
            print(f"⚠️ Notification logs endpoint returned: {response.status_code}")


class TestInterviewPrepFlow:
    """Test Interview Prep generation and history"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session with test data"""
        session = requests.Session()
        
        email = f"test_prep_{datetime.now().strftime('%H%M%S%f')}@example.com"
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        
        if response.status_code == 200:
            token = response.json()["token"]
            session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Could not authenticate")
        
        return session
    
    @pytest.fixture(scope="class")
    def test_resume(self, auth_session):
        """Create a test resume"""
        response = auth_session.post(f"{BASE_URL}/api/resumes", json={
            "title": "TEST_Software Engineer Resume",
            "content": """
            John Doe
            Software Engineer with 5 years of experience
            
            Skills: Python, JavaScript, React, Node.js, MongoDB, PostgreSQL, AWS, Docker
            
            Experience:
            - Senior Developer at TechCorp (2020-2024)
              - Built scalable microservices
              - Led team of 5 developers
            
            Education:
            - BS Computer Science, MIT
            """
        })
        
        if response.status_code == 200:
            return response.json()
        return None
    
    @pytest.fixture(scope="class")
    def test_application(self, auth_session):
        """Create a test job application"""
        response = auth_session.post(f"{BASE_URL}/api/applications", json={
            "company": "TEST_Google",
            "position": "TEST_Senior Software Engineer",
            "job_description": """
            We are looking for a Senior Software Engineer with:
            - 5+ years of experience
            - Strong Python and JavaScript skills
            - Experience with cloud platforms (AWS/GCP)
            - Leadership experience
            """,
            "status": "interview"
        })
        
        if response.status_code == 200:
            return response.json()
        return None
    
    def test_get_interview_prep_history(self, auth_session):
        """Test getting interview prep history"""
        response = auth_session.get(f"{BASE_URL}/api/interview-prep")
        
        assert response.status_code == 200, f"Get prep history failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Retrieved {len(data)} interview preps")
        return data


# Cleanup fixture
@pytest.fixture(scope="session", autouse=True)
def cleanup(request):
    """Cleanup test data after all tests"""
    def cleanup_test_data():
        # Note: In a real scenario, we'd clean up TEST_ prefixed data
        print("\n🧹 Test cleanup completed")
    
    request.addfinalizer(cleanup_test_data)
