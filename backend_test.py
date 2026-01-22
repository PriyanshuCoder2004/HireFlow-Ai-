#!/usr/bin/env python3
"""
HireFlow AI Backend API Testing Suite
Tests all authentication and job application CRUD operations
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class HireFlowAPITester:
    def __init__(self, base_url: str = "https://talent-ai-13.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200) -> tuple[bool, Dict[str, Any]]:
        """Make HTTP request and validate response"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            if not success:
                response_data["expected_status"] = expected_status
                response_data["actual_status"] = response.status_code

            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test API health endpoint"""
        success, response = self.make_request('GET', '')
        self.log_test("Health Check", success, 
                     "" if success else f"API not responding: {response}")
        return success

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.make_request('POST', 'auth/register', test_user)
        
        if success and 'token' in response and 'user' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.test_user_email = test_user['email']
            self.log_test("User Registration", True)
            return True
        else:
            self.log_test("User Registration", False, 
                         f"Missing token or user in response: {response}")
            return False

    def test_user_login(self):
        """Test user login with registered credentials"""
        if not hasattr(self, 'test_user_email'):
            self.log_test("User Login", False, "No test user email available")
            return False
            
        login_data = {
            "email": self.test_user_email,
            "password": "TestPass123!"
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data)
        
        if success and 'token' in response:
            self.token = response['token']  # Update token
            self.log_test("User Login", True)
            return True
        else:
            self.log_test("User Login", False, f"Login failed: {response}")
            return False

    def test_protected_route_access(self):
        """Test accessing protected route with JWT token"""
        success, response = self.make_request('GET', 'auth/me')
        
        if success and 'id' in response:
            self.log_test("Protected Route Access", True)
            return True
        else:
            self.log_test("Protected Route Access", False, 
                         f"Failed to access protected route: {response}")
            return False

    def test_create_job_application(self):
        """Test creating a job application"""
        app_data = {
            "company": "Test Company Inc",
            "position": "Senior Software Engineer",
            "job_url": "https://testcompany.com/jobs/123",
            "job_description": "We are looking for a senior software engineer with 5+ years experience in Python and React.",
            "status": "applied",
            "notes": "Applied through company website",
            "applied_date": "2025-01-15"
        }
        
        success, response = self.make_request('POST', 'applications', app_data, 200)
        
        if success and 'id' in response:
            self.test_app_id = response['id']
            self.log_test("Create Job Application", True)
            return True
        else:
            self.log_test("Create Job Application", False, 
                         f"Failed to create application: {response}")
            return False

    def test_get_job_applications(self):
        """Test retrieving job applications"""
        success, response = self.make_request('GET', 'applications')
        
        if success and isinstance(response, list):
            self.log_test("Get Job Applications", True)
            return True
        else:
            self.log_test("Get Job Applications", False, 
                         f"Failed to get applications: {response}")
            return False

    def test_get_single_application(self):
        """Test retrieving a single job application"""
        if not hasattr(self, 'test_app_id'):
            self.log_test("Get Single Application", False, "No test application ID available")
            return False
            
        success, response = self.make_request('GET', f'applications/{self.test_app_id}')
        
        if success and response.get('id') == self.test_app_id:
            self.log_test("Get Single Application", True)
            return True
        else:
            self.log_test("Get Single Application", False, 
                         f"Failed to get single application: {response}")
            return False

    def test_update_job_application(self):
        """Test updating a job application"""
        if not hasattr(self, 'test_app_id'):
            self.log_test("Update Job Application", False, "No test application ID available")
            return False
            
        update_data = {
            "status": "interviewing",
            "notes": "Updated: Phone screening scheduled for next week"
        }
        
        success, response = self.make_request('PUT', f'applications/{self.test_app_id}', update_data)
        
        if success and response.get('status') == 'interviewing':
            self.log_test("Update Job Application", True)
            return True
        else:
            self.log_test("Update Job Application", False, 
                         f"Failed to update application: {response}")
            return False

    def test_filter_applications_by_status(self):
        """Test filtering applications by status"""
        success, response = self.make_request('GET', 'applications?status=interviewing')
        
        if success and isinstance(response, list):
            # Check if all returned applications have the correct status
            all_correct_status = all(app.get('status') == 'interviewing' for app in response)
            if all_correct_status:
                self.log_test("Filter Applications by Status", True)
                return True
            else:
                self.log_test("Filter Applications by Status", False, 
                             "Some applications don't have the filtered status")
                return False
        else:
            self.log_test("Filter Applications by Status", False, 
                         f"Failed to filter applications: {response}")
            return False

    def test_delete_job_application(self):
        """Test deleting a job application"""
        if not hasattr(self, 'test_app_id'):
            self.log_test("Delete Job Application", False, "No test application ID available")
            return False
            
        success, response = self.make_request('DELETE', f'applications/{self.test_app_id}', expected_status=200)
        
        if success:
            self.log_test("Delete Job Application", True)
            return True
        else:
            self.log_test("Delete Job Application", False, 
                         f"Failed to delete application: {response}")
            return False

    def test_analytics_endpoint(self):
        """Test analytics endpoint"""
        success, response = self.make_request('GET', 'analytics')
        
        if success and 'total_applications' in response:
            self.log_test("Analytics Endpoint", True)
            return True
        else:
            self.log_test("Analytics Endpoint", False, 
                         f"Analytics endpoint failed: {response}")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting HireFlow AI Backend API Tests")
        print("=" * 50)
        
        # Health check first
        if not self.test_health_check():
            print("❌ API is not responding. Stopping tests.")
            return False
        
        # Authentication tests
        if not self.test_user_registration():
            print("❌ User registration failed. Stopping tests.")
            return False
            
        if not self.test_user_login():
            print("❌ User login failed. Stopping tests.")
            return False
            
        if not self.test_protected_route_access():
            print("❌ Protected route access failed. Stopping tests.")
            return False
        
        # Job application CRUD tests
        self.test_create_job_application()
        self.test_get_job_applications()
        self.test_get_single_application()
        self.test_update_job_application()
        self.test_filter_applications_by_status()
        self.test_analytics_endpoint()
        self.test_delete_job_application()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test runner"""
    tester = HireFlowAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": f"{(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%",
        "all_passed": success,
        "test_details": tester.test_results
    }
    
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())