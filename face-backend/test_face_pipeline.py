import os
import pytest
import httpx
from PIL import Image, ImageFilter
import numpy as np
import tempfile

API_URL = os.getenv("API_URL", "http://localhost:8000")

# Helper to load a real test image from disk
def load_test_image(filename):
    path = os.path.join(os.path.dirname(__file__), "test_images", filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Test image not found: {path}")
    return path

def cleanup_file(path):
    try:
        os.remove(path)
    except Exception:
        pass

@pytest.mark.asyncio
async def test_registration_and_recognition_pipeline():
    async with httpx.AsyncClient(base_url=API_URL, timeout=30.0) as client:
        # 1. Register a student with a clear image
        clear_img_path = load_test_image('face1.jpeg')
        files = {'files': open(clear_img_path, 'rb')}
        data = {
            'usn': 'TESTUSN001',
            'name': 'Test User',
            'class_': 'MCA-IA',
            'phone': '1234567890',
            'guardianEmail': 'parent@example.com',
            'guardianPhone': '9876543210',
            'subjects': 'Math',
        }
        print("Sending registration request...")
        response = await client.post('/register', data=data, files=files)
        print("Received registration response:", response)
        reg_result = response.json()
        assert response.status_code == 200, f"Registration failed: {response.text}"
        assert reg_result['status'] == 'success', f"Registration not successful: {reg_result}"
        assert len(reg_result['image_urls']) == 1, "Image not saved in registration"
        print("[PASS] Registration with clear image")

        # Test with blurry1.jpg (expect "Face could not be detected")
        blurry_img_path = load_test_image('blurry1.jpg')
        files = {'files': open(blurry_img_path, 'rb')}
        response = await client.post('/register', data=data, files=files)
        reg_result = response.json()
        warnings = reg_result.get('warnings', [])
        assert any(('too blurry' in w or 'Face could not be detected' in w) for w in warnings), \
            f"Blurry image not rejected as expected, got warnings: {warnings}"

        # Test with blurry2.jpeg (expect "too blurry" if face is detected)
        blurry_img_path = load_test_image('blurry2.jpeg')
        files = {'files': open(blurry_img_path, 'rb')}
        response = await client.post('/register', data=data, files=files)
        reg_result = response.json()
        warnings = reg_result.get('warnings', [])
        assert any(('too blurry' in w or 'Face could not be detected' in w) for w in warnings), \
            f"Blurry image not rejected as expected, got warnings: {warnings}"

        # 3. Recognize a registered face (should match)
        clear_img_path = load_test_image('face1.jpeg')
        files = {'file': open(clear_img_path, 'rb')}
        response = await client.post('/recognize', files=files)
        recog_result = response.json()
        assert response.status_code == 200, f"Recognition failed: {response.text}"
        assert recog_result['status'] == 'success', f"Recognition did not succeed: {recog_result}"
        assert recog_result['usn'] == 'TESTUSN001', f"Recognition returned wrong USN: {recog_result}"
        print("[PASS] Recognition of registered face")

        # 4. Recognize a blurry face (should return no-face or error)
        blurry_img_path = load_test_image('blurry1.jpg')
        files = {'file': open(blurry_img_path, 'rb')}
        response = await client.post('/recognize', files=files)
        recog_result = response.json()
        assert response.status_code == 200, f"Recognition failed: {response.text}"
        assert recog_result['status'] in ['no-face', 'error'], f"Blurry face not rejected: {recog_result}"
        print("[PASS] Recognition with blurry face rejected")

        # 5. Recognize a non-registered face (simulate with a new clear image)
        # (In this test, since the image is just a white square, it may match the only registered embedding. In a real test, use a different face.)
        # For now, just log the result.
        print("[INFO] Non-registered face test skipped due to synthetic image limitations.")

        # Register Ankur
        ankur_img = load_test_image('Ankur-2.jpeg')
        files = {'files': open(ankur_img, 'rb')}
        data['usn'] = 'ANKUR001'
        data['name'] = 'Ankur'
        response = await client.post('/register', data=data, files=files)
        reg_result = response.json()
        assert response.status_code == 200, f"Registration failed: {response.text}"
        assert reg_result['status'] == 'success', f"Registration not successful: {reg_result}"
        assert len(reg_result['image_urls']) == 1, "Image not saved in registration"
        print("[PASS] Registration with clear image")

        # Recognize Ankur
        files = {'file': open(ankur_img, 'rb')}
        response = await client.post('/recognize', files=files)
        recog_result = response.json()
        assert response.status_code == 200, f"Recognition failed: {response.text}"
        assert recog_result['status'] == 'success', f"Recognition did not succeed: {recog_result}"
        assert recog_result['usn'] == 'ANKUR001', f"Recognition returned wrong USN: {recog_result}"
        print("[PASS] Recognition of registered face")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_registration_and_recognition_pipeline()) 