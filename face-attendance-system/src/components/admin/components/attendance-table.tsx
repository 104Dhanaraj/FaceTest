//face-attendance-system/src/admin/components/attendance-table.tsx
"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function AttendanceTable() {
  const [students, setStudents] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.rpc("get_low_attendance_students", { threshold: 85 })
      if (error) {
        console.error("Fetch error:", error)
      } else {
        setStudents(data)
      }
    }

    fetchData()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Low Attendance Warnings</CardTitle>
        <CardDescription>Students with attendance below 85%</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>USN</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Attendance %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.usn}>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell>{student.usn}</TableCell>
                <TableCell>{student.class}</TableCell>
                <TableCell>
                  <Badge variant="destructive">{student.attendance_percent.toFixed(1)}%</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
