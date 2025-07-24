// src/app/admin/students/manage/layout.tsx
import type React from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/admin/components/app-sidebar"
import { ThemeProvider } from "@/components/theme-provider"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <SidebarProvider>
        <div className="flex min-h-screen">
          <div className="w-64 flex-shrink-0">
            <AppSidebar />
          </div>
          <main className="flex-1">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  )
}
