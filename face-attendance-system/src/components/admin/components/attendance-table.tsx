"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const attendanceData = [
  {
    studentName: "Alice Johnson",
    usn: "1MS21CS001",
    class: "CSE-A",
    attendance: 78,
  },
  {
    studentName: "Bob Smith",
    usn: "1MS21CS002",
    class: "CSE-A",
    attendance: 82,
  },
  {
    studentName: "Carol Davis",
    usn: "1MS21EC015",
    class: "ECE-B",
    attendance: 75,
  },
  {
    studentName: "David Wilson",
    usn: "1MS21ME032",
    class: "ME-C",
    attendance: 80,
  },
  {
    studentName: "Eva Brown",
    usn: "1MS21CS045",
    class: "CSE-B",
    attendance: 72,
  },
]

export function AttendanceTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Low Attendance Warnings</CardTitle>
        <CardDescription>Students with attendance below 85% threshold</CardDescription>
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
            {attendanceData.map((student) => (
              <TableRow key={student.usn} className={student.attendance < 85 ? "bg-red-50 hover:bg-red-100" : ""}>
                <TableCell className="font-medium">{student.studentName}</TableCell>
                <TableCell>{student.usn}</TableCell>
                <TableCell>{student.class}</TableCell>
                <TableCell>
                  <Badge variant={student.attendance < 85 ? "destructive" : "secondary"}>{student.attendance}%</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
 