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
async def recognize(
    file: UploadFile = File(...),
    session_id: str = Form(None),
    class_name: str = Form(None),
    subject: str = Form(None),
    teacher_id: str = Form(None),
    mode: str = Form(None),
):
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
    # Look up student UUID from USN
    student_uuid = None
    try:
        student_row = supabase.table("students").select("id").eq("usn", pred_usn).execute().data
        if student_row and len(student_row) > 0:
            student_uuid = student_row[0]["id"]
            print(f"[DEBUG] Found student UUID: {student_uuid} for USN: {pred_usn}")
    except Exception as e:
        print(f"[ERROR] Failed to look up student UUID: {e}")
    # Check if already marked for this session and mode (must have student_uuid)
    already_marked = False
    try:
        if student_uuid and session_id and mode:
            attendance_rows = supabase.table("attendance").select("check_in,check_out").eq("student_id", student_uuid).eq("session_id", session_id).execute().data
            if attendance_rows and len(attendance_rows) > 0:
                row = attendance_rows[0]
                if mode == "check-in" and row.get("check_in"):
                    already_marked = True
                if mode == "check-out" and row.get("check_out"):
                    already_marked = True
    except Exception as e:
        print(f"[ERROR] Failed to check already-marked: {e}")
    if dist[0][0] > DISTANCE_THRESHOLD:
        print(f"[DEBUG] No close match found (distance {dist[0][0]} > {DISTANCE_THRESHOLD})")
        return {"status": "no-match", "distance": float(dist[0][0])}
    if already_marked:
        print(f"[DEBUG] Already marked: USN={pred_usn}, distance={dist[0][0]}, mode={mode}")
        return {"status": "already-marked", "usn": pred_usn, "distance": float(dist[0][0])}
    # Only upsert if not already marked
    try:
        print(f"[DEBUG] session_id: {session_id}, class_name: {class_name}, subject: {subject}, teacher_id: {teacher_id}, mode: {mode}")
        if student_uuid and session_id and class_name and subject and teacher_id and mode:
            now_iso = time.strftime('%Y-%m-%dT%H:%M:%S')
            upsert_payload = {
                "student_id": student_uuid,
                "session_id": session_id,
                "class": class_name,
                "subject": subject,
                "teacher_id": teacher_id,
                "date": now_iso.split('T')[0],
                "method": "face-auto",
                "is_absent": False
            }
            if mode == "check-in":
                upsert_payload["check_in"] = now_iso
                # --- Begin: Save check-in image logic ---
                try:
                    # Re-run DeepFace to get facial area for cropping (already done above, so reuse reps[0])
                    facial_area = reps[0].get("facial_area")
                    if facial_area:
                        # Re-save uploaded file to temp for cropping
                        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp2:
                            file.file.seek(0)
                            tmp2.write(await file.read())
                            tmp2_path = tmp2.name
                        img = Image.open(tmp2_path)
                        x, y, w, h = facial_area["x"], facial_area["y"], facial_area["w"], facial_area["h"]
                        cropped = img.crop((x, y, x+w, y+h)).resize((224, 224))
                        cropped_path = tmp2_path + "_cropped.jpg"
                        cropped.save(cropped_path)
                        sharpness = calculate_sharpness(cropped_path)
                        print(f"[CHECKIN-IMG] Sharpness: {sharpness}")
                        SHARPNESS_THRESHOLD = 100
                        if sharpness >= SHARPNESS_THRESHOLD:
                            # Fetch all existing images/embeddings for this student
                            existing = supabase.table("face_embeddings").select("id, image_url, sharpness").eq("usn", pred_usn).execute().data
                            print(f"[CHECKIN-IMG] Existing images: {len(existing)}")
                            if len(existing) < 5:
                                # Add new image
                                file_ext = "jpg"
                                unique_name = f"{pred_usn}_{uuid.uuid4()}.{file_ext}"
                                file_path = f"students/{pred_usn}/{unique_name}"
                                with open(cropped_path, "rb") as fimg:
                                    upload_result = supabase.storage.from_("student-images").upload(file_path, fimg, {"upsert": "true"})
                                image_url = supabase.storage.from_("student-images").get_public_url(file_path)
                                print(f"[CHECKIN-IMG] Uploaded new image: {image_url}")
                                save_embedding(pred_usn, test_embedding, image_url=image_url, sharpness=sharpness, model="Facenet512", source="check-in")
                                # Update students table image_urls
                                all_urls = [row["image_url"] for row in existing if row["image_url"]] + [image_url]
                                supabase.table("students").update({"image_urls": all_urls}).eq("usn", pred_usn).execute()
                            else:
                                # Find lowest sharpness
                                min_row = min(existing, key=lambda r: r.get("sharpness", 0))
                                if sharpness > min_row.get("sharpness", 0):
                                    # Replace
                                    print(f"[CHECKIN-IMG] Replacing image {min_row['image_url']} (sharpness={min_row['sharpness']}) with new (sharpness={sharpness})")
                                    # Delete old image from storage
                                    if min_row["image_url"]:
                                        try:
                                            path = min_row["image_url"].split("student-images/")[-1].split("?")[0]
                                            supabase.storage.from_("student-images").remove([path])
                                            print(f"[CHECKIN-IMG] Deleted old image from storage: {path}")
                                        except Exception as e:
                                            print(f"[CHECKIN-IMG] Failed to delete old image: {e}")
                                    # Delete old embedding
                                    supabase.table("face_embeddings").delete().eq("id", min_row["id"]).execute()
                                    # Upload new image
                                    file_ext = "jpg"
                                    unique_name = f"{pred_usn}_{uuid.uuid4()}.{file_ext}"
                                    file_path = f"students/{pred_usn}/{unique_name}"
                                    with open(cropped_path, "rb") as fimg:
                                        upload_result = supabase.storage.from_("student-images").upload(file_path, fimg, {"upsert": "true"})
                                    image_url = supabase.storage.from_("student-images").get_public_url(file_path)
                                    print(f"[CHECKIN-IMG] Uploaded replacement image: {image_url}")
                                    save_embedding(pred_usn, test_embedding, image_url=image_url, sharpness=sharpness, model="Facenet512", source="check-in")
                                    # Update students table image_urls
                                    all_urls = [row["image_url"] for row in existing if row["id"] != min_row["id"] and row["image_url"]] + [image_url]
                                    supabase.table("students").update({"image_urls": all_urls}).eq("usn", pred_usn).execute()
                                else:
                                    print(f"[CHECKIN-IMG] New image sharpness {sharpness} not higher than lowest {min_row['sharpness']}, not replacing.")
                        else:
                            print(f"[CHECKIN-IMG] Image too blurry (sharpness={sharpness}), not saving.")
                        # Clean up temp files
                        try:
                            os.remove(cropped_path)
                        except Exception as e:
                            print(f"[CHECKIN-IMG] Failed to delete cropped file: {e}")
                        try:
                            os.remove(tmp2_path)
                        except Exception as e:
                            print(f"[CHECKIN-IMG] Failed to delete temp file: {e}")
                except Exception as e:
                    print(f"[CHECKIN-IMG] Exception in check-in image save: {e}")
            elif mode == "check-out":
                upsert_payload["check_out"] = now_iso
            print(f"[DEBUG] Upserting attendance: {upsert_payload}")
            result = supabase.table("attendance").upsert(upsert_payload, on_conflict="student_id,session_id").execute()
            print(f"[DEBUG] Upsert result: {result}")
        else:
            print(f"[DEBUG] Missing session_id, class_name, subject, teacher_id, or mode. Attendance not upserted.")
    except Exception as e:
        print(f"[ERROR] Failed to upsert attendance: {e}")
    print(f"Total recognition pipeline time: {time.time() - t0:.2f}s")
    return {"status": "success", "usn": pred_usn, "distance": float(dist[0][0])}

# Health check
@app.get("/")
def root():
    return {"message": "Face Attendance Backend is running"}