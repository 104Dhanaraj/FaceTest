"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import { Menu } from "lucide-react"
import { Slot } from "@radix-ui/react-slot"

interface SidebarContextType {
  isOpen: boolean
  setIsOpen: (value: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextType>({
  isOpen: false,
  setIsOpen: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false)
  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="flex h-screen">{children}</div>
    </SidebarContext.Provider>
  )
}

interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  collapsible?: "icon" | "full"
}

export function Sidebar({ 
  children,
  className,
  collapsible,
  ...props
}: SidebarProps) {
  const { isOpen } = React.useContext(SidebarContext)
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-20 h-full w-64 -translate-x-full border-r bg-background transition-transform lg:translate-x-0",
        isOpen && "translate-x-0",
        className
      )}
      {...props}
    >
      {children}
    </aside>
  )
}

export function SidebarHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex h-16 items-center border-b px-6">{children}</div>
}

export function SidebarContent({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 overflow-auto py-2">{children}</div>
}

export function SidebarGroup({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-2">{children}</div>
}

export function SidebarGroupLabel({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h4>
}

export function SidebarGroupContent({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1">{children}</div>
}

export function SidebarMenu({ children }: { children: React.ReactNode }) {
  return <nav className="space-y-1">{children}</nav>
}

export function SidebarMenuItem({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

interface SidebarMenuButtonProps extends React.HTMLAttributes<HTMLElement> {
  isActive?: boolean
  size?: "default" | "lg"
  asChild?: boolean
}

export function SidebarMenuButton({ 
  children,
  isActive,
  size = "default",
  asChild,
  className,
  ...props
}: SidebarMenuButtonProps) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground",
        size === "lg" && "text-base",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

export function SidebarRail() {
  return <div className="absolute inset-y-0 right-0 w-px bg-border" />
}

export function SidebarTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setIsOpen } = React.useContext(SidebarContext)
  return (
    <button
      className={cn("lg:hidden", className)}
      onClick={() => setIsOpen(true)}
      {...props}
    />
  )
}

export function SidebarInset({ children }: { children: React.ReactNode }) {
  return <main className="flex-1 h-full min-h-0 lg:ml-64">{children}</main>
} 