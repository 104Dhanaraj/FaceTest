# MIGRATION NOTE: As of [MIGRATION DATE], this backend exclusively uses Facenet512 (via DeepFace) for all face embedding and recognition. ArcFace is NOT used due to high resource requirements; MobileFaceNet is not available in this DeepFace build. Facenet512 is chosen for its high accuracy and low resource usage. KNN (n_neighbors=1) is the sole classifier. See README for details.
#3.Music/face-backend/main.py
import os
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from deepface import DeepFace
from sklearn.neighbors import KNeighborsClassifier
from dotenv import load_dotenv
from supabase import create_client, Client
import tempfile
import uuid
from typing import List
from PIL import Image
import time
import cv2

# Load environment variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

# Allow CORS for local/dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://localhost:3001",
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper: get all embeddings and usns from Supabase
def fetch_embeddings():
    data = supabase.table("face_embeddings").select("usn, embedding").execute().data
    embeddings = []
    usns = []
    for row in data:
        if row["embedding"] is not None:
            embeddings.append(row["embedding"])
            usns.append(row["usn"])
    return np.array(embeddings), np.array(usns)

# Helper: save embedding to Supabase
def save_embedding(usn, embedding, image_url=None, source="register", model="Facenet512", sharpness=None):
    supabase.table("face_embeddings").insert({
        "id": str(uuid.uuid4()),
        "usn": usn,
        "embedding": embedding,
        "image_url": image_url,
        "source": source,
        "model": model,
        "sharpness": sharpness
    }).execute()

def calculate_sharpness(image_path):
    img = np.array(Image.open(image_path).convert('L'))
    laplacian = cv2.Laplacian(img, cv2.CV_64F)
    return float(laplacian.var())

