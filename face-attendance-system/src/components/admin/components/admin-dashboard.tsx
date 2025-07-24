"use client"

import { AppSidebar } from "./app-sidebar"
import { StatsCards } from "./stats-cards"
import { AttendanceTable } from "./attendance-table"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export default function AdminDashboard() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>Admin</BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <Separator />
          <StatsCards />
          <AttendanceTable />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
