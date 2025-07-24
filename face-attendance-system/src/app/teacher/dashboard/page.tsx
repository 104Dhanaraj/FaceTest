// src/app/teacher/dashboard/page.tsx
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  BookOpen,
  ClipboardList,
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

// Sample data for students with low attendance
const lowAttendanceStudents: {
  id: number
  name: string
  attendance: string
  totalClasses: number
  attended: number
  class: string
  subject: string
}[] = [
  {
    id: 1,
    name: "Alex Johnson",
    attendance: "68%",
    totalClasses: 25,
    attended: 17,
    class: "Grade 10A",
    subject: "Mathematics",
  },
  {
    id: 2,
    name: "Maria Garcia",
    attendance: "72%",
    totalClasses: 25,
    attended: 18,
    class: "Grade 9B",
    subject: "Physics",
  },
  {
    id: 3,
    name: "David Chen",
    attendance: "80%",
    totalClasses: 25,
    attended: 20,
    class: "Grade 11C",
    subject: "Mathematics",
  },
  {
    id: 4,
    name: "Sarah Williams",
    attendance: "76%",
    totalClasses: 25,
    attended: 19,
    class: "Grade 10A",
    subject: "Chemistry",
  },
  {
    id: 5,
    name: "Michael Brown",
    attendance: "64%",
    totalClasses: 25,
    attended: 16,
    class: "Grade 9B",
    subject: "Mathematics",
  },
]

export default function TeacherDashboard() {
  const [teacherName, setTeacherName] = useState("")
  const [totalClasses, setTotalClasses] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showQuickActions, setShowQuickActions] = useState(true)

  useEffect(() => {
    const fetchTeacherData = async () => {
      const { data: authUser, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser?.user) {
        console.error("Unable to get authenticated user:", authError?.message)
        return
      }

      const { data: teacherData, error: teacherError } = await supabase
        .from("users")
        .select("name, classes")
        .eq("id", authUser.user.id)
        .single()

      if (teacherError) {
        console.error("Failed to fetch teacher data:", teacherError.message)
        return
      }

      setTeacherName(teacherData.name)
      setTotalClasses(teacherData.classes?.length || 0)
      setLoading(false)
    }

    fetchTeacherData()
  }, [])

  const navigationItems = [
    { title: "Dashboard", icon: BookOpen, url: "#", isActive: true },
    { title: "Take Attendance", icon: Users, url: "/teacher/take-attendance", isActive: false },
    { title: "Manual Attendance", icon: ClipboardList, url: "#", isActive: false },
    { title: "Reports", icon: FileText, url: "#", isActive: false },
  ]
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">EduAttend</h2>
              <p className="text-sm text-slate-600">Face Recognition System</p>
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
                    <div className="text-4xl font-bold text-blue-600">76</div>
                    <div className="text-lg text-slate-600">out of 89</div>
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

          {/* Quick Actions Section */}
          {showQuickActions && (
            <div className="mt-8 p-6 bg-white rounded-lg shadow-md border-l-4 border-blue-500 relative">
              <button
                onClick={() => setShowQuickActions(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
                aria-label="Close quick actions"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
              <div className="flex items-start gap-4 pr-8">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Quick Actions</h3>
                  <p className="text-slate-600 mb-4">
                    Ready to take attendance for your next class? Use the face recognition system for quick and accurate
                    attendance marking.
                  </p>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      Take Attendance
                    </button>
                    <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium">
                      View Reports
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
