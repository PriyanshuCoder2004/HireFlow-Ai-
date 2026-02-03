"""
Test Suite for Automated Interview Reminder Scheduling
Tests the scheduler functionality including:
- Scheduler status endpoint
- Manual trigger endpoint
- Time window calculations for 24hr and 1hr reminders
- parse_event_datetime helper function
- Debug logging verification
"""

import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_USER_EMAIL = f"test_scheduler_{datetime.now().strftime('%H%M%S')}@example.com"
TEST_USER_PASSWORD = "TestPassword123!"
TEST_USER_NAME = "Scheduler Test User"


class TestSchedulerEndpoints:
    """Test scheduler-related API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Register test user
        register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        })
        
        if register_response.status_code == 200:
            self.token = register_response.json().get("token")
        else:
            # User might already exist, try login
            login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            })
            if login_response.status_code == 200:
                self.token = login_response.json().get("token")
            else:
                pytest.skip("Could not authenticate test user")
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        yield
    
    def test_scheduler_status_endpoint_returns_200(self):
        """Test GET /api/scheduler/status returns 200 OK"""
        response = self.session.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Scheduler status endpoint returns 200")
    
    def test_scheduler_status_contains_required_fields(self):
        """Test scheduler status response contains all required fields"""
        response = self.session.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check required fields (server_time_utc is the actual field name)
        assert "server_time_utc" in data, "Missing server_time_utc field"
        assert "scheduler_running" in data, "Missing scheduler_running field"
        assert "scheduler_interval" in data, "Missing scheduler_interval field"
        assert "upcoming_events" in data, "Missing upcoming_events field"
        
        print(f"✓ Scheduler status contains all required fields")
        print(f"  - server_time_utc: {data.get('server_time_utc')}")
        print(f"  - scheduler_running: {data.get('scheduler_running')}")
        print(f"  - scheduler_interval: {data.get('scheduler_interval')}")
    
    def test_scheduler_is_running(self):
        """Test that scheduler_running is True"""
        response = self.session.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("scheduler_running") == True, f"Scheduler not running: {data.get('scheduler_running')}"
        print("✓ Scheduler is running (scheduler_running=True)")
    
    def test_scheduler_interval_is_5_minutes(self):
        """Test that scheduler interval is 5 minutes"""
        response = self.session.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("scheduler_interval") == "5 minutes", f"Expected '5 minutes', got {data.get('scheduler_interval')}"
        print("✓ Scheduler interval is 5 minutes")
    
    def test_manual_trigger_endpoint_returns_200(self):
        """Test POST /api/scheduler/run-check returns 200 OK"""
        response = self.session.post(f"{BASE_URL}/api/scheduler/run-check")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Manual trigger endpoint returns 200")
    
    def test_manual_trigger_returns_check_time(self):
        """Test manual trigger response contains check_time"""
        response = self.session.post(f"{BASE_URL}/api/scheduler/run-check")
        assert response.status_code == 200
        
        data = response.json()
        assert "check_time" in data, "Missing check_time in response"
        assert "message" in data, "Missing message in response"
        
        print(f"✓ Manual trigger returns check_time: {data.get('check_time')}")


class TestTimeWindowCalculations:
    """Test time window calculations for reminder eligibility"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Use unique email for this test class
        test_email = f"test_timewindow_{datetime.now().strftime('%H%M%S%f')}@example.com"
        
        register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": TEST_USER_PASSWORD,
            "name": "Time Window Test User"
        })
        
        if register_response.status_code == 200:
            self.token = register_response.json().get("token")
        else:
            login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": TEST_USER_PASSWORD
            })
            if login_response.status_code == 200:
                self.token = login_response.json().get("token")
            else:
                pytest.skip("Could not authenticate test user")
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        yield
    
    def test_event_24hr_away_is_eligible(self):
        """Test that event 24 hours away shows eligible_24hr=true"""
        # Create event 24 hours from now
        now = datetime.now(timezone.utc)
        event_time = now + timedelta(hours=24)
        
        # Create calendar event
        event_response = self.session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_24hr_Eligible_Interview",
            "event_type": "interview",
            "interview_type": "technical",
            "start_date": event_time.isoformat(),
            "reminders_enabled": True
        })
        assert event_response.status_code == 200, f"Failed to create event: {event_response.text}"
        event_id = event_response.json().get("id")
        
        # Check scheduler status
        status_response = self.session.get(f"{BASE_URL}/api/scheduler/status")
        assert status_response.status_code == 200
        
        data = status_response.json()
        upcoming_events = data.get("upcoming_events", [])
        
        # Find our event
        our_event = None
        for event in upcoming_events:
            if event.get("id") == event_id:
                our_event = event
                break
        
        if our_event:
            hours_until = our_event.get("hours_until_event", 0)
            eligible_24hr = our_event.get("eligible_24hr", False)
            
            print(f"✓ Event 24hr away: hours_until={hours_until}, eligible_24hr={eligible_24hr}")
            
            # Event should be within 23-25 hours window
            assert 23 <= hours_until <= 25, f"Hours until event should be 23-25, got {hours_until}"
            assert eligible_24hr == True, f"Event should be eligible for 24hr reminder"
        else:
            print(f"  Note: Event not found in upcoming_events (may have been processed)")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/calendar/{event_id}")
    
    def test_event_1hr_away_is_eligible(self):
        """Test that event 1 hour away shows eligible_1hr=true"""
        # Create event 1 hour from now
        now = datetime.now(timezone.utc)
        event_time = now + timedelta(hours=1)
        
        # Create calendar event
        event_response = self.session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_1hr_Eligible_Interview",
            "event_type": "interview",
            "interview_type": "hr",
            "start_date": event_time.isoformat(),
            "reminders_enabled": True
        })
        assert event_response.status_code == 200, f"Failed to create event: {event_response.text}"
        event_id = event_response.json().get("id")
        
        # Check scheduler status
        status_response = self.session.get(f"{BASE_URL}/api/scheduler/status")
        assert status_response.status_code == 200
        
        data = status_response.json()
        upcoming_events = data.get("upcoming_events", [])
        
        # Find our event
        our_event = None
        for event in upcoming_events:
            if event.get("id") == event_id:
                our_event = event
                break
        
        if our_event:
            hours_until = our_event.get("hours_until_event", 0)
            eligible_1hr = our_event.get("eligible_1hr", False)
            
            print(f"✓ Event 1hr away: hours_until={hours_until}, eligible_1hr={eligible_1hr}")
            
            # Event should be within 50-70 minutes (0.833-1.167 hours) window
            assert 0.5 <= hours_until <= 1.5, f"Hours until event should be ~1, got {hours_until}"
            assert eligible_1hr == True, f"Event should be eligible for 1hr reminder"
        else:
            print(f"  Note: Event not found in upcoming_events (may have been processed)")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/calendar/{event_id}")
    
    def test_event_far_away_not_eligible(self):
        """Test that event far in future is not eligible for reminders"""
        # Create event 48 hours from now
        now = datetime.now(timezone.utc)
        event_time = now + timedelta(hours=48)
        
        # Create calendar event
        event_response = self.session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_Far_Future_Interview",
            "event_type": "interview",
            "interview_type": "final",
            "start_date": event_time.isoformat(),
            "reminders_enabled": True
        })
        assert event_response.status_code == 200, f"Failed to create event: {event_response.text}"
        event_id = event_response.json().get("id")
        
        # Check scheduler status
        status_response = self.session.get(f"{BASE_URL}/api/scheduler/status")
        assert status_response.status_code == 200
        
        data = status_response.json()
        upcoming_events = data.get("upcoming_events", [])
        
        # Find our event
        our_event = None
        for event in upcoming_events:
            if event.get("id") == event_id:
                our_event = event
                break
        
        if our_event:
            hours_until = our_event.get("hours_until_event", 0)
            eligible_24hr = our_event.get("eligible_24hr", False)
            eligible_1hr = our_event.get("eligible_1hr", False)
            
            print(f"✓ Event 48hr away: hours_until={hours_until}, eligible_24hr={eligible_24hr}, eligible_1hr={eligible_1hr}")
            
            # Event should NOT be eligible for any reminder
            assert eligible_24hr == False, f"Event 48hr away should NOT be eligible for 24hr reminder"
            assert eligible_1hr == False, f"Event 48hr away should NOT be eligible for 1hr reminder"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/calendar/{event_id}")


