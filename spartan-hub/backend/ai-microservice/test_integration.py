#!/usr/bin/env python3
"""
Test script to verify AI microservice integration
"""

import requests
import json
import time

def test_health_endpoint():
    """Test the health endpoint"""
    print("Testing health endpoint...")
    try:
        response = requests.get("http://127.0.0.1:8001/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Health check successful: {data}")
            return True
        else:
            print(f"✗ Health check failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Health check failed with error: {e}")
        return False

def test_predict_alert():
    """Test the predict alert endpoint"""
    print("\nTesting predict alert endpoint...")
    test_data = {
        "recovery_score": 75.5,
        "habit_adherence": 4.2,
        "stress_level": 3.0,
        "sleep_quality": 4.0,
        "workout_frequency": 5.0
    }
    
    try:
        response = requests.post(
            "http://127.0.0.1:8001/predict_alert",
            json=test_data,
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Predict alert successful: {data}")
            return True
        else:
            print(f"✗ Predict alert failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Predict alert failed with error: {e}")
        return False

def test_generate_decision():
    """Test the generate decision endpoint"""
    print("\nTesting generate decision endpoint...")
    test_data = {
        "PartituraSemanal": {
            "monday": {"workout": "strength", "intensity": 8},
            "tuesday": {"workout": "cardio", "intensity": 6}
        },
        "Causa": "Low recovery score detected",
        "PuntajeSinergico": 75.5
    }
    
    try:
        response = requests.post(
            "http://127.0.0.1:8001/generate_decision",
            json=test_data,
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Generate decision successful: {data}")
            return True
        else:
            print(f"✗ Generate decision failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Generate decision failed with error: {e}")
        return False

def main():
    """Main test function"""
    print("AI Microservice Integration Test")
    print("=" * 40)
    
    # Test health endpoint
    health_ok = test_health_endpoint()
    
    # Test predict alert endpoint
    alert_ok = test_predict_alert()
    
    # Test generate decision endpoint
    decision_ok = test_generate_decision()
    
    print("\n" + "=" * 40)
    if health_ok and alert_ok and decision_ok:
        print("✓ All tests passed!")
        return 0
    else:
        print("✗ Some tests failed!")
        return 1

if __name__ == "__main__":
    exit(main())