# Registration endpoint
@app.post("/register")
async def register(
    usn: str = Form(...),
    name: str = Form(...),
    class_: str = Form(...),
    phone: str = Form(None),
    guardianEmail: str = Form(None),
    guardianPhone: str = Form(None),
    subjects: List[str] = Form([]),
    files: List[UploadFile] = File(...)
):
    image_urls = []
    sharpnesses = []
    warnings = []
    debug_log = []
    SHARPNESS_THRESHOLD = 100  # Raised threshold for stricter filtering
    for file in files:
        debug_step = {"filename": file.filename}
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        debug_step["tmp_path"] = tmp_path
        try:
            print(f"[DEBUG] Processing file: {file.filename}, temp path: {tmp_path}")
            reps = DeepFace.represent(
                img_path=tmp_path,
                model_name="Facenet512",
                detector_backend="retinaface",
                enforce_detection=True
            )
            print(f"[DEBUG] DeepFace.represent output: {reps}")
            debug_step["deepface_reps"] = str(reps)
            if not reps or "embedding" not in reps[0] or "facial_area" not in reps[0]:
                msg = f"No face detected in {file.filename}, skipping."
                warnings.append(msg)
                debug_step["error"] = msg
                print(f"[WARN] {msg}")
                debug_log.append(debug_step)
                continue
            embedding = reps[0]["embedding"]
            facial_area = reps[0]["facial_area"]
            img = Image.open(tmp_path)
            x, y, w, h = facial_area["x"], facial_area["y"], facial_area["w"], facial_area["h"]
            cropped = img.crop((x, y, x+w, y+h)).resize((224, 224))
            cropped_path = tmp_path + "_cropped.jpg"
            cropped.save(cropped_path)
            debug_step["cropped_path"] = cropped_path
            sharpness = calculate_sharpness(cropped_path)
            debug_step["sharpness"] = sharpness
            print(f"[DEBUG] Sharpness for {file.filename}: {sharpness}")
            if sharpness < SHARPNESS_THRESHOLD:
                msg = f"Image {file.filename} is too blurry (sharpness={sharpness:.1f} < threshold={SHARPNESS_THRESHOLD}), skipping."
                warnings.append(msg)
                debug_step["error"] = msg
                print(f"[WARN] {msg}")
                debug_log.append(debug_step)
                # Do NOT upload or save embedding for blurry images
                continue
            # Upload cropped face to Supabase Storage
            file_ext = file.filename.split('.')[-1]
            unique_name = f"{usn}_{uuid.uuid4()}.{file_ext}"
            file_path = f"students/{usn}/{unique_name}"
            try:
                with open(cropped_path, "rb") as fimg:
                    upload_result = supabase.storage.from_("student-images").upload(file_path, fimg, {"upsert": "true"})
                print(f"[DEBUG] Supabase upload result: {upload_result}")
                debug_step["upload_result"] = str(upload_result)
                image_url = supabase.storage.from_("student-images").get_public_url(file_path)
                print(f"[DEBUG] Supabase public URL: {image_url}")
                debug_step["image_url"] = image_url
                if not image_url:
                    msg = f"Failed to get public URL for {file.filename}"
                    warnings.append(msg)
                    debug_step["error"] = msg
                    print(f"[WARN] {msg}")
                    debug_log.append(debug_step)
                    continue
            except Exception as e:
                msg = f"Upload failed for {file.filename}: {str(e)}"
                warnings.append(msg)
                debug_step["error"] = msg
                print(f"[ERROR] {msg}")
                debug_log.append(debug_step)
                continue
            try:
                save_embedding(usn, embedding, image_url=image_url, sharpness=sharpness, model="Facenet512")
                print(f"[DEBUG] Embedding saved for {file.filename}")
                debug_step["embedding_saved"] = True
            except Exception as e:
                msg = f"Embedding DB insert failed for {file.filename}: {str(e)}"
                warnings.append(msg)
                debug_step["error"] = msg
                print(f"[ERROR] {msg}")
                debug_log.append(debug_step)
                continue
            image_urls.append(image_url)
            sharpnesses.append(sharpness)
            debug_step["success"] = True
            debug_log.append(debug_step)
            # Only now delete cropped file
            os.remove(cropped_path)
        except Exception as e:
            msg = f"Embedding or upload failed for {file.filename}: {str(e)}"
            warnings.append(msg)
            debug_step["error"] = msg
            print(f"[ERROR] {msg}")
            debug_log.append(debug_step)
        finally:
            # Only delete temp file at the end
            try:
                os.remove(tmp_path)
            except Exception as e:
                print(f"[WARN] Failed to delete temp file {tmp_path}: {e}")
    # Insert or update student record
    try:
        student_exists = supabase.table("students").select("id").eq("usn", usn).execute().data
        print(f"[DEBUG] Student exists: {student_exists}")
        if not student_exists:
            insert_result = supabase.table("students").insert({
                "usn": usn,
                "name": name,
                "class": class_,
                "subjects": subjects,
                "phone_number": phone,
                "guardian_email": guardianEmail,
                "guardian_phone": guardianPhone,
                "image_urls": image_urls,
            }).execute()
            print(f"[DEBUG] Student insert result: {insert_result}")
        else:
            update_result = supabase.table("students").update({"image_urls": image_urls}).eq("usn", usn).execute()
            print(f"[DEBUG] Student update result: {update_result}")
    except Exception as e:
        msg = f"Student DB insert/update failed: {str(e)}"
        warnings.append(msg)
        print(f"[ERROR] {msg}")
    print(f"[SUMMARY] Registration for USN {usn}: {len(image_urls)} images saved, {len(warnings)} warnings.")
    print(f"[SUMMARY] Warnings: {warnings}")
    print(f"[SUMMARY] Debug log: {debug_log}")
    return {"status": "success", "usn": usn, "image_urls": image_urls, "sharpnesses": sharpnesses, "warnings": warnings, "debug_log": debug_log}

