// src/app/teacher/take-attendance/page.tsx(screen T2)
"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  Clock,
  Users,
  UserCheck,
  UserX,
  Undo2,
  GraduationCap,
  Home,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X as CloseIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Student {
  id: string
  name: string
  usn: string
  checkInTime?: string
  checkOutTime?: string
  isAbsent?: boolean
}

const navigationItems = [
  { title: "Dashboard", icon: Home, url: "#", isActive: false },
  { title: "Take Attendance", icon: Users, url: "#", isActive: true },
  { title: "Attendance History", icon: Calendar, url: "#", isActive: false },
  { title: "Reports", icon: BarChart3, url: "#", isActive: false },
]

function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">EduAttend</span>
            <span className="text-xs text-muted-foreground">Teacher Portal</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.isActive}>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
      <SidebarRail />
    </Sidebar>
  )
}

function TeacherAttendance() {
  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string }[]>([])
  const [availableSubjects, setAvailableSubjects] = useState<{ id: string; name: string }[]>([])
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [attendanceStarted, setAttendanceStarted] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [activeTab, setActiveTab] = useState("checkin")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const today = useMemo(() => new Date().toISOString().split("T")[0], [])

  // Simple toast function
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    // You can replace this with a proper toast library
    console.log(`${type.toUpperCase()}: ${message}`)
    // For now, just log to console. You can integrate with react-hot-toast or similar
  }, [])

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      try {
        const user = await supabase.auth.getUser()
        const tId = user?.data?.user?.id || null
        if (!isMounted) return
        setTeacherId(tId)

        if (!tId) return

        const { data, error } = await supabase
          .from("users")
          .select("classes, subjects")
          .eq("id", tId)
          .single()

        if (!isMounted) return

        if (error) {
          console.error("Error fetching classes/subjects:", error.message)
          return
        }
        if (!data) return

        const classes = (data.classes || []).map((cls: string) => ({ id: cls, name: cls }))
        const subjects = (data.subjects || []).map((sub: string) => ({ id: sub, name: sub }))
        setAvailableClasses(classes)
        setAvailableSubjects(subjects)
      } catch (error) {
        if (isMounted) {
          console.error("Error in fetchData:", error)
        }
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [])

