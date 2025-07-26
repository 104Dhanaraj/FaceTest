// src/app/teacher/dashboard/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import {
  BookOpen,
  ClipboardList,
  Home,
  FileText,
  Users,
  GraduationCap,
  LogOut,
  Calendar,
  AlertTriangle,
  X,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"


export default function TeacherDashboard() {
  const [teacherName, setTeacherName] = useState("")
  const [totalClasses, setTotalClasses] = useState(0)
  const [lowAttendanceStudents, setLowAttendanceStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
const [presentCount, setPresentCount] = useState(0)
const [totalMarkedToday, setTotalMarkedToday] = useState(0)

  const router = useRouter()

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: authUser, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser?.user) {
        console.error("Auth error:", authError?.message)
        return
      }

      const { data: teacherData, error: teacherError } = await supabase
        .from("users")
        .select("name, classes, subjects")
        .eq("id", authUser.user.id)
        .single()

      if (teacherError || !teacherData) {
        console.error("Teacher fetch error:", teacherError?.message)
        return
      }

      setTeacherName(teacherData.name)
      setTotalClasses(teacherData.classes?.length || 0)

      const { data: students, error: studentError } = await supabase
  .from("students")
  .select("id, name, class, usn")
  .in("class", teacherData.classes)

if (studentError || !students) {
  console.error("Student fetch error:", studentError?.message)
  return
}

const studentIds = students.map((s) => s.id)

// ⬇️ Fetch today's attendance
const today = new Date()
today.setHours(0, 0, 0, 0)
const todayISO = today.toISOString()

const { data: todayAttendance, error: todayAttendanceError } = await supabase
  .from("attendance")
  .select("student_id, is_absent, date")
  .in("student_id", studentIds)
  .eq("teacher_id", authUser.user.id)
  .gte("date", todayISO)

if (todayAttendanceError) {
  console.error("Today's attendance error:", todayAttendanceError.message)
  return
}

const presentToday = todayAttendance.filter((a) => !a.is_absent).length
const totalToday = todayAttendance.length

setPresentCount(presentToday)
setTotalMarkedToday(totalToday)

// ⬇️ Fetch all-time attendance
const { data: attendance, error: attendanceError } = await supabase
  .from("attendance")
  .select("student_id, is_absent")
  .in("student_id", studentIds)
  .eq("teacher_id", authUser.user.id)

if (attendanceError || !attendance) {
  console.error("Attendance fetch error:", attendanceError?.message)
  return
}

const attendanceMap = new Map()

studentIds.forEach((id) => {
  const records = attendance.filter((a) => a.student_id === id)
  const total = records.length
  const present = records.filter((r) => !r.is_absent).length
  const percent = total > 0 ? Math.round((present / total) * 100) : 0

  if (percent < 85) {
    attendanceMap.set(id, { total, attended: present, percent })
  }
})

const lowAttendance = students
  .filter((s) => attendanceMap.has(s.id))
  .map((s) => ({
    id: s.id,
    name: s.name,
    usn: s.usn,
    class: s.class,
    subject: "—", // Optional
    totalClasses: attendanceMap.get(s.id)?.total || 0,
    attended: attendanceMap.get(s.id)?.attended || 0,
    attendance: `${attendanceMap.get(s.id)?.percent || 0}%`,
  }))

setLowAttendanceStudents(lowAttendance)
    }
  fetchDashboardData() // ← move this inside useEffect
}, [])

  const navigationItems = [
    { title: "Dashboard", icon: Home, url: "#", isActive: true },
    { title: "Take Attendance", icon: Users, url: "/teacher/take-attendance", isActive: false },
  ]

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">RVCE</span>
            <span className="text-xs text-muted-foreground">Teacher Portal</span>
          </div>
        </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive} className="h-12 text-base font-medium">
                      <a href={item.url} className="flex items-center gap-3 px-4">
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Logout Section */}
          <div className="mt-auto pt-4 border-t border-slate-200">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="h-12 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <button
                    onClick={() => {
                      // Add logout logic here
                      console.log("Logging out...")
                      // Example: redirect to login page
                      // window.location.href = '/login';
                    }}
                    className="flex items-center gap-3 px-4 w-full"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-6 shadow-sm">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-xl font-semibold text-slate-900">Teacher Dashboard</h1>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Welcome Message */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {teacherName ? `Welcome, Prof. ${teacherName}` : "Welcome"}
            </h2>
            <p className="text-slate-600 text-lg">Here's your attendance overview for today</p>
          </div>

          {/* Dashboard Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-4xl">
            {/* Card 1: Today's Classes */}
            <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-700">Today's Classes</CardTitle>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-bold text-green-600">{totalClasses}</div>
                    <div className="text-lg text-slate-600">classes assigned</div>
                  </div>
                  <p className="text-sm text-slate-600">Data fetched from your profile</p>
                  <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                    <div className="h-full w-3/5 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Students Present Today (static for now) */}
            <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-700">Students Present Today</CardTitle>
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-bold text-blue-600">{presentCount}</div>
<div className="text-lg text-slate-600">out of {totalMarkedToday}</div>
<p className="text-sm text-slate-600">
  {totalMarkedToday > 0
    ? `${Math.round((presentCount / totalMarkedToday) * 100)}% attendance rate today`
    : "No attendance recorded yet today"}
</p>

                  </div>
                  <p className="text-sm text-slate-600">85% attendance rate today</p>
                  <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div className="h-full w-5/6 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Students with Low Attendance */}
          <div className="mt-8 bg-white rounded-lg shadow-md border-l-4 border-orange-500">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Students with {"<85%"} Attendance</h3>
                  <p className="text-sm text-slate-600">Students requiring attention based on total classes</p>
                </div>
              </div>

              <div className="space-y-3">
                {lowAttendanceStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-slate-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-slate-700">
                          {student.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{student.name}</p>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <span className="bg-slate-200 px-2 py-1 rounded text-xs font-medium">{student.class}</span>
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                            {student.subject}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {student.attended}/{student.totalClasses} classes attended
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-lg font-bold ${
                          Number.parseInt(student.attendance) < 70
                            ? "text-red-600"
                            : Number.parseInt(student.attendance) < 80
                            ? "text-orange-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {student.attendance}
                      </div>
                      <p className="text-xs text-slate-500">attendance</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
