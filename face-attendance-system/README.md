# Project Documentation Update: Face Attendance System

## Overview

This project is a **Next.js** web application integrated with a FastAPI backend for face recognition-based attendance. The stack utilizes DeepFace's **Facenet512** model with KNN classification for robust, secure, resource-efficient face registration and real-time recognition.

## Quick Start

1. **Frontend**
   - In the project root, install dependencies and start the Next.js app:
     ```bash
     npm install
     npm run dev
     ```
   - Open [http://localhost:3000](http://localhost:3000) to use the app.

2. **Backend**
   - Install dependencies (including FastAPI, DeepFace, scikit-learn, Supabase client, and cv2).
   - Start the backend server (example if your backend is in `face-backend/main.py`):
     ```bash
     cd face-backend
     pip install -r requirements.txt
     uvicorn main:app --reload --host 0.0.0.0 --port 8000
     ```
   - Backend URL should be `http://localhost:8000`.

3. **Database & Storage**
   - Ensure Supabase tables are set up for `students`, `face_embeddings`, `attendance`, `mobile_sessions`, etc.
   - Configure your `.env.local` (frontend) and `.env` (backend) with the correct Supabase URL and API keys.

## Face Recognition Pipeline

- **Model:** `Facenet512` (via DeepFace).  
  *MobileFaceNet and ArcFace are not used due to resource or compatibility reasons.*
- **Classifier:** KNN (`n_neighbors=1`, scikit-learn).
- **Registration:** Only sharp, high-quality face images are accepted (sharpness threshold enforced).
- **Recognition:** Matching uses a KNN classifier with a configurable distance threshold to reject weak matches.

## How to Use

### Registration

1. Navigate to the admin registration screen.
2. Enter student details and upload up to 5 clear, well-lit face images. Blurry images will be automatically rejected.
3. On completion, valid images are embedded, stored, and associated with the new student record.

### Recognition

1. User approaches camera on the attendance screen (mobile or desktop).
2. The app auto-captures and submits a live image every few seconds.
3. The backend recognizes faces with one of four UI states:
   - **Blue:** Scanning for faces (loading, or between detections)
   - **Green:** Matched (student recognized for first time in session)
   - **Yellow:** Already marked (student recognized again in same session)
   - **Red:** Face not recognized or no face detected

## API Endpoints

### `POST /register`
- Form fields: `name`, `usn`, `class_`, `subjects`, `phone`, `guardianEmail`, `guardianPhone`
- Files: up to 5 face images (`files`)
- **Response:**  
  - On success: saved image URLs, warnings about rejected images (with detailed reasons), debug information.

### `POST /recognize`
- File: one image (`file`)
- **Response:**  
  - `{"status": "success", "usn": ""}`
  - `{"status": "already-marked", ...}`
  - `{"status": "no-match", ...}` or `{"status": "no-face", ...}`

### `POST /cleanup_blurry`
- Utility endpoint (admin use): removes all images and embeddings with sharpness below the configured threshold. Use this after updating image quality standards.

## Thresholds & Quality Checks

- **Image sharpness threshold:** Images below the configured value (default: 100, recommend tuning 150–200 for deployments) are not processed or stored.
- **Recognition distance threshold:** Only matches within a set distance (default: 0.5 for Facenet512) are accepted; otherwise, the status is `"no-match"`.

## Troubleshooting & Best Practices

- Only register students with high-quality, well-lit, sharp face images.
- If recognition fails, verify the student was registered with clear photos and that the database was cleared of blurry/legacy data.
- Monitor debug logs during registration and recognition for sharpness and KNN distance values to further tune thresholds.
- For new machines/accounts, always update the Supabase credentials and URLs in both frontend and backend `.env` files.

## Upgrading or Migrating Accounts

- **Chats and history are tied to your account.** If you switch accounts, your previous chats, registration, and attendance data will not be available. Each new account starts with fresh data and settings.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [DeepFace Documentation](https://github.com/serengil/deepface)
- [Supabase Documentation](https://supabase.com/docs)

## Changelog (Migration Note)

- As of 2024-XX-XX, **Facenet512** (DeepFace) is the exclusive embedding model.
- ArcFace/MobileFaceNet and legacy models are deprecated.
- KNN classifier is used for all recognition.
- Only images passing a sharpness threshold are processed/stored.
- Recognition endpoint uses a distance threshold to prevent false matches.

## TODO

- Update and maintain this README if/when pipeline, models, or endpoints change.
- Consider exporting and saving your registration data before switching or resetting accounts.
- Add diagrams or screenshots to illustrate the state/status flows for the attendance interface.

[1] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/67820234/9057341a-59c5-42b7-8b99-937405c1839a/paste.txt
[2] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/67820234/086fd25b-613b-4cf1-9236-7e48099597c1/paste.txt
[3] https://nextjs.org
[4] https://nextjs.org/docs/app/api-reference/cli/create-next-app

---

## **Step 1: Download TinyFaceDetector Model Files**

You need the following files for TinyFaceDetector:
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1` (and possibly more shards, but usually just one for TinyFaceDetector)

**Official download link:**  
- [https://github.com/justadudewhohacks/face-api.js-models/tree/master/weights](https://github.com/justadudewhohacks/face-api.js-models/tree/master/weights)

**Direct links:**
- [tiny_face_detector_model-weights_manifest.json](https://github.com/justadudewhohacks/face-api.js-models/raw/master/weights/tiny_face_detector_model-weights_manifest.json)
- [tiny_face_detector_model-shard1](https://github.com/justadudewhohacks/face-api.js-models/raw/master/weights/tiny_face_detector_model-shard1)

---

## **Step 2: Where to Place the Files**

1. **Create a directory in your project:**  
   `face-attendance-system/public/models`

2. **Place the downloaded files in that directory:**  
   ```
   face-attendance-system/
     public/
       models/
         tiny_face_detector_model-weights_manifest.json
         tiny_face_detector_model-shard1
   ```

---

## **Step 3: The Code Will Load the Models Automatically**

Your code already contains:
```js
<code_block_to_apply_changes_from>
```
This will load the model from `/models` (which maps to `public/models` in Next.js).

---

## **Step 4: Restart Your Frontend**

- After placing the files, restart your Next.js frontend (`npm run dev`).
- Open the attendance page. The face detection should now work for real!

---

## **Summary Table**

| File to Download                                   | Place in Project Directory                |
|----------------------------------------------------|-------------------------------------------|
| tiny_face_detector_model-weights_manifest.json     | public/models/                            |
| tiny_face_detector_model-shard1                    | public/models/                            |

---

## **Reference**

- [face-api.js Model Weights Repo](https://github.com/justadudewhohacks/face-api.js-models)
- [face-api.js Documentation](https://github.com/justadudewhohacks/face-api.js#face-detection)

---

**Let me know if you need help with the download or want to support more face-api.js features!**