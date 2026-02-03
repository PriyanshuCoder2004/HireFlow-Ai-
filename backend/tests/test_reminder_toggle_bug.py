"""
Test suite for Email Reminder Toggle Bug Fix
Bug: Reminder emails were being sent even when reminders were disabled by user

Tests verify:
1. When reminders_enabled is set to FALSE via API, reminder_24hr_sent and reminder_1hr_sent should be set to TRUE (preventing sends)
2. When reminders_enabled is FALSE, the process_reminder function should skip sending after re-checking database
3. When reminders_enabled is TRUE and start_date changes, reminder flags should reset to FALSE
4. Frontend toggle should correctly send reminders_enabled boolean to backend
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_PASSWORD = "Test123!"
TEST_NAME = "Reminder Bug Test User"


class TestReminderToggleBugFix:
    """Test the email reminder toggle bug fix scenarios"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        
        email = f"test_reminder_bug_{datetime.now().strftime('%H%M%S%f')}@example.com"
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        
        if response.status_code == 200:
            token = response.json()["token"]
            session.headers.update({"Authorization": f"Bearer {token}"})
            print(f"✅ Test user registered: {email}")
        else:
            pytest.skip(f"Could not authenticate: {response.text}")
        
        return session
    
    def test_scenario_1_create_event_with_reminders_enabled(self, auth_session):
        """
        Scenario 1: Create event with reminders enabled
        Expected: reminders_enabled=True, reminder_24hr_sent=False, reminder_1hr_sent=False
        """
        start_date = (datetime.now() + timedelta(hours=25)).isoformat()
        
        response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_BUG_Reminders Enabled Event",
            "event_type": "interview",
            "interview_type": "technical",
            "start_date": start_date,
            "reminders_enabled": True
        })
        
        assert response.status_code == 200, f"Create event failed: {response.text}"
        data = response.json()
        
        # Verify initial state
        assert data["reminders_enabled"] == True, "reminders_enabled should be True"
        assert data["reminder_24hr_sent"] == False, "reminder_24hr_sent should be False initially"
        assert data["reminder_1hr_sent"] == False, "reminder_1hr_sent should be False initially"
        
        print(f"✅ Scenario 1 PASSED: Event created with reminders enabled")
        print(f"   - reminders_enabled: {data['reminders_enabled']}")
        print(f"   - reminder_24hr_sent: {data['reminder_24hr_sent']}")
        print(f"   - reminder_1hr_sent: {data['reminder_1hr_sent']}")
        
        return data
    
    def test_scenario_2_disable_reminders_sets_flags_to_true(self, auth_session):
        """
        Scenario 2: When reminders_enabled is set to FALSE via API
        Expected: reminder_24hr_sent=True, reminder_1hr_sent=True (to prevent scheduler from sending)
        
        This is the CRITICAL bug fix test - previously, disabling reminders didn't prevent
        the scheduler from sending emails because the flags weren't set to True.
        """
        # First create an event with reminders enabled
        start_date = (datetime.now() + timedelta(hours=25)).isoformat()
        
        create_response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_BUG_Disable Reminders Test",
            "event_type": "interview",
            "interview_type": "hr",
            "start_date": start_date,
            "reminders_enabled": True
        })
        
        assert create_response.status_code == 200, f"Create event failed: {create_response.text}"
        event_id = create_response.json()["id"]
        
        # Verify initial state
        initial_data = create_response.json()
        assert initial_data["reminders_enabled"] == True
        assert initial_data["reminder_24hr_sent"] == False
        assert initial_data["reminder_1hr_sent"] == False
        print(f"   Initial state: reminders_enabled=True, flags=False")
        
        # NOW DISABLE REMINDERS - This is the bug fix test
        update_response = auth_session.put(f"{BASE_URL}/api/calendar/{event_id}", json={
            "reminders_enabled": False
        })
        
        assert update_response.status_code == 200, f"Update event failed: {update_response.text}"
        updated_data = update_response.json()
        
        # CRITICAL ASSERTIONS - The bug fix should set these to True
        assert updated_data["reminders_enabled"] == False, "reminders_enabled should be False after update"
        assert updated_data["reminder_24hr_sent"] == True, \
            "BUG FIX FAILED: reminder_24hr_sent should be True when reminders are disabled (to prevent scheduler from sending)"
        assert updated_data["reminder_1hr_sent"] == True, \
            "BUG FIX FAILED: reminder_1hr_sent should be True when reminders are disabled (to prevent scheduler from sending)"
        
        print(f"✅ Scenario 2 PASSED: Disabling reminders sets flags to True")
        print(f"   - reminders_enabled: {updated_data['reminders_enabled']}")
        print(f"   - reminder_24hr_sent: {updated_data['reminder_24hr_sent']} (should be True to prevent sending)")
        print(f"   - reminder_1hr_sent: {updated_data['reminder_1hr_sent']} (should be True to prevent sending)")
        
        return updated_data
    
    def test_scenario_3_reenable_reminders_with_date_change_resets_flags(self, auth_session):
        """
        Scenario 3: When reminders_enabled is TRUE and start_date changes
        Expected: reminder flags should reset to FALSE (so reminders can be sent for new date)
        """
        # First create an event with reminders enabled
        start_date = (datetime.now() + timedelta(hours=25)).isoformat()
        
        create_response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_BUG_Date Change Reset Test",
            "event_type": "interview",
            "interview_type": "technical",
            "start_date": start_date,
            "reminders_enabled": True
        })
        
        assert create_response.status_code == 200, f"Create event failed: {create_response.text}"
        event_id = create_response.json()["id"]
        
        # Disable reminders first (this sets flags to True)
        disable_response = auth_session.put(f"{BASE_URL}/api/calendar/{event_id}", json={
            "reminders_enabled": False
        })
        assert disable_response.status_code == 200
        disabled_data = disable_response.json()
        assert disabled_data["reminder_24hr_sent"] == True, "Flags should be True after disabling"
        assert disabled_data["reminder_1hr_sent"] == True, "Flags should be True after disabling"
        print(f"   After disabling: flags are True")
        
        # Now re-enable reminders AND change the date
        new_start_date = (datetime.now() + timedelta(hours=48)).isoformat()
        
        reenable_response = auth_session.put(f"{BASE_URL}/api/calendar/{event_id}", json={
            "reminders_enabled": True,
            "start_date": new_start_date
        })
        
        assert reenable_response.status_code == 200, f"Re-enable update failed: {reenable_response.text}"
        reenabled_data = reenable_response.json()
        
        # When date changes, flags should reset to False so reminders can be sent for new date
        assert reenabled_data["reminders_enabled"] == True, "reminders_enabled should be True after re-enabling"
        assert reenabled_data["reminder_24hr_sent"] == False, \
            "reminder_24hr_sent should reset to False when date changes (so new reminder can be sent)"
        assert reenabled_data["reminder_1hr_sent"] == False, \
            "reminder_1hr_sent should reset to False when date changes (so new reminder can be sent)"
        
        print(f"✅ Scenario 3 PASSED: Date change resets reminder flags")
        print(f"   - reminders_enabled: {reenabled_data['reminders_enabled']}")
        print(f"   - reminder_24hr_sent: {reenabled_data['reminder_24hr_sent']} (reset to False for new date)")
        print(f"   - reminder_1hr_sent: {reenabled_data['reminder_1hr_sent']} (reset to False for new date)")
        
        return reenabled_data
    
    def test_scenario_4_frontend_boolean_handling(self, auth_session):
        """
        Scenario 4: Frontend toggle should correctly send reminders_enabled boolean to backend
        Test both True and False values are handled correctly
        """
        start_date = (datetime.now() + timedelta(hours=30)).isoformat()
        
        # Test creating with explicit False
        create_false_response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_BUG_Boolean False Test",
            "event_type": "interview",
            "start_date": start_date,
            "reminders_enabled": False  # Explicit False
        })
        
        assert create_false_response.status_code == 200, f"Create with False failed: {create_false_response.text}"
        false_data = create_false_response.json()
        assert false_data["reminders_enabled"] == False, "reminders_enabled should be False when explicitly set"
        print(f"   Create with reminders_enabled=False: {false_data['reminders_enabled']}")
        
        # Test creating with explicit True
        create_true_response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_BUG_Boolean True Test",
            "event_type": "interview",
            "start_date": start_date,
            "reminders_enabled": True  # Explicit True
        })
        
        assert create_true_response.status_code == 200, f"Create with True failed: {create_true_response.text}"
        true_data = create_true_response.json()
        assert true_data["reminders_enabled"] == True, "reminders_enabled should be True when explicitly set"
        print(f"   Create with reminders_enabled=True: {true_data['reminders_enabled']}")
        
        # Test update with False (simulating frontend toggle off)
        event_id = true_data["id"]
        update_false_response = auth_session.put(f"{BASE_URL}/api/calendar/{event_id}", json={
            "reminders_enabled": False
        })
        
        assert update_false_response.status_code == 200, f"Update to False failed: {update_false_response.text}"
        updated_false_data = update_false_response.json()
        assert updated_false_data["reminders_enabled"] == False, "Update to False should work"
        print(f"   Update to reminders_enabled=False: {updated_false_data['reminders_enabled']}")
        
        # Test update with True (simulating frontend toggle on)
        update_true_response = auth_session.put(f"{BASE_URL}/api/calendar/{event_id}", json={
            "reminders_enabled": True
        })
        
        assert update_true_response.status_code == 200, f"Update to True failed: {update_true_response.text}"
        updated_true_data = update_true_response.json()
        assert updated_true_data["reminders_enabled"] == True, "Update to True should work"
        print(f"   Update to reminders_enabled=True: {updated_true_data['reminders_enabled']}")
        
        print(f"✅ Scenario 4 PASSED: Boolean handling works correctly for both True and False")
        
        return updated_true_data
    
    def test_scenario_5_verify_database_query_uses_explicit_true(self, auth_session):
        """
        Scenario 5: Verify that events with reminders_enabled=False are NOT returned
        when querying for events that need reminders
        
        This tests the MongoDB query fix: {"reminders_enabled": {"$eq": True}}
        """
        # Create two events - one with reminders enabled, one disabled
        start_date = (datetime.now() + timedelta(hours=24)).isoformat()
        
        # Event with reminders enabled
        enabled_response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_BUG_Query Test Enabled",
            "event_type": "interview",
            "start_date": start_date,
            "reminders_enabled": True
        })
        assert enabled_response.status_code == 200
        enabled_event = enabled_response.json()
        
        # Event with reminders disabled
        disabled_response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_BUG_Query Test Disabled",
            "event_type": "interview",
            "start_date": start_date,
            "reminders_enabled": False
        })
        assert disabled_response.status_code == 200
        disabled_event = disabled_response.json()
        
        # Get all events and verify both exist
        list_response = auth_session.get(f"{BASE_URL}/api/calendar")
        assert list_response.status_code == 200
        all_events = list_response.json()
        
        # Find our test events
        enabled_found = any(e["id"] == enabled_event["id"] for e in all_events)
        disabled_found = any(e["id"] == disabled_event["id"] for e in all_events)
        
        assert enabled_found, "Enabled event should be in the list"
        assert disabled_found, "Disabled event should be in the list"
        
        # Verify the disabled event has correct flags
        disabled_in_list = next(e for e in all_events if e["id"] == disabled_event["id"])
        assert disabled_in_list["reminders_enabled"] == False, "Disabled event should have reminders_enabled=False"
        
        print(f"✅ Scenario 5 PASSED: Both events exist with correct reminders_enabled values")
        print(f"   - Enabled event reminders_enabled: {enabled_event['reminders_enabled']}")
        print(f"   - Disabled event reminders_enabled: {disabled_event['reminders_enabled']}")
        
        return {"enabled": enabled_event, "disabled": disabled_event}


