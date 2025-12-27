#!/usr/bin/env python3
"""
Richgang FX Indice Killer - Backend API Testing
Tests all endpoints with owner and client authentication
"""

import requests
import sys
import json
from datetime import datetime

class RichgangAPITester:
    def __init__(self, base_url="https://richgang-signals.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.owner_token = None
        self.client_token = None
        self.client_code = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, auth_token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if auth_token:
            test_headers['Authorization'] = f'Bearer {auth_token}'

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                self.log(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "ERROR")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_owner_login(self):
        """Test owner login with master code"""
        success, response = self.run_test(
            "Owner Login",
            "POST",
            "auth/login",
            200,
            data={"code": "RICHGANG2024"}
        )
        if success and 'token' in response:
            self.owner_token = response['token']
            self.log(f"✅ Owner token acquired: {self.owner_token[:20]}...")
            return True
        return False

    def test_invalid_login(self):
        """Test login with invalid code"""
        return self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"code": "INVALID_CODE"}
        )

    def test_auth_verify(self):
        """Test token verification"""
        if not self.owner_token:
            self.log("❌ No owner token available for verification test", "ERROR")
            return False
        
        return self.run_test(
            "Auth Verify",
            "POST",
            "auth/verify",
            200,
            auth_token=self.owner_token
        )

    def test_create_access_code(self):
        """Test creating client access code"""
        if not self.owner_token:
            self.log("❌ No owner token available for access code creation", "ERROR")
            return False
        
        success, response = self.run_test(
            "Create Access Code",
            "POST",
            "access-codes",
            200,
            data={"name": "Test Client"},
            auth_token=self.owner_token
        )
        if success and 'code' in response:
            self.client_code = response['code']
            self.log(f"✅ Client code created: {self.client_code}")
            return True
        return False

    def test_get_access_codes(self):
        """Test getting all access codes"""
        if not self.owner_token:
            self.log("❌ No owner token available", "ERROR")
            return False
        
        return self.run_test(
            "Get Access Codes",
            "GET",
            "access-codes",
            200,
            auth_token=self.owner_token
        )

    def test_client_login(self):
        """Test client login with generated code"""
        if not self.client_code:
            self.log("❌ No client code available for login test", "ERROR")
            return False
        
        success, response = self.run_test(
            "Client Login",
            "POST",
            "auth/login",
            200,
            data={"code": self.client_code}
        )
        if success and 'token' in response:
            self.client_token = response['token']
            self.log(f"✅ Client token acquired: {self.client_token[:20]}...")
            return True
        return False

    def test_market_data(self):
        """Test market data endpoints"""
        if not self.client_token:
            self.log("❌ No client token available", "ERROR")
            return False
        
        # Test all markets endpoint
        success1, _ = self.run_test(
            "Get All Market Data",
            "GET",
            "market",
            200,
            auth_token=self.client_token
        )
        
        # Test individual market endpoints
        success2 = True
        for symbol in ["US30", "US100", "GER30"]:
            success, _ = self.run_test(
                f"Get {symbol} Market Data",
                "GET",
                f"market/{symbol}",
                200,
                auth_token=self.client_token
            )
            success2 = success2 and success
        
        return success1 and success2

    def test_signals(self):
        """Test signals endpoints"""
        if not self.client_token:
            self.log("❌ No client token available", "ERROR")
            return False
        
        # Test get active signals
        success1, _ = self.run_test(
            "Get Active Signals",
            "GET",
            "signals",
            200,
            auth_token=self.client_token
        )
        
        # Test get pending signals
        success2, _ = self.run_test(
            "Get Pending Signals",
            "GET",
            "signals/pending",
            200,
            auth_token=self.client_token
        )
        
        return success1 and success2

    def test_direction_state(self):
        """Test direction state endpoints"""
        if not self.client_token:
            self.log("❌ No client token available", "ERROR")
            return False
        
        return self.run_test(
            "Get Direction State",
            "GET",
            "direction",
            200,
            auth_token=self.client_token
        )

    def test_sessions(self):
        """Test session status endpoint"""
        if not self.client_token:
            self.log("❌ No client token available", "ERROR")
            return False
        
        return self.run_test(
            "Get Session Status",
            "GET",
            "sessions",
            200,
            auth_token=self.client_token
        )

    def test_price_history(self):
        """Test price history endpoints"""
        if not self.client_token:
            self.log("❌ No client token available", "ERROR")
            return False
        
        success = True
        for symbol in ["US30", "US100", "GER30"]:
            result, _ = self.run_test(
                f"Get {symbol} Price History",
                "GET",
                f"history/{symbol}",
                200,
                auth_token=self.client_token
            )
            success = success and result
        
        return success

    def test_owner_functions(self):
        """Test owner-only functions"""
        if not self.owner_token:
            self.log("❌ No owner token available", "ERROR")
            return False
        
        # Test direction reset
        success1, _ = self.run_test(
            "Reset Direction",
            "POST",
            "direction/reset",
            200,
            auth_token=self.owner_token
        )
        
        # Test signal generation
        success2, _ = self.run_test(
            "Generate Signal",
            "POST",
            "signals/generate?symbol=US30",
            200,
            auth_token=self.owner_token
        )
        
        return success1 and success2

    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        # Test without token
        success1, _ = self.run_test(
            "Unauthorized Market Access",
            "GET",
            "market",
            401
        )
        
        # Test client accessing owner endpoints
        if self.client_token:
            success2, _ = self.run_test(
                "Client Accessing Owner Endpoint",
                "GET",
                "access-codes",
                403,
                auth_token=self.client_token
            )
        else:
            success2 = True  # Skip if no client token
        
        return success1 and success2

    def run_all_tests(self):
        """Run complete test suite"""
        self.log("🚀 Starting Richgang FX API Test Suite")
        self.log(f"Testing against: {self.base_url}")
        
        # Basic connectivity
        self.test_root_endpoint()
        
        # Authentication tests
        self.test_owner_login()
        self.test_invalid_login()
        self.test_auth_verify()
        
        # Access code management
        self.test_create_access_code()
        self.test_get_access_codes()
        self.test_client_login()
        
        # Market data tests
        self.test_market_data()
        
        # Signal tests
        self.test_signals()
        
        # Direction and session tests
        self.test_direction_state()
        self.test_sessions()
        
        # Price history tests
        self.test_price_history()
        
        # Owner functions
        self.test_owner_functions()
        
        # Security tests
        self.test_unauthorized_access()
        
        # Cleanup - delete test access code
        if self.client_code and self.owner_token:
            # Find the code ID first
            success, codes = self.run_test(
                "Get Codes for Cleanup",
                "GET",
                "access-codes",
                200,
                auth_token=self.owner_token
            )
            if success:
                for code in codes:
                    if code.get('code') == self.client_code:
                        self.run_test(
                            "Delete Test Access Code",
                            "DELETE",
                            f"access-codes/{code['id']}",
                            200,
                            auth_token=self.owner_token
                        )
                        break

    def print_summary(self):
        """Print test results summary"""
        self.log("=" * 60)
        self.log(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            self.log("❌ Failed Tests:")
            for failure in self.failed_tests:
                self.log(f"   - {failure.get('test', 'Unknown')}: {failure}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"✅ Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = RichgangAPITester()
    tester.run_all_tests()
    success = tester.print_summary()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())