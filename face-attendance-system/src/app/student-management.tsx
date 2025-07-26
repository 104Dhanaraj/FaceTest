"use client"

import { useState, useEffect } from "react"
import { Edit, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Checkbox } from "@/components/ui/checkbox"

type Student = {
  id: number
  name: string
  usn: string
  class: string
  subjects: string[]
  phone: string
  guardianEmail: string
  guardianPhone: string
  imageUrls: string[]
  createdAt?: string // For hydration-safe "Registered at" column
}

const classOptions = ["MCA-IA","MCA-IB", "MCA-IIA", "MCA-IIB"]
const subjectOptions = ["Math", "DevOps","Major Project","MAD","IOT","Data-Science I","Data-Science II","DBMS","Computer Networks","Linux","Research Methodology","Minor Project","Techincal Seminar"]

export default function StudentManagement() {
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const studentsPerPage = 5
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)

  // Hydration-safe map for "Registered at" (client time formatting)
  const [registeredAtMap, setRegisteredAtMap] = useState<Record<number, string>>({})

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching students:", error.message)
      } else {
        const normalized = data.map((s) => ({
          id: s.id,
          name: s.name,
          usn: s.usn,
          class: s.class,
          subjects: s.subjects || [],
          phone: s.phone_number || "",
          guardianEmail: s.guardian_email || "",
          guardianPhone: s.guardian_phone || "",
          imageUrls: s.image_urls || [],
          createdAt: s.created_at || undefined,
        }))
        setStudents(normalized)
        setFilteredStudents(normalized)
      }
      setLoading(false)
    }

    fetchStudents()
  }, [])

  // Hydration-safe formatting for "Registered at"
  useEffect(() => {
    const map: Record<number, string> = {}
    students.forEach((s) => {
      if (s.createdAt) {
        const d = new Date(s.createdAt)
        map[s.id] = d.toLocaleString() // Only runs on client, so safe
      }
    })
    setRegisteredAtMap(map)
  }, [students])

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null)
  const [editFormData, setEditFormData] = useState<Student | null>(null)

  const applyFilters = () => {
    let filtered = students

    if (selectedClass) {
      filtered = filtered.filter((student) => student.class === selectedClass)
    }

    if (selectedSubject) {
      filtered = filtered.filter((student) => student.subjects.includes(selectedSubject))
    }

    setFilteredStudents(filtered)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSelectedClass("")
    setSelectedSubject("")
    setFilteredStudents(students)
    setCurrentPage(1)
  }

  const handleDelete = (studentId: number) => {
    setStudentToDelete(studentId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!studentToDelete) return

    // Find the student object
    const student = students.find((s) => s.id === studentToDelete)
    if (!student) return

    // 1. Delete attendance records
    await supabase.from("attendance").delete().eq("student_id", studentToDelete)

    // 2. Delete face embeddings by USN
    await supabase.from("face_embeddings").delete().eq("usn", student.usn)

    // 3. Delete images from storage bucket
    if (student.imageUrls && student.imageUrls.length > 0) {
      const paths = student.imageUrls.map((url) => {
        // Try to find the '/student-images/' part in the URL
        const marker = '/student-images/';
        const idx = url.indexOf(marker);
        if (idx !== -1) {
          return url.substring(idx + marker.length);
        }
        // fallback: try to extract after last '/object/public/student-images/'
        const altMarker = '/object/public/student-images/';
        const altIdx = url.indexOf(altMarker);
        if (altIdx !== -1) {
          return url.substring(altIdx + altMarker.length);
        }
        // fallback: just return the url (will fail, but logs will help)
        return url;
      });
      console.log('Deleting storage paths:', paths);
      const { data, error: storageError } = await supabase.storage.from('student-images').remove(paths);
      if (storageError) {
        console.error('Error deleting images from storage:', storageError.message);
      } else {
        console.log('Deleted from storage:', data);
      }
    }

    // 4. Delete student record
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", studentToDelete)

    if (error) {
      console.error("Error deleting student:", error.message)
    } else {
      const updated = students.filter((s) => s.id !== studentToDelete)
      setStudents(updated)
      setFilteredStudents(updated)
      setStudentToDelete(null)
      setDeleteDialogOpen(false)
    }
  }

  // Edit functions
  const handleEdit = (student: Student) => {
    setStudentToEdit(student)
    setEditFormData({ ...student })
    setEditDialogOpen(true)
  }

  const handleEditChange = (field: keyof Student, value: any) => {
    if (editFormData) {
      setEditFormData({
        ...editFormData,
        [field]: value,
      })
    }
  }

  const handleSubjectToggle = (subject: string) => {
    if (!editFormData) return

    const updatedSubjects = editFormData.subjects.includes(subject)
      ? editFormData.subjects.filter((s) => s !== subject)
      : [...editFormData.subjects, subject]

    setEditFormData({
      ...editFormData,
      subjects: updatedSubjects,
    })
  }

  const saveEdit = async () => {
    if (!editFormData || !editFormData.id) return

    const { error } = await supabase
      .from("students")
      .update({
        name: editFormData.name,
        usn: editFormData.usn,
        class: editFormData.class,
        subjects: editFormData.subjects,
        phone_number: editFormData.phone,
        guardian_email: editFormData.guardianEmail,
      })
      .eq("id", editFormData.id)

    if (error) {
      console.error("Error updating student:", error.message)
    } else {
      const updatedList = students.map((student) =>
        student.id === editFormData.id ? editFormData : student
      )
      setStudents(updatedList)
      setFilteredStudents(updatedList)
      setEditDialogOpen(false)
    }
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage)
  const startIndex = (currentPage - 1) * studentsPerPage
  const endIndex = startIndex + studentsPerPage
  const currentStudents = filteredStudents.slice(startIndex, endIndex)

  return (
    <>
      {/* Page Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center">
        <SidebarTrigger className="mr-4" />
        <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
      </header>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Filter Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="class-select">Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger id="class-select">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.map((classOption) => (
                      <SelectItem key={classOption} value={classOption}>
                        {classOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject-select">Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger id="subject-select">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={applyFilters} className="flex-1">
                  Apply Filters
                </Button>
                <Button onClick={clearFilters} variant="outline">
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Showing {currentStudents.length} of {filteredStudents.length} students
            </p>
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">USN</TableHead>
                  <TableHead className="font-semibold">Class</TableHead>
                  <TableHead className="font-semibold">Subjects</TableHead>
                  <TableHead className="font-semibold">Phone</TableHead>
                  <TableHead className="font-semibold">Guardian Email</TableHead>
                  <TableHead className="font-semibold">Registered at</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentStudents.map((student) => (
                  <TableRow key={student.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-gray-600">{student.usn}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{student.class}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {student.subjects.map((subject) => (
                          <Badge key={subject} variant="outline" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{student.phone}</TableCell>
                    <TableCell className="text-gray-600">{student.guardianEmail}</TableCell>
                    <TableCell className="text-gray-600">
                      {registeredAtMap[student.id] || "--"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          title="Edit student"
                          onClick={() => handleEdit(student)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(student.id)}
                          title="Delete student"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredStudents.length === 0 && (
              <div className="text-center py-8 text-gray-500">No students found matching the selected filters.</div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the student record from the system.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Edit Student Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Student</DialogTitle>
                <DialogDescription>Make changes to the student information below.</DialogDescription>
              </DialogHeader>
              {editFormData && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={editFormData.name}
                      onChange={(e) => handleEditChange("name", e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="usn" className="text-right">
                      USN
                    </Label>
                    <Input
                      id="usn"
                      value={editFormData.usn}
                      onChange={(e) => handleEditChange("usn", e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="class" className="text-right">
                      Class
                    </Label>
                    <Select value={editFormData.class} onValueChange={(value) => handleEditChange("class", value)}>
                      <SelectTrigger id="class" className="col-span-3">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classOptions.map((classOption) => (
                          <SelectItem key={classOption} value={classOption}>
                            {classOption}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">Subjects</Label>
                    <div className="col-span-3 space-y-2">
                      {subjectOptions.map((subject) => (
                        <div key={subject} className="flex items-center space-x-2">
                          <Checkbox
                            id={`subject-${subject}`}
                            checked={editFormData.subjects.includes(subject)}
                            onCheckedChange={() => handleSubjectToggle(subject)}
                          />
                          <Label htmlFor={`subject-${subject}`} className="font-normal">
                            {subject}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      value={editFormData.phone}
                      onChange={(e) => handleEditChange("phone", e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="guardianEmail" className="text-right">
                      Guardian Email
                    </Label>
                    <Input
                      id="guardianEmail"
                      type="email"
                      value={editFormData.guardianEmail}
                      onChange={(e) => handleEditChange("guardianEmail", e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveEdit}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  )
}