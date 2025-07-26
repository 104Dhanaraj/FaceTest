"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Users, BookOpen } from "lucide-react"
import { supabase } from "@/lib/supabase"

export function StatsCards() {
  const [studentsCount, setStudentsCount] = useState<number | null>(null)
  const [teachersCount, setTeachersCount] = useState<number | null>(null)
  const [coursesCount, setCoursesCount] = useState<number | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      const { count: studentCount } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })

      const { count: teacherCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "teacher")

      const { data: teachers } = await supabase
        .from("users")
        .select("subjects")
        .eq("role", "teacher")

      const allSubjects = teachers?.flatMap((t) => {
        if (typeof t.subjects === "string") {
          return t.subjects.split(",").map((s) => s.trim())
        } else if (Array.isArray(t.subjects)) {
          return t.subjects
        } else {
          return []
        }
      }) ?? []

      const uniqueSubjects = new Set(allSubjects)

      setStudentsCount(studentCount ?? 0)
      setTeachersCount(teacherCount ?? 0)
      setCoursesCount(uniqueSubjects.size)
    }

    fetchStats()
  }, [])

  const stats = [
    {
      title: "Total Students",
      value: studentsCount ?? "...",
      icon: GraduationCap,
    },
    {
      title: "Total Teachers",
      value: teachersCount ?? "...",
      icon: Users,
    },
    {
      title: "Total Courses assigned",
      value: coursesCount ?? "...",
      icon: BookOpen,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