# Utility endpoint: Clean up blurry embeddings and images from DB and storage
def delete_blurry_embeddings_and_images(sharpness_threshold=100):
    print(f"[CLEANUP] Removing embeddings and images with sharpness below {sharpness_threshold}")
    data = supabase.table("face_embeddings").select("id, usn, image_url, sharpness").execute().data
    for row in data:
        if row.get("sharpness") is not None and row["sharpness"] < sharpness_threshold:
            # Delete from storage
            image_url = row.get("image_url")
            if image_url:
                # Extract path after bucket name
                try:
                    path = image_url.split("student-images/")[-1].split("?")[0]
                    supabase.storage.from_("student-images").remove([path])
                    print(f"[CLEANUP] Deleted image from storage: {path}")
                except Exception as e:
                    print(f"[CLEANUP] Failed to delete image: {e}")
            # Delete from embeddings table
            try:
                supabase.table("face_embeddings").delete().eq("id", row["id"]).execute()
                print(f"[CLEANUP] Deleted embedding id: {row['id']}")
            except Exception as e:
                print(f"[CLEANUP] Failed to delete embedding: {e}")

# Add a FastAPI endpoint to trigger cleanup (for automation)
@app.post("/cleanup_blurry")
def cleanup_blurry_api():
    delete_blurry_embeddings_and_images(sharpness_threshold=100)
    return {"status": "cleanup-complete"}

# Recognition endpoint
@app.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    print("RECOGNIZE endpoint: called")
    t0 = time.time()
    # Save uploaded file to temp
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        t1 = time.time()
        reps = DeepFace.represent(img_path=tmp_path, model_name="Facenet512")
        print(f"DeepFace.represent done in {time.time() - t1:.2f}s")
        if not reps or "embedding" not in reps[0]:
            os.remove(tmp_path)
            print(f"No face detected. Total time: {time.time() - t0:.2f}s")
            return {"status": "no-face", "message": "No face detected in image.", "distance": None}
        test_embedding = reps[0]["embedding"]
    except Exception as e:
        os.remove(tmp_path)
        print(f"Exception in DeepFace.represent: {e}. Total time: {time.time() - t0:.2f}s")
        return {"status": "no-face", "message": str(e), "distance": None}
    os.remove(tmp_path)

    # Fetch all embeddings and usns
    embeddings, usns = fetch_embeddings()
    if len(embeddings) == 0:
        print(f"No embeddings in database. Total time: {time.time() - t0:.2f}s")
        return {"status": "error", "message": "No embeddings in database", "distance": None}

    # KNN classification with distance threshold
    knn = KNeighborsClassifier(n_neighbors=1, metric='cosine')
    embeddings = np.array(embeddings, dtype=np.float32)
    knn.fit(embeddings, usns)
    dist, idx = knn.kneighbors([test_embedding], n_neighbors=1, return_distance=True)
    pred_usn = knn.predict([test_embedding])[0]
    DISTANCE_THRESHOLD = 0.5  # Facenet512 tuned for real-world classroom use
    print(f"[DEBUG] KNN distance: {dist[0][0]}")
    # Placeholder: check if this USN is already marked for this session (not implemented)
    already_marked = False  # TODO: implement session attendance check
    if dist[0][0] > DISTANCE_THRESHOLD:
        print(f"[DEBUG] No close match found (distance {dist[0][0]} > {DISTANCE_THRESHOLD})")
        # Only return a generic message or omit the message field
        return {"status": "no-match", "distance": float(dist[0][0])}
    if already_marked:
        print(f"[DEBUG] Already marked: USN={pred_usn}, distance={dist[0][0]}")
        return {"status": "already-marked", "usn": pred_usn, "distance": float(dist[0][0])}
    print(f"[DEBUG] Match found: USN={pred_usn}, distance={dist[0][0]}")
    print(f"Total recognition pipeline time: {time.time() - t0:.2f}s")
    return {"status": "success", "usn": pred_usn, "distance": float(dist[0][0])}

# Health check
@app.get("/")
def root():
    return {"message": "Face Attendance Backend is running"}