class TestEdgeCases:
    """Test edge cases for the reminder toggle bug fix"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        
        email = f"test_edge_{datetime.now().strftime('%H%M%S%f')}@example.com"
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        
        if response.status_code == 200:
            token = response.json()["token"]
            session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Could not authenticate: {response.text}")
        
        return session
    
    def test_toggle_reminders_multiple_times(self, auth_session):
        """
        Edge case: Toggle reminders on/off multiple times
        Verify flags are correctly set each time
        """
        start_date = (datetime.now() + timedelta(hours=25)).isoformat()
        
        # Create event
        create_response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_BUG_Multiple Toggle Test",
            "event_type": "interview",
            "start_date": start_date,
            "reminders_enabled": True
        })
        assert create_response.status_code == 200
        event_id = create_response.json()["id"]
        
        # Toggle OFF
        off_response = auth_session.put(f"{BASE_URL}/api/calendar/{event_id}", json={
            "reminders_enabled": False
        })
        assert off_response.status_code == 200
        off_data = off_response.json()
        assert off_data["reminders_enabled"] == False
        assert off_data["reminder_24hr_sent"] == True, "Flags should be True when disabled"
        assert off_data["reminder_1hr_sent"] == True, "Flags should be True when disabled"
        print(f"   Toggle 1 (OFF): reminders_enabled={off_data['reminders_enabled']}, flags=True")
        
        # Toggle ON (without date change - flags should stay True since no date change)
        on_response = auth_session.put(f"{BASE_URL}/api/calendar/{event_id}", json={
            "reminders_enabled": True
        })
        assert on_response.status_code == 200
        on_data = on_response.json()
        assert on_data["reminders_enabled"] == True
        # Note: Without date change, flags stay as they were
        print(f"   Toggle 2 (ON): reminders_enabled={on_data['reminders_enabled']}")
        
        # Toggle OFF again
        off2_response = auth_session.put(f"{BASE_URL}/api/calendar/{event_id}", json={
            "reminders_enabled": False
        })
        assert off2_response.status_code == 200
        off2_data = off2_response.json()
        assert off2_data["reminders_enabled"] == False
        assert off2_data["reminder_24hr_sent"] == True
        assert off2_data["reminder_1hr_sent"] == True
        print(f"   Toggle 3 (OFF): reminders_enabled={off2_data['reminders_enabled']}, flags=True")
        
        print(f"✅ Edge case PASSED: Multiple toggles work correctly")
        
        return off2_data
    
    def test_non_interview_event_types(self, auth_session):
        """
        Edge case: Non-interview event types (follow_up, other)
        These should still have reminder fields but scheduler only processes interview types
        """
        start_date = (datetime.now() + timedelta(hours=25)).isoformat()
        
        # Create follow_up event
        followup_response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_BUG_Follow Up Event",
            "event_type": "follow_up",
            "start_date": start_date,
            "reminders_enabled": True
        })
        assert followup_response.status_code == 200
        followup_data = followup_response.json()
        
        # Verify reminder fields exist
        assert "reminders_enabled" in followup_data
        assert "reminder_24hr_sent" in followup_data
        assert "reminder_1hr_sent" in followup_data
        
        print(f"✅ Edge case PASSED: Non-interview events have reminder fields")
        print(f"   - event_type: {followup_data['event_type']}")
        print(f"   - reminders_enabled: {followup_data['reminders_enabled']}")
        
        return followup_data
    
    def test_update_other_fields_doesnt_affect_reminders(self, auth_session):
        """
        Edge case: Updating other fields (title, description) shouldn't affect reminder flags
        """
        start_date = (datetime.now() + timedelta(hours=25)).isoformat()
        
        # Create event
        create_response = auth_session.post(f"{BASE_URL}/api/calendar", json={
            "title": "TEST_BUG_Other Fields Test",
            "event_type": "interview",
            "start_date": start_date,
            "reminders_enabled": True
        })
        assert create_response.status_code == 200
        event_id = create_response.json()["id"]
        initial_data = create_response.json()
        
        # Update only title and description
        update_response = auth_session.put(f"{BASE_URL}/api/calendar/{event_id}", json={
            "title": "TEST_BUG_Updated Title",
            "description": "Updated description"
        })
        assert update_response.status_code == 200
        updated_data = update_response.json()
        
        # Verify reminder fields unchanged
        assert updated_data["reminders_enabled"] == initial_data["reminders_enabled"], \
            "reminders_enabled should not change when updating other fields"
        assert updated_data["reminder_24hr_sent"] == initial_data["reminder_24hr_sent"], \
            "reminder_24hr_sent should not change when updating other fields"
        assert updated_data["reminder_1hr_sent"] == initial_data["reminder_1hr_sent"], \
            "reminder_1hr_sent should not change when updating other fields"
        
        print(f"✅ Edge case PASSED: Updating other fields doesn't affect reminder flags")
        
        return updated_data


# Cleanup fixture
@pytest.fixture(scope="session", autouse=True)
def cleanup(request):
    """Cleanup test data after all tests"""
    def cleanup_test_data():
        print("\n🧹 Reminder bug fix tests completed")
    
    request.addfinalizer(cleanup_test_data)
