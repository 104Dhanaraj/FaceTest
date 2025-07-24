"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Home, Users, Calendar, BarChart3, GraduationCap, LogOut, Edit, Save, X } from "lucide-react"

// Navigation items for sidebar
const navigationItems = [
  { title: "Dashboard", icon: Home, url: "#", isActive: false },
  { title: "Take Attendance", icon: Users, url: "#", isActive: true },
  { title: "Attendance History", icon: Calendar, url: "#", isActive: false },
  { title: "Reports", icon: BarChart3, url: "#", isActive: false },
]

// Sidebar component
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

// Type definitions
interface AttendanceRecord {
  [date: string]: string // 'P' or 'A'
}

interface StudentAttendance {
  usn: string
  name: string
  attendance: AttendanceRecord
}

interface Subject {
  id: string
  name: string
}

interface GlobalEditData {
  [usn: string]: AttendanceRecord
}

// Mock data
const mockClasses: { id: string; name: string }[] = [
  { id: "1", name: "10th Grade A" },
  { id: "2", name: "10th Grade B" },
  { id: "3", name: "11th Grade A" },
]

const mockSubjects: { [classId: string]: Subject[] } = {
  "1": [
    { id: "math-10a", name: "Mathematics" },
    { id: "sci-10a", name: "Science" },
  ],
  "2": [
    { id: "math-10b", name: "Mathematics" },
    { id: "eng-10b", name: "English" },
  ],
  "3": [
    { id: "phy-11a", name: "Physics" },
    { id: "chem-11a", name: "Chemistry" },
  ],
}

const mockAttendanceData: StudentAttendance[] = [
  {
    usn: "USN001",
    name: "John Doe",
    attendance: {
      "2024-01-15": "P",
      "2024-01-17": "A",
      "2024-01-19": "P",
      "2024-01-22": "P",
      "2024-01-24": "A",
      "2024-01-26": "P",
      "2024-01-29": "P",
      "2024-01-31": "A",
      "2024-02-02": "P",
      "2024-02-05": "A",
      "2024-02-07": "P",
      "2024-02-09": "P",
      "2024-02-12": "A",
      "2024-02-14": "P",
      "2024-02-16": "P",
      "2024-02-19": "A",
      "2024-02-21": "P",
      "2024-02-23": "A",
      "2024-02-26": "P",
      "2024-02-28": "P",
    },
  },
  {
    usn: "USN002",
    name: "Jane Smith",
    attendance: {
      "2024-01-15": "P",
      "2024-01-17": "P",
      "2024-01-19": "A",
      "2024-01-22": "P",
      "2024-01-24": "P",
      "2024-01-26": "A",
      "2024-01-29": "P",
      "2024-01-31": "P",
      "2024-02-02": "A",
      "2024-02-05": "P",
      "2024-02-07": "P",
      "2024-02-09": "A",
      "2024-02-12": "P",
      "2024-02-14": "P",
      "2024-02-16": "A",
      "2024-02-19": "P",
      "2024-02-21": "P",
      "2024-02-23": "P",
      "2024-02-26": "A",
      "2024-02-28": "P",
    },
  },
  {
    usn: "USN003",
    name: "Mike Johnson",
    attendance: {
      "2024-01-15": "A",
      "2024-01-17": "A",
      "2024-01-19": "P",
      "2024-01-22": "A",
      "2024-01-24": "P",
      "2024-01-26": "A",
      "2024-01-29": "A",
      "2024-01-31": "P",
      "2024-02-02": "A",
      "2024-02-05": "A",
      "2024-02-07": "A",
      "2024-02-09": "P",
      "2024-02-12": "A",
      "2024-02-14": "A",
      "2024-02-16": "P",
      "2024-02-19": "A",
      "2024-02-21": "A",
      "2024-02-23": "A",
      "2024-02-26": "P",
      "2024-02-28": "A",
    },
  },
  {
    usn: "USN004",
    name: "Sarah Wilson",
    attendance: {
      "2024-01-15": "P",
      "2024-01-17": "P",
      "2024-01-19": "P",
      "2024-01-22": "P",
      "2024-01-24": "P",
      "2024-01-26": "P",
      "2024-01-29": "P",
      "2024-01-31": "P",
      "2024-02-02": "P",
      "2024-02-05": "P",
      "2024-02-07": "P",
      "2024-02-09": "P",
      "2024-02-12": "P",
      "2024-02-14": "P",
      "2024-02-16": "P",
      "2024-02-19": "P",
      "2024-02-21": "P",
      "2024-02-23": "P",
      "2024-02-26": "P",
      "2024-02-28": "P",
    },
  },
  {
    usn: "USN005",
    name: "David Brown",
    attendance: {
      "2024-01-15": "P",
      "2024-01-17": "A",
      "2024-01-19": "P",
      "2024-01-22": "A",
      "2024-01-24": "P",
      "2024-01-26": "P",
      "2024-01-29": "A",
      "2024-01-31": "P",
      "2024-02-02": "P",
      "2024-02-05": "A",
      "2024-02-07": "P",
      "2024-02-09": "A",
      "2024-02-12": "P",
      "2024-02-14": "A",
      "2024-02-16": "P",
      "2024-02-19": "P",
      "2024-02-21": "A",
      "2024-02-23": "P",
      "2024-02-26": "A",
      "2024-02-28": "P",
    },
  },
]