const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }, [])

  const handleStartAttendance = useCallback(async () => {
    if (!selectedClass || !selectedSubject || !teacherId) return

    try {
      // First, deactivate any existing sessions for this teacher
      await supabase
        .from("mobile_sessions")
        .update({ is_active: false })
        .eq("teacher_id", teacherId)

      // Create new session
      const { data: session, error: sessErr } = await supabase
        .from("mobile_sessions")
        .insert({
          teacher_id: teacherId,
          class_name: selectedClass,
          subject: selectedSubject,
          mode: "check-in",
          is_active: true,
        })
        .select()
        .single()

      if (sessErr) {
        console.error("Session start error:", sessErr)
        showToast("Failed to start session", "error")
        return
      }

      if (!session) {
        console.error("No session returned")
        showToast("Failed to create session", "error")
        return
      }

      const newSessionId = session.id
      setSessionId(newSessionId)
      setAttendanceStarted(true)
      showToast("Attendance session started successfully")

      // Fetch students for the class
      const { data, error: studentError } = await supabase
        .from("students")
        .select("id, name, usn, subjects")
        .eq("class", selectedClass)
        .contains("subjects", [selectedSubject])

      if (studentError) {
        console.error("Failed to fetch students:", studentError.message)
        showToast("Failed to fetch students", "error")
        return
      }

      if (!data) return

      setStudents(
        data.map((student: any) => ({
          id: student.id,
          name: student.name,
          usn: student.usn,
          checkInTime: undefined,
          checkOutTime: undefined,
          isAbsent: false,
        }))
      )
    } catch (error) {
      console.error("Error starting attendance:", error)
      showToast("Failed to start attendance session", "error")
    }
  }, [selectedClass, selectedSubject, teacherId, showToast])

  // Real-time listener for attendance updates
  useEffect(() => {
    if (!selectedClass || !selectedSubject || !teacherId || !attendanceStarted || !sessionId) return

    const channel = supabase
      .channel(`attendance-updates-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: any) => {
          const inserted = payload.new
          console.log('[DEBUG] INSERT event received:', inserted)
          if (inserted.class !== selectedClass || inserted.subject !== selectedSubject) {
            console.log('[DEBUG] INSERT event ignored due to class/subject mismatch')
            return
          }
          setStudents((prev) => {
            const updated = prev.map((student) =>
              String(student.id) === String(inserted.student_id)
                ? {
                    ...student,
                    checkInTime: inserted.check_in
                      ? new Date(inserted.check_in).toLocaleTimeString()
                      : student.checkInTime,
                    checkOutTime: inserted.check_out
                      ? new Date(inserted.check_out).toLocaleTimeString()
                      : student.checkOutTime,
                    isAbsent: inserted.is_absent || false,
                  }
                : student,
            )
            console.log('[DEBUG] Students after INSERT update:', updated)
            return updated
          })
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "attendance",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: any) => {
          const updated = payload.new
          console.log('[DEBUG] UPDATE event received:', updated)
          if (updated.class !== selectedClass || updated.subject !== selectedSubject) {
            console.log('[DEBUG] UPDATE event ignored due to class/subject mismatch')
            return
          }
          setStudents((prev) => {
            const newStudents = prev.map((student) => {
              const match = String(student.id) === String(updated.student_id)
              console.log('[DEBUG] Comparing student.id:', student.id, 'with updated.student_id:', updated.student_id, 'Match:', match)
              console.log('[DEBUG] updated.check_in:', updated.check_in, 'updated.is_absent:', updated.is_absent)
              return match
                ? {
                    ...student,
                    checkInTime: updated.check_in
                      ? new Date(updated.check_in).toLocaleTimeString()
                      : student.checkInTime,
                    checkOutTime: updated.check_out
                      ? new Date(updated.check_out).toLocaleTimeString()
                      : student.checkOutTime,
                    isAbsent: updated.is_absent || false,
                  }
                : student
            })
            console.log('[DEBUG] Students after UPDATE update:', newStudents)
            return newStudents
          })
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [teacherId, selectedClass, selectedSubject, attendanceStarted, sessionId])

const handleManualCheckIn = useCallback(async (studentId: string) => {
  if (!teacherId || !selectedClass || !selectedSubject || !sessionId) return

  const checkInTime = new Date().toISOString()

  try {
    const { error } = await supabase.from("attendance").upsert([
      {
        student_id: studentId,
        teacher_id: teacherId,
        class: selectedClass,
        subject: selectedSubject,
        date: checkInTime.split("T")[0],
        check_in: checkInTime,
        method: "manual",
        session_id: sessionId,
        is_absent: false,
      },
    ], { onConflict: 'student_id,session_id' })

    if (!error) {
      setStudents((prev) =>
        prev.map((s) =>
          String(s.id) === String(studentId)
            ? { ...s, checkInTime: new Date(checkInTime).toLocaleTimeString(), isAbsent: false }
            : s
        )
      )
      showToast("Student checked in successfully")
    } else {
      console.error("Manual check-in failed:", error.message)
      showToast("Failed to check in student", "error")
    }
  } catch (error) {
    console.error("Error in manual check-in:", error)
    showToast("Failed to check in student", "error")
  }
}, [teacherId, selectedClass, selectedSubject, sessionId, showToast])

  const handleMarkAbsent = useCallback(async (studentId: string) => {
    if (!teacherId || !selectedClass || !selectedSubject || !sessionId) return

    const date = today
    try {
      const { error } = await supabase.from('attendance').upsert([
        {
          student_id: studentId,
          teacher_id: teacherId,
          session_id: sessionId,
          date,
          class: selectedClass,
          subject: selectedSubject,
          is_absent: true,
          method: "manual",
        }
      ], { onConflict: 'student_id,session_id' })

      if (!error) {
        setStudents((prev) =>
          prev.map((s) =>
            String(s.id) === String(studentId) ? { ...s, isAbsent: true, checkInTime: undefined, checkOutTime: undefined } : s
          )
        )
        showToast("Student marked as absent")
      } else {
        console.error("Mark absent failed:", error.message)
        showToast("Failed to mark student as absent", "error")
      }
    } catch (error) {
      console.error("Error marking absent:", error)
      showToast("Failed to mark student as absent", "error")
    }
  }, [teacherId, selectedClass, selectedSubject, sessionId, today, showToast])

  const handleManualCheckOut = useCallback(async (studentId: string) => {
    if (!teacherId || !selectedClass || !selectedSubject || !sessionId) return
  
    const checkOutTime = new Date().toISOString()
  
    try {
      const { error } = await supabase
        .from("attendance")
        .update({ check_out: checkOutTime, method: "manual" })
        .match({
          student_id: studentId,
          teacher_id: teacherId,
          class: selectedClass,
          subject: selectedSubject,
          date: checkOutTime.split("T")[0],
          session_id: sessionId,
        })
  
      if (!error) {
        setStudents((prev) =>
          prev.map((s) =>
            String(s.id) === String(studentId)
              ? { ...s, checkOutTime: new Date(checkOutTime).toLocaleTimeString(), isAbsent: false }
              : s
          )
        )
        showToast("Student checked out successfully")
      } else {
        console.error("Manual check-out failed:", error.message)
        showToast("Failed to check out student", "error")
      }
    } catch (error) {
      console.error("Error in manual check-out:", error)
      showToast("Failed to check out student", "error")
    }
  }, [teacherId, selectedClass, selectedSubject, sessionId, showToast])
  

  const handleUndoCheckOut = useCallback(async (studentId: string) => {
    if (!teacherId || !selectedClass || !selectedSubject || !sessionId) return

    try {
      const { error } = await supabase
        .from("attendance")
        .update({ 
          check_out: null,
        })
        .match({
          student_id: studentId,
          teacher_id: teacherId,
          class: selectedClass,
          subject: selectedSubject,
          date: new Date().toISOString().split("T")[0],
          session_id: sessionId,
        })

      if (!error) {
        setStudents((prev) =>
          prev.map((s) => (String(s.id) === String(studentId) ? { ...s, checkOutTime: undefined } : s))
        )
        showToast("Check-out undone successfully")
      } else {
        console.error("Undo checkout failed:", error.message)
        showToast("Failed to undo check-out", "error")
      }
    } catch (error) {
      console.error("Error undoing check-out:", error)
      showToast("Failed to undo check-out", "error")
    }
  }, [teacherId, selectedClass, selectedSubject, sessionId, showToast])

  // 1. Add undo check-in handler
  const handleUndoCheckIn = useCallback(async (studentId: string) => {
    if (!teacherId || !selectedClass || !selectedSubject || !sessionId) return
    try {
      const { error } = await supabase
        .from("attendance")
        .update({ check_in: null })
        .match({
          student_id: studentId,
          teacher_id: teacherId,
          class: selectedClass,
          subject: selectedSubject,
          date: new Date().toISOString().split("T")[0],
          session_id: sessionId,
        })
      if (!error) {
        setStudents((prev) =>
          prev.map((s) => (String(s.id) === String(studentId) ? { ...s, checkInTime: undefined } : s))
        )
        showToast("Check-in undone successfully")
      } else {
        console.error("Undo check-in failed:", error.message)
        showToast("Failed to undo check-in", "error")
      }
    } catch (error) {
      console.error("Error undoing check-in:", error)
      showToast("Failed to undo check-in", "error")
    }
  }, [teacherId, selectedClass, selectedSubject, sessionId, showToast])

  // Update session mode when tab changes
  useEffect(() => {
    if (!sessionId) return

    const updateSessionMode = async () => {
      try {
        await supabase
          .from("mobile_sessions")
          .update({ mode: activeTab === "checkin" ? "check-in" : "check-out" })
          .eq("id", sessionId)
      } catch (error) {
        console.error("Error updating session mode:", error)
      }
    }

    updateSessionMode()
  }, [activeTab, sessionId])

  const handleEndAttendance = useCallback(async () => {
    if (!sessionId) return;
    try {
      // Only update session status if there are no students
      if (students.length === 0) {
        await supabase
          .from("mobile_sessions")
          .update({ is_active: false })
          .eq("id", sessionId);
        showToast("Attendance session ended successfully");
        setAttendanceStarted(false);
        setSelectedClass("");
        setSelectedSubject("");
        setStudents([]);
        setActiveTab("checkin");
        setSessionId(null);
        return;
      }
      // Deactivate the session
      await supabase
        .from("mobile_sessions")
        .update({ is_active: false })
        .eq("id", sessionId)

      showToast("Attendance session ended successfully")
      
      // Reset state
      setAttendanceStarted(false)
      setSelectedClass("")
      setSelectedSubject("")
      setStudents([])
      setActiveTab("checkin")
      setSessionId(null)
    } catch (error) {
      console.error("Error ending attendance:", error)
      showToast("Failed to end attendance session", "error")
    }
  }, [sessionId, showToast, students.length]);

  const markedStudents = students.filter((s) => s.checkInTime && !s.isAbsent)
  const pendingStudents = students.filter((s) => !s.checkInTime && !s.isAbsent)
  const absentStudents = students.filter((s) => s.isAbsent)

  const canEndAttendance = useMemo(() => {
    if (students.length === 0) return true;
    const activeStudents = students.filter((s) => !s.isAbsent);
    if (activeStudents.length === 0) return true;
    return activeStudents.every((s) => s.checkInTime && s.checkOutTime);
  }, [students]);

  // 2. Patch StudentCard to show Undo Check-In button
  const StudentCard = useCallback(({ student, mode }: { student: Student; mode: "checkin" | "checkout" }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div>
                <h4 className="font-medium">{student.name}</h4>
                <p className="text-sm text-muted-foreground">USN: {student.usn}</p>
              </div>
              {student.checkInTime && (
                <Badge variant="secondary" className="ml-2">
                  <Clock className="h-3 w-3 mr-1" />
                  In: {student.checkInTime}
                </Badge>
              )}
              {student.checkOutTime && (
                <Badge variant="outline" className="ml-2">
                  <Clock className="h-3 w-3 mr-1" />
                  Out: {student.checkOutTime}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {mode === "checkin" && student.checkInTime && !student.checkOutTime && !student.isAbsent && (
              <Button size="sm" variant="outline" onClick={() => handleUndoCheckIn(student.id)}>
                <Undo2 className="h-4 w-4 mr-1" />
                Undo Check-In
              </Button>
            )}
            {mode === "checkin" && !student.checkInTime && !student.isAbsent && (
              <>
               
                <Button size="sm" variant="outline" onClick={() => handleManualCheckIn(student.id)}>Check-In</Button>
                <Button size="sm" variant="destructive" onClick={() => handleMarkAbsent(student.id)}>Mark Absent</Button>

                
              </>
            )}
            {mode === "checkout" && student.checkInTime && !student.checkOutTime && (
              <Button
                size="sm"
                onClick={() => handleManualCheckOut(student.id)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserCheck className="h-4 w-4 mr-1" />
                Manual Check-Out
              </Button>
            )}
            {mode === "checkout" && student.checkOutTime && (
              <Button size="sm" variant="outline" onClick={() => handleUndoCheckOut(student.id)}>
                <Undo2 className="h-4 w-4 mr-1" />
                Undo Check-Out
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  ), [handleManualCheckIn, handleMarkAbsent, handleManualCheckOut, handleUndoCheckOut, handleUndoCheckIn])

  // 3. Add batch absent marking and alert when switching to check-out
  useEffect(() => {
    if (!sessionId) return
    // Only run when switching to checkout
    if (activeTab !== "checkout") return
    const pending = students.filter((s) => !s.checkInTime && !s.isAbsent)
    if (pending.length === 0) return
    // Show alert and confirm
    if (window.confirm(`There are ${pending.length} students who have not checked in. Mark them absent?`)) {
      const markAllAbsent = async () => {
        try {
          const date = today
          const updates = pending.map((s) => ({
            student_id: s.id,
            teacher_id: teacherId,
            session_id: sessionId,
            date,
            class: selectedClass,
            subject: selectedSubject,
            is_absent: true,
            method: "auto-batch",
          }))
          if (updates.length > 0) {
            await supabase.from('attendance').upsert(updates, { onConflict: 'student_id,session_id' })
            setStudents((prev) => prev.map((s) => !s.checkInTime && !s.isAbsent ? { ...s, isAbsent: true } : s))
            showToast("Pending students marked absent.")
          }
        } catch (err) {
          showToast("Failed to mark absentees", "error")
        }
      }
      markAllAbsent()
    }
  }, [activeTab])

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        {/* Hamburger menu for mobile */}
        <button
          className="md:hidden fixed top-4 left-4 z-50 bg-white rounded-full p-2 shadow border"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>
        {/* Sidebar overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)}>
            <div
              className="absolute left-0 top-0 h-full w-64 bg-white shadow-lg z-50 flex flex-col overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                className="self-end m-2 p-2 rounded hover:bg-gray-100"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
              {/* Sidebar content */}
              <AppSidebar />
            </div>
          </div>
        )}
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <SidebarInset>
          <div className="flex flex-1 flex-col h-full">
            <main className="flex-1 p-6 overflow-auto">
              <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-2">Take Attendance</h1>
                  <p className="text-muted-foreground">Manage student attendance for your classes</p>
                </div>

                {!attendanceStarted ? (
                  <Card className="w-full max-w-4xl mx-auto">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Start Attendance Session
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Select Class</label>
                          <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a class" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableClasses.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                  {cls.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Select Subject</label>
                          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSubjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        onClick={handleStartAttendance}
                        disabled={!selectedClass || !selectedSubject}
                        className="w-full"
                        size="lg"
                      >
                        Start Attendance
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold">
                          {availableClasses.find((c) => c.id === selectedClass)?.name} -{" "}
                          {availableSubjects.find((s) => s.id === selectedSubject)?.name}
                        </h2>
                        <p className="text-muted-foreground">
                          Total Students: {students.length} | Present: {markedStudents.length} | Absent:{" "}
                          {absentStudents.length}
                        </p>
                      </div>
                      <Button
                        onClick={handleEndAttendance}
                        disabled={!canEndAttendance}
                        variant="destructive"
                        size="lg"
                      >
                        End Attendance
                      </Button>
                    </div>

                    {students.length === 0 && (
                      <div className="text-center text-red-500 font-semibold my-4">
                        No students in this class/subject.
                      </div>
                    )}

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-2 max-w-md">
                        <TabsTrigger value="checkin">Check-In Mode</TabsTrigger>
                        <TabsTrigger value="checkout">Check-Out Mode</TabsTrigger>
                      </TabsList>

                      <TabsContent value="checkin" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <UserCheck className="h-5 w-5 text-green-600" />
                              Marked Students ({markedStudents.length})
                            </h3>
                            <div className="space-y-3">
                              {markedStudents.length === 0 ? (
                                <Card>
                                  <CardContent className="p-6 text-center text-muted-foreground">
                                    No students marked present yet
                                  </CardContent>
                                </Card>
                              ) : (
                                markedStudents.map((student) => (
                                  <StudentCard key={student.id} student={student} mode="checkin" />
                                ))
                              )}
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <Users className="h-5 w-5 text-orange-600" />
                              Pending Students ({pendingStudents.length})
                            </h3>
                            <div className="space-y-3">
                              {pendingStudents.length === 0 ? (
                                <Card>
                                  <CardContent className="p-6 text-center text-muted-foreground">
                                    All students have been marked
                                  </CardContent>
                                </Card>
                              ) : (
                                pendingStudents.map((student) => (
                                  <StudentCard key={student.id} student={student} mode="checkin" />
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="checkout" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <UserCheck className="h-5 w-5 text-blue-600" />
                              Ready for Check-Out ({markedStudents.filter((s) => !s.checkOutTime).length})
                            </h3>
                            <div className="space-y-3">
                              {markedStudents.filter((s) => !s.checkOutTime).length === 0 ? (
                                <Card>
                                  <CardContent className="p-6 text-center text-muted-foreground">
                                    No students ready for check-out
                                  </CardContent>
                                </Card>
                              ) : (
                                markedStudents
                                  .filter((s) => !s.checkOutTime)
                                  .map((student) => <StudentCard key={student.id} student={student} mode="checkout" />)
                              )}
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <Clock className="h-5 w-5 text-green-600" />
                              Checked Out ({markedStudents.filter((s) => s.checkOutTime).length})
                            </h3>
                            <div className="space-y-3">
                              {markedStudents.filter((s) => s.checkOutTime).length === 0 ? (
                                <Card>
                                  <CardContent className="p-6 text-center text-muted-foreground">
                                    No students checked out yet
                                  </CardContent>
                                </Card>
                              ) : (
                                markedStudents
                                  .filter((s) => s.checkOutTime)
                                  .map((student) => <StudentCard key={student.id} student={student} mode="checkout" />)
                              )}
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export default function Page() {
  return <TeacherAttendance />
}