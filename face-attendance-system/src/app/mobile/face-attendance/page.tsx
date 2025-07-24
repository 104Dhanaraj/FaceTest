//2.Music/face-attendance-system/src/app/mobile/face-attendance/page.tsx

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Camera, Clock, User, BookOpen, CheckCircle, AlertCircle, XCircle } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"
import * as faceapi from 'face-api.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error("Missing Supabase environment variables. Please check your .env.local file.")
}

type StudentWithEmbedding = {
  id: string // UUID
  name: string
  usn: string
  embeddings: number[][]
  class?: string
  subjects?: string[]
}

type RecognitionStatus = "scanning" | "matched" | "already-marked" | "no-match" | "no-face"

interface MatchedStudent {
  name: string
  usn: string
  timestamp: string
}

// Real face detection using face-api.js
async function detectFaceInCanvas(canvas: HTMLCanvasElement): Promise<boolean> {
  // Detect with face-api.js
  const detections = await faceapi.detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions());
  return detections.length > 0;
}

export default function MobileAttendanceScreen() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>("scanning")
  const [matchedStudent, setMatchedStudent] = useState<MatchedStudent | null>(null)
  const [students, setStudents] = useState<StudentWithEmbedding[]>([])
  const [sessionInfo, setSessionInfo] = useState<{
    sessionId: string
    teacherId: string
    className: string
    subject: string
    sessionMode: "Check-In" | "Check-Out"
  } | null>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);
  const [isUpdatingImages, setIsUpdatingImages] = useState(false)
  const [recognizing, setRecognizing] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [lastDebugInfo, setLastDebugInfo] = useState<{status: string, distance: number|null, message?: string} | null>(null);
  const recognitionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update clock every second (hydration-safe)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Load session and students with embeddings
  useEffect(() => {
    const loadSessionAndStudents = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from("mobile_sessions")
          .select("*")
          .eq("is_active", true)
          .maybeSingle()

        if (sessionError || !sessionData) {
          if (sessionError && sessionError.message) {
            console.error("Session error:", sessionError.message)
          }
          return
        }

        setSessionInfo({
          sessionId: sessionData.id,
          teacherId: sessionData.teacher_id,
          className: sessionData.class_name,
          subject: sessionData.subject,
          sessionMode: sessionData.mode,
        })

        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("id, name, usn, class, subjects")
          .eq("class", sessionData.class_name)

        if (studentError || !studentData) {
          console.error("Student fetch error or no student data:", studentError)
          return
        }
        console.log("Fetched students:", studentData, "error:", studentError);

        const { data: embeddingData, error: embeddingError } = await supabase
          .from("face_embeddings")
          .select("usn, embedding")
          .in("usn", studentData.map(s => s.usn))

        if (embeddingError) {
          console.error("Embedding fetch error:", embeddingError)
          return
        }
        console.log("Fetched embeddings:", embeddingData, "error:", embeddingError);

        const studentsWithEmbeddings = studentData.map(student => {
          const embeddings = (embeddingData
            ?.filter(e => e.usn === student.usn)
            .map(e => {
              if (!Array.isArray(e.embedding)) return null
              try {
                const parsed = new Float32Array(e.embedding.map(Number))
                if (parsed.length !== 512) return null
                return Array.from(parsed)
              } catch {
                return null
              }
            })
            .filter((e): e is number[] => Array.isArray(e))) || []
          return { ...student, id: student.id, embeddings }
        })

        console.log("studentsWithEmbeddings:", studentsWithEmbeddings);
        console.log("studentsWithEmbeddings (filtered):", studentsWithEmbeddings.filter(s => s.embeddings.length > 0));
        setStudents(studentsWithEmbeddings)
      } catch (error) {
        console.error("Unexpected error in loadSessionAndStudents:", error)
      }
    }
    loadSessionAndStudents()
  }, [])

  // Load face-api.js models on mount
  useEffect(() => {
    async function loadModels() {
      const MODEL_URL = '/models'; // Place models in public/models
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
    }
    loadModels();
  }, []);

  // Camera initialization and cleanup
  const initCamera = useCallback(async () => {
    try {
      console.log('Initializing camera...')
      setCameraError(null)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser')
      }
      if (!videoRef.current) {
        console.log('Video ref not ready, waiting...')
        await new Promise(resolve => setTimeout(resolve, 100))
        if (!videoRef.current) {
          throw new Error('Video element not found - please try again')
        }
      }
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          aspectRatio: { ideal: 4/3 }
        },
        audio: false
      }
      console.log('Requesting camera access with constraints:', constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('Camera stream obtained:', stream)
      console.log('Setting video srcObject...')
      videoRef.current!.srcObject = stream
      videoRef.current!.onloadedmetadata = () => {
        console.log('Video metadata loaded, starting playback...')
        videoRef.current?.play().then(() => {
          console.log('Video playback started successfully');
          setCameraActive(true);
          console.log('cameraActive set to true');
        }).catch((err) => {
          console.error("Video playback failed:", err)
          setCameraError('Video playback failed: ' + err.message)
          setCameraActive(false)
        })
      }
      videoRef.current!.onerror = (err) => {
        console.error('Video error:', err)
        setCameraError('Video error occurred')
        setCameraActive(false)
      }
      videoRef.current!.oncanplay = () => {
        console.log('Video can play')
      }
    } catch (err: any) {
      console.error('Camera initialization failed:', err)
      setCameraError(err.message || "Unable to access camera")
      setCameraActive(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setCameraActive(false)
      setCameraError(null)
      console.log('Camera stopped')
    }
  }, [])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  // Remove the useEffect that loads face-api.js models

  // Debug/analysis helpers
  function cosineSimilarity(a: number[], b: number[]) {
    const dot = a.reduce((acc, val, i) => acc + val * b[i], 0)
    const normA = Math.sqrt(a.reduce((acc, val) => acc + val * val, 0))
    const normB = Math.sqrt(b.reduce((acc, val) => acc + val * val, 0))
    return dot / (normA * normB)
  }

  function euclideanSimilarity(a: number[], b: number[]) {
    const sumSquaredDiff = a.reduce((acc, val, i) => acc + Math.pow(val - b[i], 2), 0)
    const distance = Math.sqrt(sumSquaredDiff)
    return Math.max(0, 1 - distance / Math.sqrt(a.length))
  }

  function combinedSimilarity(a: number[], b: number[]) {
    const cosine = cosineSimilarity(a, b)
    const euclidean = euclideanSimilarity(a, b)
    return cosine * 0.7 + euclidean * 0.3
  }

  function analyzeEmbeddings() {
    console.log('=== EMBEDDING ANALYSIS ===')
    for (let i = 0; i < students.length; i++) {
      for (let j = i + 1; j < students.length; j++) {
        const studentA = students[i]
        const studentB = students[j]
        for (const embA of studentA.embeddings) {
          for (const embB of studentB.embeddings) {
            const sim = cosineSimilarity(embA, embB)
            console.log(`${studentA.name} vs ${studentB.name}: ${sim.toFixed(4)}`)
          }
        }
      }
    }
    console.log('=== END ANALYSIS ===')
  }

  useEffect(() => {
    if (students.length > 0) {
      analyzeEmbeddings()
      debugEmbeddingQuality()
    }
  }, [students])

  function debugEmbeddingQuality() {
    console.log('=== EMBEDDING QUALITY DEBUG ===')
    console.log('Total students:', students.length)
    for (const student of students) {
      console.log(`${student.name}: ${student.embeddings.length} embeddings`)
      if (student.embeddings.length > 1) {
        const similarities = []
        for (let i = 0; i < student.embeddings.length; i++) {
          for (let j = i + 1; j < student.embeddings.length; j++) {
            const sim = combinedSimilarity(student.embeddings[i], student.embeddings[j])
            similarities.push(sim)
          }
        }
        const avgSim = similarities.reduce((a, b) => a + b, 0) / similarities.length
        console.log(`  Average similarity within ${student.name}: ${avgSim.toFixed(4)}`)
      }
    }
    console.log('\nCross-person similarities:')
    for (let i = 0; i < students.length; i++) {
      for (let j = i + 1; j < students.length; j++) {
        const studentA = students[i]
        const studentB = students[j]
        const similarities = []
        
        for (const embA of studentA.embeddings) {
          for (const embB of studentB.embeddings) {
            const sim = combinedSimilarity(embA, embB)
            similarities.push(sim)
          }
        }
        const avgSim = similarities.reduce((a, b) => a + b, 0) / similarities.length
        const maxSim = Math.max(...similarities)
        console.log(`${studentA.name} vs ${studentB.name}: avg=${avgSim.toFixed(4)}, max=${maxSim.toFixed(4)}`)
      }
    }
    console.log('=== END DEBUG ===')
  }

  // Backend recognition flow
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  async function recognizeFace(file: File, auto = false) {
    setRecognizing(true);
    setRecognitionError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // Add session_id, class, subject if available
      if (sessionInfo) {
        formData.append('session_id', sessionInfo.sessionId);
        formData.append('class_name', sessionInfo.className);
        formData.append('subject', sessionInfo.subject);
        formData.append('teacher_id', sessionInfo.teacherId);
        formData.append('mode', sessionInfo.sessionMode?.toLowerCase());
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
      const response = await fetch(`${BACKEND_URL}/recognize`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        setRecognitionError('Backend error: ' + response.status);
        setRecognitionStatus('no-match');
        setMatchedStudent(null);
        setLastDebugInfo({status: 'no-match', distance: null});
        setTimeout(() => setRecognizing(false), 2000);
        return;
      }
      const result = await response.json();
      setLastDebugInfo({status: result.status, distance: result.distance ?? null});
      // Only allow marking if the matched student is in filteredStudents
      if (result.status === 'success' || result.status === 'already-marked') {
        if (!filteredUsns.has(result.usn)) {
          setRecognitionStatus("no-match");
          setMatchedStudent(null);
          setRecognitionError('Face not recognized for this class/subject');
          setTimeout(() => setRecognitionStatus("scanning"), 2000);
          setRecognizing(false);
          return;
        }
      }
      if (result.status === 'success') {
        setRecognitionStatus("matched");
        setMatchedStudent({ name: result.name || "", usn: result.usn, timestamp: new Date().toLocaleTimeString() });
        setTimeout(() => {
          setRecognizing(false);
          setRecognitionStatus('scanning');
        }, 2000);
      } else if (result.status === 'already-marked') {
        setRecognitionStatus("already-marked");
        setMatchedStudent({ name: result.name || "", usn: result.usn, timestamp: "Already marked" });
        setTimeout(() => {
          setRecognizing(false);
          setRecognitionStatus('scanning');
        }, 2000);
      } else if (result.status === 'no-face') {
        setRecognitionStatus("no-face");
        setMatchedStudent(null);
        setTimeout(() => setRecognizing(false), 2000);
      } else {
        setRecognitionStatus("no-match");
        setMatchedStudent(null);
        setRecognitionError(result.message || 'No match');
        setTimeout(() => {
          setRecognizing(false);
          setRecognitionStatus('scanning');
        }, 2000);
      }
    } catch (err) {
      setRecognitionStatus("no-match");
      setMatchedStudent(null);
      setRecognitionError('Recognition failed: ' + (err instanceof Error ? err.message : String(err)));
      setLastDebugInfo({status: 'no-match', distance: null});
      setTimeout(() => {
      setRecognizing(false);
        setRecognitionStatus('scanning');
      }, 2000);
    }
  }

  // Real-time auto-capture effect
  useEffect(() => {
    if (!cameraActive || recognizing || !modelsLoaded) return;
    function startRecognitionLoop() {
      if (recognitionIntervalRef.current) clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = setInterval(async () => {
        if (recognizing) return; // Prevent overlap
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0);
        // Real face detection
        const hasFace = await detectFaceInCanvas(canvas);
        if (!hasFace) {
          setRecognitionStatus('no-face');
          setMatchedStudent(null);
          return;
        }
        setRecognitionStatus('scanning');
        setRecognizing(true);
        setRecognitionError(null);
        canvas.toBlob(async (blob) => {
          if (blob) {
            await recognizeFace(new File([blob], 'photo.jpg', { type: 'image/jpeg' }), true);
          } else {
            setRecognitionStatus('no-face');
            setMatchedStudent(null);
            setRecognitionError('Failed to capture image from camera');
            setRecognizing(false);
          }
        }, 'image/jpeg', 0.95);
      }, 2500);
    }
    startRecognitionLoop();
    return () => {
      if (recognitionIntervalRef.current) clearInterval(recognitionIntervalRef.current);
    };
  }, [cameraActive, recognizing, modelsLoaded]);

  // Helper: Capture photo and send to backend if face is detected
  const handleManualCaptureAndRecognize = useCallback(async () => {
    if (!videoRef.current) {
      setRecognitionError('Camera not ready');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setRecognitionError('Failed to get canvas context');
      return;
    }
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
        if (blob) {
        await recognizeFace(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
      } else {
          setRecognitionStatus('no-face');
          setMatchedStudent(null);
          setRecognitionError('Failed to capture image from camera');
        }
    }, 'image/jpeg', 0.95);
  }, [videoRef, recognizeFace]);

  // Always listen for session changes and set sessionInfo to null if no active session
  useEffect(() => {
    const channel = supabase
      .channel('mobile-sessions-active')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mobile_sessions',
        },
        (payload) => {
          const newSession = payload.new as { [key: string]: any };
          if (newSession && newSession.is_active) {
            setSessionInfo({
              sessionId: newSession.id,
              teacherId: newSession.teacher_id,
              className: newSession.class_name,
              subject: newSession.subject,
              sessionMode: newSession.mode,
            });
          }
          if (sessionInfo && newSession && newSession.id === sessionInfo.sessionId && !newSession.is_active) {
            setSessionInfo(null);
          }
        }
      )
      .subscribe();
    // On mount, check for active session
    (async () => {
      const { data: sessionData, error } = await supabase
        .from("mobile_sessions")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();
      if (sessionData) {
        setSessionInfo({
          sessionId: sessionData.id,
          teacherId: sessionData.teacher_id,
          className: sessionData.class_name,
          subject: sessionData.subject,
          sessionMode: sessionData.mode,
        });
      } else {
        setSessionInfo(null);
      }
    })();
    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionInfo) return;
    const channel = supabase
      .channel(`attendance-updates-${sessionInfo.sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `session_id=eq.${sessionInfo.sessionId}`,
        },
        (payload) => {
          supabase
            .from("attendance")
            .select("*")
            .eq("session_id", sessionInfo.sessionId)
            .then(({ data, error }) => {
              if (!error && data) setAttendanceRows(data);
            });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionInfo]);

  useEffect(() => {
    if (!sessionInfo) return;
    const fetchAttendance = async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("session_id", sessionInfo.sessionId);

      if (!error && data) setAttendanceRows(data);
    };
    fetchAttendance();
  }, [sessionInfo?.sessionId]);

  useEffect(() => {
    if (!sessionInfo) return;
    const fetchStudents = async () => {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, name, usn, class, subjects")
        .eq("class", sessionInfo.className);
      if (!studentError && studentData) {
        const { data: embeddingData, error: embeddingError } = await supabase
          .from("face_embeddings")
          .select("usn, embedding")
          .in("usn", studentData.map(s => s.usn))
        if (embeddingError) {
          console.error("Embedding fetch error:", embeddingError)
          return
        }
        console.log("Student USNs:", studentData.map(s => s.usn));
        console.log("Embedding USNs:", embeddingData.map(e => e.usn));
        console.log("Sample embedding (raw):", embeddingData[0]?.embedding);
        console.log("Sample embedding type:", typeof embeddingData[0]?.embedding);
        try {
          const parsed = embeddingData[0]?.embedding?.map(Number);
          console.log("Sample embedding (parsed):", parsed);
          console.log("Parsed length:", parsed?.length);
        } catch (err) {
          console.error("Error parsing embedding sample:", err);
        }
        const studentsWithEmbeddings = studentData.map(student => {
          const embeddings = (embeddingData
            ?.filter(e => e.usn === student.usn)
            .map(e => {
              if (!Array.isArray(e.embedding)) return null
              try {
                const parsed = new Float32Array(e.embedding.map(Number))
                if (parsed.length !== 512) return null
                return Array.from(parsed)
              } catch {
                return null
              }
            })
            .filter((e): e is number[] => Array.isArray(e))) || []
          return { ...student, id: student.id, embeddings }
        })
        setStudents(studentsWithEmbeddings.filter(s => s.embeddings.length > 0))
      }
    };
    fetchStudents();
  }, [sessionInfo?.className, sessionInfo?.subject]);

  // Helper to get filtered students for the session
  const filteredStudents = sessionInfo
    ? students.filter(
        (s) =>
          s &&
          s.usn &&
          sessionInfo.className &&
          sessionInfo.subject &&
          s.class === sessionInfo.className &&
          Array.isArray(s.subjects)
            ? s.subjects.includes(sessionInfo.subject)
            : true
      )
    : [];

  // Helper to get filtered USNs for fast lookup
  const filteredUsns = new Set(filteredStudents.map(s => s.usn));

  // Count logic for check-in/check-out
  let presentCount = 0;
  let remainingCount = 0;
  if (sessionInfo && attendanceRows.length > 0) {
    if (sessionInfo.sessionMode.toLowerCase() === "check-in") {
      presentCount = attendanceRows.filter(row => row.check_in && !row.is_absent).length;
      remainingCount = filteredStudents.length - presentCount;
    } else {
      presentCount = attendanceRows.filter(row => row.check_out && !row.is_absent).length;
      remainingCount = attendanceRows.filter(row => row.check_in && !row.check_out && !row.is_absent).length;
    }
  } else {
    presentCount = 0;
    remainingCount = filteredStudents.length;
  }

  useEffect(() => {
    if (!sessionInfo) {
      stopCamera();
      setCameraActive(false);
      setRecognizing(false);
      setRecognitionStatus('scanning');
      setMatchedStudent(null);
      setRecognitionError(null);
    }
  }, [sessionInfo, stopCamera]);

  if (!sessionInfo || filteredStudents.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <div className="text-center">
          <p>Loading face recognition session...</p>
          {sessionInfo && filteredStudents.length === 0 && (
            <div className="mt-4 text-red-600 font-semibold">
              This session contains 0 students.<br />Face recognition will not activate.
            </div>
          )}
        </div>
      </div>
    )
  }

  const getStatusConfig = () => {
    switch (recognitionStatus) {
      case "matched":
        return {
          color: "border-green-500",
          bgColor: "bg-green-50",
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          message: matchedStudent ? `Matched: ${matchedStudent.name} (${matchedStudent.usn})` : "Student Matched",
          textColor: "text-green-700",
        }
      case "already-marked":
        return {
          color: "border-yellow-500",
          bgColor: "bg-yellow-50",
          icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
          message: matchedStudent ? `Already marked: ${matchedStudent.name}` : "Already marked",
          textColor: "text-yellow-700",
        }
      case "no-match":
        return {
          color: "border-red-500",
          bgColor: "bg-red-50",
          icon: <XCircle className="w-5 h-5 text-red-600" />,
          message: "Face not recognized",
          textColor: "text-red-700",
        }
      case "no-face":
        return {
          color: "border-red-500",
          bgColor: "bg-red-50",
          icon: <XCircle className="w-5 h-5 text-red-600" />,
          message: "No face detected",
          textColor: "text-red-700",
        }
      default:
        return {
          color: "border-blue-500",
          bgColor: "bg-blue-50",
          icon: <Camera className="w-5 h-5 text-blue-600" />,
          message: "Scanning for faces...",
          textColor: "text-blue-700",
        }
    }
  }

  const statusConfig = getStatusConfig()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">{sessionInfo?.teacherId}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{currentTime.toLocaleTimeString()}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex items-center space-x-1">
            <BookOpen className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">Class:</span>
            <span className="font-medium">{sessionInfo?.className}</span>
          </div>
          <div className="text-center">
            <span className="text-gray-600">Subject:</span>
            <span className="font-medium ml-1">{sessionInfo?.subject}</span>
          </div>
          <div className="text-right">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                sessionInfo?.sessionMode === "Check-In" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
              }`}
            >
              {sessionInfo?.sessionMode}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
        {/* Status Message */}
        <div
          className={`${statusConfig.bgColor} ${statusConfig.textColor} px-4 py-2 rounded-lg border ${statusConfig.color} flex items-center space-x-2 max-w-sm w-full`}
        >
          {statusConfig.icon}
          <span className="text-sm font-medium text-center flex-1">{statusConfig.message}</span>
          {/* Remove any extra backend message from here */}
          {recognitionError && (
            <div className="text-xs text-red-600 mt-1">{recognitionError}</div>
          )}
        </div>
        {/* Debug Info Overlay */}
        {lastDebugInfo && (
          <div className="mt-2 p-2 bg-gray-100 border border-gray-300 rounded text-xs text-gray-700 max-w-sm w-full">
            <div><b>Backend status:</b> {lastDebugInfo.status}</div>
            <div><b>Distance:</b> {lastDebugInfo.distance !== null ? lastDebugInfo.distance.toFixed(4) : 'N/A'}</div>
            {/* Do not display backend message here */}
          </div>
        )}

        {/* Camera Preview */}
        <div className="relative">
          <div className={`w-80 h-80 rounded-full border-4 ${statusConfig.color} overflow-hidden bg-gray-900 relative`}>
            {isUpdatingImages && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black bg-opacity-60">
                <svg className="animate-spin h-12 w-12 text-blue-400 mb-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <span className="text-white text-lg font-semibold">Please wait...</span>
              </div>
            )}
            {recognizing && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black bg-opacity-60">
                <svg className="animate-spin h-12 w-12 text-blue-400 mb-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <span className="text-white text-lg font-semibold">Recognizing...</span>
              </div>
            )}
            {/* Always render video element for ref access */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />
            {/* Overlay for inactive/error states */}
            {!cameraActive && !isUpdatingImages && (
              <div className="w-full h-full flex items-center justify-center text-white text-center p-4 absolute inset-0">
                <div>
                  <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  {cameraError ? (
                    <>
                      <p className="text-sm">{cameraError}</p>
                      <p className="text-xs text-gray-400 mt-1">Please allow camera access</p>
                      <button 
                        onClick={initCamera}
                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                      >
                        Retry Camera
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm">Camera not active</p>
                      <p className="text-xs text-gray-400 mt-1">Click to start camera</p>
                      <button 
                        onClick={initCamera}
                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                      >
                        Activate Camera
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Manual Capture Button removed */}
        </div>

        {/* Student Info (when matched) */}
        {matchedStudent && (recognitionStatus === "matched" || recognitionStatus === "already-marked") && (
          <div className="bg-white rounded-lg shadow-sm border p-4 max-w-sm w-full">
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">{matchedStudent.name}</h3>
              <p className="text-sm text-gray-600">{matchedStudent.usn}</p>
              <p className="text-xs text-gray-500 mt-1">
                {recognitionStatus === "matched" ? `Marked at: ${matchedStudent.timestamp}` : matchedStudent.timestamp}
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="bg-white rounded-lg shadow-sm border p-4 max-w-sm w-full">
          <div className="grid grid-cols-2 gap-4 text-center">
            {sessionInfo.sessionMode.toLowerCase() === "check-in" ? (
              <>
                <div>
                  <div className="text-2xl font-bold text-green-600">{presentCount}</div>
                  <div className="text-xs text-gray-600">Present</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-400">{Math.max(0, remainingCount)}</div>
                  <div className="text-xs text-gray-600">Remaining</div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="text-2xl font-bold text-green-600">{presentCount}</div>
                  <div className="text-xs text-gray-600">Checked Out</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-400">{Math.max(0, remainingCount)}</div>
                  <div className="text-xs text-gray-600">To Check Out</div>
                </div>
              </>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            Total students: {filteredStudents.length}
          </div>
          {/* Debug button */}
          <div className="mt-4 pt-4 border-t">
            <button 
              onClick={debugEmbeddingQuality}
              className="w-full px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Debug Embeddings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