export default function Page() {
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [sortBy, setSortBy] = useState<string>("")
  const [isGlobalEdit, setIsGlobalEdit] = useState<boolean>(false)
  const [globalEditData, setGlobalEditData] = useState<GlobalEditData>({})
  const [attendanceData, setAttendanceData] = useState<StudentAttendance[]>([])
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  const availableSubjects: Subject[] = selectedClass ? mockSubjects[selectedClass] || [] : []

  const processedData = useMemo(() => {
    if (!attendanceData.length) return []

    const data = attendanceData.map((student) => {
      const attendanceDates = Object.keys(student.attendance)
      const totalSessions = attendanceDates.length
      const attendedSessions = attendanceDates.filter((date) => student.attendance[date] === "P").length
      const attendancePercent = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0

      return {
        ...student,
        totalSessions,
        attendedSessions,
        attendancePercent,
      }
    })

    if (sortBy === "usn-asc") {
      data.sort((a, b) => a.usn.localeCompare(b.usn))
    } else if (sortBy === "usn-desc") {
      data.sort((a, b) => b.usn.localeCompare(a.usn))
    } else if (sortBy === "name-asc") {
      data.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === "name-desc") {
      data.sort((a, b) => b.name.localeCompare(a.name))
    }

    return data
  }, [attendanceData, sortBy])

  const filteredAndSortedData = useMemo(() => {
    let data = [...processedData]
    if (sortBy === "percentage-lt-50") {
      data = data.filter((student) => student.attendancePercent < 50)
    } else if (sortBy === "percentage-lt-85") {
      data = data.filter((student) => student.attendancePercent < 85)
    }
    return data
  }, [processedData, sortBy])

  const attendanceDates = useMemo(() => {
    if (!attendanceData.length) return []
    const allDates = new Set<string>()
    attendanceData.forEach((student) => {
      Object.keys(student.attendance).forEach((date) => allDates.add(date))
    })
    return Array.from(allDates).sort()
  }, [attendanceData])

  const handleLoadData = () => {
    if (!selectedClass || !selectedSubject) {
      alert("Please select both class and subject")
      return
    }
    setAttendanceData(mockAttendanceData)
    setIsLoaded(true)
  }

  const handleGlobalEdit = () => {
    setIsGlobalEdit(true)
    const editData: GlobalEditData = {}
    attendanceData.forEach((student) => {
      editData[student.usn] = { ...student.attendance }
    })
    setGlobalEditData(editData)
  }

  const handleCancelGlobalEdit = () => {
    setIsGlobalEdit(false)
    setGlobalEditData({})
  }

  const handleGlobalSave = () => {
    const updatedData = attendanceData.map((student) => {
      if (globalEditData[student.usn]) {
        return { ...student, attendance: { ...globalEditData[student.usn] } }
      }
      return student
    })
    setAttendanceData(updatedData)
    setIsGlobalEdit(false)
    setGlobalEditData({})
    console.log("Saving all attendance changes", globalEditData)
  }

  const toggleGlobalAttendance = (usn: string, date: string, currentStatus: string) => {
    setGlobalEditData((prev) => ({
      ...prev,
      [usn]: {
        ...prev[usn],
        [date]: currentStatus === "P" ? "A" : "P",
      },
    }))
  }

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen overflow-hidden"> {/* Flex row: sidebar + main content, no page scroll */}
        <div className="w-[220px] flex-shrink-0">
          <AppSidebar />
        </div>
        <div className="flex-1 min-w-0 flex flex-col"> {/* Main content, no margin, no h-full */}
          <SidebarInset>
            <main className="flex flex-col"> {/* No margin, no h-full */}
              <div className="w-full"> {/* Fill available width */}
                <div className="p-6 pb-0 space-y-6">
                  <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Attendance History</h1>
                  </div>
                  {/* Filter Section */}
                  <Card className="w-full">
                    <CardHeader>
                      <CardTitle>Filters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="class">Class</Label>
                          <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                              {mockClasses.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                  {cls.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="subject">Subject</Label>
                          <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedClass}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subject" />
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
                        <div className="space-y-2">
                          <Label htmlFor="start-date">Start Date</Label>
                          <Input
                            id="start-date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end-date">End Date</Label>
                          <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                      </div>
                      <Button onClick={handleLoadData} className="w-full md:w-auto">
                        Load Attendance Data
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                {/* Attendance Table */}
                {isLoaded && (
                  <Card className="flex-1 flex flex-col min-h-0 w-full mt-6">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Attendance Records</CardTitle>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Sort By:</Label>
                            <Select value={sortBy} onValueChange={setSortBy}>
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select sorting/filter option" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="usn-asc">USN - Ascending</SelectItem>
                                <SelectItem value="usn-desc">USN - Descending</SelectItem>
                                <SelectItem value="name-asc">Name - Ascending</SelectItem>
                                <SelectItem value="name-desc">Name - Descending</SelectItem>
                                <SelectItem value="percentage-lt-50">Attendance % {"<"} 50%</SelectItem>
                                <SelectItem value="percentage-lt-85">Attendance % {"<"} 85%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {isLoaded && (
                            <div className="flex gap-2">
                              {!isGlobalEdit ? (
                                <Button onClick={handleGlobalEdit}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit All
                                </Button>
                              ) : (
                                <>
                                  <Button onClick={handleGlobalSave}>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save All
                                  </Button>
                                  <Button variant="outline" onClick={handleCancelGlobalEdit}>
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 w-full p-0">
                      <div className="w-full overflow-x-auto overflow-y-auto max-h-[60vh]"> {/* Only this div scrolls */}
                        <table className="min-w-[900px] w-full border-collapse border border-gray-300"> {/* min-width for scroll */}
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-4 py-2 text-left font-semibold sticky left-0 bg-gray-50 z-20 min-w-[100px]">
                                USN
                              </th>
                              <th className="border border-gray-300 px-4 py-2 text-left font-semibold sticky left-[100px] bg-gray-50 z-20 min-w-[150px]">
                                Name
                              </th>
                              {attendanceDates.map((date) => (
                                <th
                                  key={date}
                                  className="border border-gray-300 px-2 py-2 text-center font-semibold min-w-[80px]"
                                >
                                  {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </th>
                              ))}
                              <th className="border border-gray-300 px-4 py-2 text-center font-semibold min-w-[100px]">
                                Attended
                              </th>
                              <th className="border border-gray-300 px-4 py-2 text-center font-semibold min-w-[120px]">
                                Attendance %
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAndSortedData.map((student) => (
                              <tr key={student.usn} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-2 font-medium sticky left-0 bg-white z-10 min-w-[100px]">
                                  {student.usn}
                                </td>
                                <td className="border border-gray-300 px-4 py-2 sticky left-[100px] bg-white z-10 min-w-[150px]">
                                  {student.name}
                                </td>
                                {attendanceDates.map((date) => {
                                  const status = isGlobalEdit ? globalEditData[student.usn]?.[date] : student.attendance[date]
                                  return (
                                    <td key={date} className="border border-gray-300 px-2 py-2 text-center">
                                      {isGlobalEdit ? (
                                        <button
                                          onClick={() => toggleGlobalAttendance(student.usn, date, status)}
                                          className={`w-full h-full py-1 px-2 font-semibold ${
                                            status === "P"
                                              ? "text-green-600 hover:bg-green-50"
                                              : "text-red-600 hover:bg-red-50"
                                          }`}
                                        >
                                          {status || "-"}
                                        </button>
                                      ) : (
                                        <span
                                          className={`font-semibold ${status === "P" ? "text-green-600" : "text-red-600"}`}
                                        >
                                          {status || "-"}
                                        </span>
                                      )}
                                    </td>
                                  )
                                })}
                                <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                                  {student.attendedSessions} / {student.totalSessions}
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                                  {student.attendancePercent}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {filteredAndSortedData.length === 0 && (
                        <div className="text-center py-8 text-gray-500">No students match the current filters.</div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  )
}
