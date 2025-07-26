"use client"

import { useState } from "react"
import {
  // Calendar,
  ChevronDown,
  FileSpreadsheet,
  FileIcon as FilePdf,
  GraduationCap,
  LogOut,
  Home,
  ClipboardList,
  FileText,
} from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar as CalendarComponent } from "@/components/ui/calendar" //this is is giving error   //gives error  
import { Calendar as CalendarIcon } from "lucide-react";      // For the icon
import { format } from "date-fns";   
export { Calendar } from "./react-day-picker"
                    

import { cn } from "@/lib/utils"
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
} from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabase" 


const classOptions = ["MCA-IA", "MCA-IB", "MCA-IIA", "MCA-IIB"]
const subjectOptions = ["Math", "DevOps","Major Project","MAD","IOT","Data-Science I","Data-Science II","DBMS","Computer Networks","Linux","Research Methodology","Minor Project","Techincal Seminar"]


// Navigation items
const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    isActive: false,
  },
  {
    title: "Manual Attendance",
    url: "/manual-attendance",
    icon: ClipboardList,
    isActive: false,
  },
  {
    title: "Attendance Reports",
    url: "/attendance-reports",
    icon: FileText,
    isActive: true,
  },
]

// Generate sample attendance data for more days
const generateAttendance = (days: number) => {
  return Array(days)
    .fill(0)
    .map(() => (Math.random() > 0.2 ? 1 : 0))
}




