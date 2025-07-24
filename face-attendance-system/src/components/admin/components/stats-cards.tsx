import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Users, BookOpen } from "lucide-react"

const stats = [
  {
    title: "Total Students",
    value: "1,247",
    icon: GraduationCap,
    change: "+12% from last month",
    changeType: "positive" as const,
  },
  {
    title: "Total Teachers",
    value: "89",
    icon: Users,
    change: "+3% from last month",
    changeType: "positive" as const,
  },
  {
    title: "Total Courses",
    value: "156",
    icon: BookOpen,
    change: "+8% from last month",
    changeType: "positive" as const,
  },
]

export function StatsCards() {
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
            <p className="text-xs text-muted-foreground">{stat.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