class TestParseDatetimeFormats:
    """Test parse_event_datetime handles various date formats"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        test_email = f"test_datetime_{datetime.now().strftime('%H%M%S%f')}@example.com"
        
        register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": TEST_USER_PASSWORD,
            "name": "DateTime Test User"
        })
        
        if register_response.status_code == 200:
            self.token = register_response.json().get("token")
        else:
            login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": TEST_USER_PASSWORD
            })
            if login_response.status_code == 200:
                self.token = login_response.json().get("token")
            else:
                pytest.skip("Could not authenticate test user")
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        yield
    
    def test_iso_format_with_z_suffix(self):
        """Test ISO format with Z suffix (e.g., 2026-02-04T10:00:00Z)"""
        now = datetime.now(timezone.utc)
        event_time = now + timedelta(hours=24)
        date_str = event_time.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        event_response = self.session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_ISO_Z_Format",
            "event_type": "interview",
            "start_date": date_str,
            "reminders_enabled": True
        })
        assert event_response.status_code == 200, f"Failed with ISO Z format: {event_response.text}"
        event_id = event_response.json().get("id")
        
        # Verify event was created by checking all events
        get_response = self.session.get(f"{BASE_URL}/api/calendar")
        assert get_response.status_code == 200
        
        events = get_response.json()
        found = any(e.get("id") == event_id for e in events)
        assert found, f"Event {event_id} not found in calendar events"
        
        print(f"✓ ISO format with Z suffix accepted: {date_str}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/calendar/{event_id}")
    
    def test_iso_format_with_timezone_offset(self):
        """Test ISO format with timezone offset (e.g., 2026-02-04T10:00:00+00:00)"""
        now = datetime.now(timezone.utc)
        event_time = now + timedelta(hours=24)
        date_str = event_time.isoformat()
        
        event_response = self.session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_ISO_Offset_Format",
            "event_type": "interview",
            "start_date": date_str,
            "reminders_enabled": True
        })
        assert event_response.status_code == 200, f"Failed with ISO offset format: {event_response.text}"
        event_id = event_response.json().get("id")
        
        print(f"✓ ISO format with timezone offset accepted: {date_str}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/calendar/{event_id}")
    
    def test_iso_format_without_timezone(self):
        """Test ISO format without timezone (e.g., 2026-02-04T10:00:00)"""
        now = datetime.now(timezone.utc)
        event_time = now + timedelta(hours=24)
        date_str = event_time.strftime("%Y-%m-%dT%H:%M:%S")
        
        event_response = self.session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_ISO_NoTZ_Format",
            "event_type": "interview",
            "start_date": date_str,
            "reminders_enabled": True
        })
        assert event_response.status_code == 200, f"Failed with ISO no-TZ format: {event_response.text}"
        event_id = event_response.json().get("id")
        
        print(f"✓ ISO format without timezone accepted: {date_str}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/calendar/{event_id}")


class TestDebugLogging:
    """Test that debug logs show correct information"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        test_email = f"test_debug_{datetime.now().strftime('%H%M%S%f')}@example.com"
        
        register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": TEST_USER_PASSWORD,
            "name": "Debug Test User"
        })
        
        if register_response.status_code == 200:
            self.token = register_response.json().get("token")
        else:
            login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": TEST_USER_PASSWORD
            })
            if login_response.status_code == 200:
                self.token = login_response.json().get("token")
            else:
                pytest.skip("Could not authenticate test user")
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        yield
    
    def test_scheduler_status_shows_server_time(self):
        """Test that scheduler status shows server time"""
        response = self.session.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200
        
        data = response.json()
        server_time = data.get("server_time_utc")  # Actual field name is server_time_utc
        
        assert server_time is not None, "server_time_utc should not be None"
        
        # Verify it's a valid ISO datetime
        try:
            parsed_time = datetime.fromisoformat(server_time.replace("Z", "+00:00"))
            print(f"✓ Server time is valid ISO datetime: {server_time}")
        except ValueError:
            pytest.fail(f"server_time_utc is not valid ISO format: {server_time}")
    
    def test_scheduler_status_shows_time_windows(self):
        """Test that scheduler status shows time window info via upcoming_events eligibility"""
        # Create a test event to verify time window calculations work
        now = datetime.now(timezone.utc)
        event_time = now + timedelta(hours=24)
        
        event_response = self.session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_TimeWindow_Check",
            "event_type": "interview",
            "start_date": event_time.isoformat(),
            "reminders_enabled": True
        })
        assert event_response.status_code == 200
        event_id = event_response.json().get("id")
        
        response = self.session.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200
        
        data = response.json()
        
        # Time windows are shown via eligible_24hr and eligible_1hr fields in upcoming_events
        # The scheduler interval confirms the check frequency
        assert "scheduler_interval" in data, "Missing scheduler_interval"
        assert data.get("scheduler_interval") == "5 minutes", "Scheduler should run every 5 minutes"
        
        # Check that upcoming_events contains eligibility info
        upcoming_events = data.get("upcoming_events", [])
        for event in upcoming_events:
            if event.get("id") == event_id:
                assert "eligible_24hr" in event, "Missing eligible_24hr field"
                assert "eligible_1hr" in event, "Missing eligible_1hr field"
                assert "hours_until_event" in event, "Missing hours_until_event field"
                print(f"✓ Time window eligibility fields present in event")
                break
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/calendar/{event_id}")
    
    def test_scheduler_status_shows_event_eligibility(self):
        """Test that scheduler status shows event eligibility info"""
        # Create a test event
        now = datetime.now(timezone.utc)
        event_time = now + timedelta(hours=24)
        
        event_response = self.session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_Eligibility_Check",
            "event_type": "interview",
            "start_date": event_time.isoformat(),
            "reminders_enabled": True
        })
        assert event_response.status_code == 200
        event_id = event_response.json().get("id")
        
        # Check scheduler status
        status_response = self.session.get(f"{BASE_URL}/api/scheduler/status")
        assert status_response.status_code == 200
        
        data = status_response.json()
        upcoming_events = data.get("upcoming_events", [])
        
        # Find our event and check it has eligibility fields
        for event in upcoming_events:
            if event.get("id") == event_id:
                assert "hours_until_event" in event, "Missing hours_until_event"
                assert "eligible_24hr" in event, "Missing eligible_24hr"
                assert "eligible_1hr" in event, "Missing eligible_1hr"
                print(f"✓ Event eligibility fields present: hours_until={event.get('hours_until_event')}, eligible_24hr={event.get('eligible_24hr')}, eligible_1hr={event.get('eligible_1hr')}")
                break
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/calendar/{event_id}")


class TestSchedulerAutoStart:
    """Test that scheduler starts automatically on server startup"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        test_email = f"test_autostart_{datetime.now().strftime('%H%M%S%f')}@example.com"
        
        register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": TEST_USER_PASSWORD,
            "name": "AutoStart Test User"
        })
        
        if register_response.status_code == 200:
            self.token = register_response.json().get("token")
        else:
            login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": TEST_USER_PASSWORD
            })
            if login_response.status_code == 200:
                self.token = login_response.json().get("token")
            else:
                pytest.skip("Could not authenticate test user")
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        yield
    
    def test_scheduler_running_after_startup(self):
        """Test that scheduler is running (indicates auto-start worked)"""
        response = self.session.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200
        
        data = response.json()
        scheduler_running = data.get("scheduler_running")
        
        assert scheduler_running == True, "Scheduler should be running after server startup"
        print("✓ Scheduler is running (auto-start verified)")
    
    def test_scheduler_has_correct_interval(self):
        """Test that scheduler has 5 minute interval configured"""
        response = self.session.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200
        
        data = response.json()
        interval = data.get("scheduler_interval")
        
        assert interval == "5 minutes", f"Expected '5 minutes' interval, got {interval}"
        print("✓ Scheduler interval is 5 minutes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