export default function AttendanceReport() {
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [fromDate, setFromDate] = useState<Date>()
  const [toDate, setToDate] = useState<Date>()
  const [isClassOpen, setIsClassOpen] = useState(false)
  const [isSubjectOpen, setIsSubjectOpen] = useState(false)
  const [reportLoaded, setReportLoaded] = useState(false)
  const [students, setStudents] = useState([])
const [dates, setDates] = useState<Date[]>([])

  // Generate dates for the table columns
  const getDates = () => {
    if (!fromDate || !toDate) return []

    const dates = []
    const currentDate = new Date(fromDate)

    while (currentDate <= toDate) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return dates
  }



  // Update the attendance percentage calculation
  const calculateAttendancePercentage = (attendance: number[], dateCount: number) => {
    if (dateCount === 0) return 0
    const relevantAttendance = attendance.slice(0, dateCount)
    const present = relevantAttendance.filter((a) => a === 1).length
    return (present / dateCount) * 100
  }

  // Check if all required fields are selected
  const isFormValid = () => {
    return selectedClass && selectedSubject && fromDate && toDate
  }

  
  const handleLoadReport = async () => {
  if (!isFormValid()) return

  setReportLoaded(false)

  try {
    const { data: authUser, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser?.user) throw new Error("Not authenticated")

    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, name, usn")
      .eq("class", selectedClass)

    if (studentsError) throw studentsError

    const studentIds = studentsData.map((s) => s.id)

  
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance")
      .select("student_id, date, is_absent")
      .in("student_id", studentIds)
      .eq("teacher_id", authUser.user.id)
      .eq("subject", selectedSubject)
      .gte("date", fromDate.toISOString())
      .lte("date", toDate.toISOString())

    if (attendanceError) throw attendanceError

    
    const dateMap = {}
    const currentDate = new Date(fromDate)
    while (currentDate <= toDate) {
      dateMap[currentDate.toISOString().split("T")[0]] = true
      currentDate.setDate(currentDate.getDate() + 1)
    }

    const dateKeys = Object.keys(dateMap)

    const studentsWithAttendance = studentsData.map((student) => {
      const attendance = dateKeys.map((dateStr) => {
        const record = attendanceData.find(
          (r) => r.student_id === student.id && r.date === dateStr
        )
        return record ? (record.is_absent ? 0 : 1) : 0 // Default to absent
      })

      return {
        ...student,
        attendance,
      }
    })

    setReportLoaded(true)
    setDates(dateKeys.map((d) => new Date(d))) // You need to create a `setDates` state hook
    setStudents(studentsWithAttendance) // You also need a `setStudents` state hook

  } catch (err) {
    console.error("Error loading report:", err)
  }
}


  return (
    <SidebarProvider>
      <Sidebar className="border-r border-slate-200 z-50">
        <SidebarHeader className="border-b border-slate-200 p-6">
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

        <SidebarContent className="p-4">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
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

      <SidebarInset className="relative">
        <main className="flex-1 p-6 overflow-auto">
          <h1 className="text-2xl font-bold mb-6">Class Attendance Ledger</h1>

          <Card className="p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Class Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Class *</label>
                <Popover open={isClassOpen} onOpenChange={setIsClassOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isClassOpen}
                      className={cn("w-full justify-between bg-transparent", !selectedClass && "text-muted-foreground")}
                    >
                      {selectedClass || "Select Class"}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search class..." />
                      <CommandList>
                        <CommandEmpty>No class found.</CommandEmpty>
                        <CommandGroup>
                          {classOptions.map((classItem) => ( 

                            <CommandItem
                              key={classItem}
                              value={classItem}
                              onSelect={(currentValue) => {
                                setSelectedClass(currentValue)
                                setIsClassOpen(false)
                              }}
                            >
                              {classItem}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Subject Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject *</label>
                <Popover open={isSubjectOpen} onOpenChange={setIsSubjectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isSubjectOpen}
                      className={cn(
                        "w-full justify-between bg-transparent",
                        !selectedSubject && "text-muted-foreground",
                      )}
                    >
                      {selectedSubject || "Select Subject"}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search subject..." />
                      <CommandList>
                        <CommandEmpty>No subject found.</CommandEmpty>
                        <CommandGroup>
                          {subjectOptions.map((subject) => ( 

                            <CommandItem
                              key={subject}
                              value={subject}
                              onSelect={(currentValue) => {
                                setSelectedSubject(currentValue)
                                setIsSubjectOpen(false)
                              }}
                            >
                              {subject}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date Range Picker */}
              <div className="space-y-2">
                <label className="text-sm font-medium">From Date *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                    >
                      <Calendar className="mr-2 h-4 w-4" />      
                        {/* This is also giving error  */}
                      {fromDate ? format(fromDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
<CalendarComponent
  mode="single"
  selected={fromDate}
  onSelect={setFromDate}
  initialFocus
/>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">To Date *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                       {/* This is also giving error  */}
                      {toDate ? format(toDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      initialFocus
                      disabled={(date) => (fromDate ? date < fromDate : false)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleLoadReport}
                disabled={!isFormValid()}
                className={cn(!isFormValid() && "opacity-50 cursor-not-allowed")}
              >
                Load Report
              </Button>
            </div>

            {/* Show validation message */}
            {!isFormValid() && (
              <div className="mt-2 text-sm text-red-600 text-right">
                Please select all required fields (marked with *)
              </div>
            )}
          </Card>

          {reportLoaded && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  {selectedClass} - {selectedSubject} ({fromDate && format(fromDate, "dd MMM")} to{" "}
                  {toDate && format(toDate, "dd MMM")})
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex items-center gap-1 bg-transparent">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Export as Excel</span>
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center gap-1 bg-transparent">
                    <FilePdf className="h-4 w-4" />
                    <span>Export as PDF</span>
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-lg bg-white relative z-10">
                <div className="relative">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr>
                        {/* Fixed columns with proper z-index */}
                        <th className="sticky left-0 z-40 bg-gray-50 border-b border-r border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                          Student Name
                        </th>
                        <th className="sticky left-[200px] z-40 bg-gray-50 border-b border-r border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                          USN
                        </th>
                        {/* Date columns */}
                        {dates.map((date, index) => (
                          <th
                            key={index}
                            className="bg-gray-50 border-b border-r border-gray-200 px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px]"
                          >
                            <div className="whitespace-nowrap">{format(date, "dd-MMM")}</div>
                             {/* This is also giving error (format)  */}
                          </th>
                        ))}
                        <th className="bg-gray-50 border-b border-gray-200 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                          Attendance %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const attendancePercentage = calculateAttendancePercentage(student.attendance, dates.length)
                        const isLowAttendance = attendancePercentage < 85
                        const rowBgClass = isLowAttendance ? "bg-red-50" : "bg-white"

                        return (
                          <tr
                            key={student.id}
                            className={cn("hover:bg-gray-50", isLowAttendance && "hover:bg-red-100")}
                          >
                            {/* Fixed columns with proper z-index and matching background */}
                            <td
                              className={cn(
                                "sticky left-0 z-30 border-b border-r border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 min-w-[200px]",
                                rowBgClass,
                              )}
                            >
                              <div className="truncate">{student.name}</div>
                            </td>
                            <td
                              className={cn(
                                "sticky left-[200px] z-30 border-b border-r border-gray-200 px-4 py-3 text-sm text-gray-500 min-w-[120px]",
                                rowBgClass,
                              )}
                            >
                              <div className="truncate">{student.usn}</div>
                            </td>
                            {/* Date cells */}
                            {student.attendance.slice(0, dates.length).map((status, index) => (
                              <td
                                key={index}
                                className={cn(
                                  "border-b border-r border-gray-200 px-2 py-3 text-center min-w-[60px]",
                                  rowBgClass,
                                )}
                              >
                                <div className="flex justify-center">
                                  <span
                                    className={cn(
                                      "inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full",
                                      status === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
                                    )}
                                  >
                                    {status === 1 ? "P" : "A"}
                                  </span>
                                </div>
                              </td>
                            ))}
                            {/* Attendance percentage */}
                            <td
                              className={cn("border-b border-gray-200 px-4 py-3 text-center min-w-[100px]", rowBgClass)}
                            >
                              <span
                                className={cn(
                                  "text-sm font-semibold",
                                  isLowAttendance ? "text-red-600" : "text-green-600",
                                )}
                              >
                                {attendancePercentage.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
