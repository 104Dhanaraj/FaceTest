// src/app/teacher-management.tsx
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Edit, Plus, Trash2, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { AppSidebar } from "@/components/admin/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

interface Teacher {
  id: string
  name: string
  email: string
  password: string
  classes: string[]
  subjects: string[]
}

const classOptions = ["MCA-IA","MCA-IB", "MCA-IIA", "MCA-IIB"]
const subjectOptions = ["Math", "Physics", "Chemistry", "Computer Science", "English"]



function TeacherManagementContent() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null)


  useEffect(() => {
    const fetchTeachers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, classes, subjects")
        .eq("role", "teacher")
  
      if (error) {
        console.error("Error fetching teachers:", error.message)
        return
      }
  
      setTeachers(data as Teacher[])
    }
  
    fetchTeachers()
  }, [])
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    classes: [] as string[],
    subjects: [] as string[],
  })

  // Popover states
  const [classPopoverOpen, setClassPopoverOpen] = useState(false)
  const [subjectPopoverOpen, setSubjectPopoverOpen] = useState(false)
  const [editClassPopoverOpen, setEditClassPopoverOpen] = useState(false)
  const [editSubjectPopoverOpen, setEditSubjectPopoverOpen] = useState(false)

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
  
    const { name, email, password, classes, subjects } = formData
  
    try {
      const response = await fetch('/api/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          classes,
          subjects,
        }),
      })
  
      const data = await response.json()
  
      if (response.ok) {
        // Refresh teacher list
        const refreshResponse = await fetch('/api/teachers')
        const refreshData = await refreshResponse.json()
        
        if (refreshResponse.ok) {
          setTeachers(refreshData.teachers || [])
        }
  
        // Reset form
        setFormData({
          name: "",
          email: "",
          password: "",
          classes: [],
          subjects: [],
        })
      } else {
        console.error("Error creating teacher:", data.error)
      }
    } catch (error) {
      console.error("Error creating teacher:", error)
    }
  }
  
  

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    setIsEditModalOpen(true)
  }

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
  
    const { id, name, email, classes, subjects } = editingTeacher!
  
    try {
      const response = await fetch(`/api/teachers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          classes,
          subjects,
        }),
      })
  
      const data = await response.json()
  
      if (response.ok) {
        // Refresh teacher list
        const refreshResponse = await fetch('/api/teachers')
        const refreshData = await refreshResponse.json()
        
        if (refreshResponse.ok) {
          setTeachers(refreshData.teachers || [])
        }
        
        setIsEditModalOpen(false)
      } else {
        console.error("Error updating teacher:", data.error)
      }
    } catch (error) {
      console.error("Error updating teacher:", error)
    }
  }
  

  const handleDeleteTeacher = (id: string) => {
    setDeletingTeacherId(id)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingTeacherId) return
    
    try {
      const response = await fetch(`/api/teachers/${deletingTeacherId}`, {
        method: 'DELETE',
      })
  
      const data = await response.json()
  
      if (response.ok) {
        // Refresh teacher list
        const refreshResponse = await fetch('/api/teachers')
        const refreshData = await refreshResponse.json()
        
        if (refreshResponse.ok) {
          setTeachers(refreshData.teachers || [])
        }
        
        setIsDeleteModalOpen(false)
      } else {
        console.error("Error deleting teacher:", data.error)
      }
    } catch (error) {
      console.error("Error deleting teacher:", error)
    }
  }
  

  const toggleSelection = (value: string, currentSelection: string[], setter: (selection: string[]) => void) => {
    if (currentSelection.includes(value)) {
      setter(currentSelection.filter((item) => item !== value))
    } else {
      setter([...currentSelection, value])
    }
  }

  const MultiSelectDropdown = ({
    options,
    selected,
    onSelectionChange,
    placeholder,
    popoverOpen,
    setPopoverOpen,
  }: {
    options: string[]
    selected: string[]
    onSelectionChange: (selection: string[]) => void
    placeholder: string
    popoverOpen: boolean
    setPopoverOpen: (open: boolean) => void
  }) => (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={popoverOpen} className="w-full justify-between">
          {selected.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selected.map((item) => (
                <Badge key={item} variant="secondary" className="text-xs">
                  {item}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSelection(item, selected, onSelectionChange)
                    }}
                  />
                </Badge>
              ))}
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => toggleSelection(option, selected, onSelectionChange)}
                >
                  <Check className={`mr-2 h-4 w-4 ${selected.includes(option) ? "opacity-100" : "opacity-0"}`} />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Management</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Teacher Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Teacher Management</h1>
          </div>

          {/* Add New Teacher Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Teacher
              </CardTitle>
              <CardDescription>Create a new teacher account with class and subject assignments.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTeacher} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter teacher's full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter temporary password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>

               

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Classes</Label>
                    <MultiSelectDropdown
                      options={classOptions}
                      selected={formData.classes}
                      onSelectionChange={(classes) => setFormData({ ...formData, classes })}
                      placeholder="Select classes"
                      popoverOpen={classPopoverOpen}
                      setPopoverOpen={setClassPopoverOpen}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subjects</Label>
                    <MultiSelectDropdown
                      options={subjectOptions}
                      selected={formData.subjects}
                      onSelectionChange={(subjects) => setFormData({ ...formData, subjects })}
                      placeholder="Select subjects"
                      popoverOpen={subjectPopoverOpen}
                      setPopoverOpen={setSubjectPopoverOpen}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full md:w-auto">
                  Create Teacher
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing Teachers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Teachers</CardTitle>
              <CardDescription>Manage existing teacher accounts, classes, and subject assignments.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Classes</TableHead>
                      <TableHead>Subjects</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers?.filter(teacher => teacher && teacher.id && teacher.name)?.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">{teacher.name}</TableCell>
                        <TableCell>{teacher.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(teacher.classes || []).map((cls) => (
                              <Badge key={cls} variant="outline">
                                {cls}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(teacher.subjects || []).map((subject) => (
                              <Badge key={subject} variant="secondary">
                                {subject}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditTeacher(teacher)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteTeacher(teacher.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!teachers || teachers.filter(teacher => teacher && teacher.id && teacher.name).length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No teachers found. Create your first teacher using the form above.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Edit Teacher Modal */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit Teacher</DialogTitle>
                <DialogDescription>Update teacher information, classes, and subject assignments.</DialogDescription>
              </DialogHeader>
              {editingTeacher && (
                <form onSubmit={handleUpdateTeacher} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Name</Label>
                      <Input
                        id="edit-name"
                        type="text"
                        value={editingTeacher.name}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editingTeacher.email}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Classes</Label>
                      <MultiSelectDropdown
                        options={classOptions}
                        selected={editingTeacher.classes}
                        onSelectionChange={(classes) => setEditingTeacher({ ...editingTeacher, classes })}
                        placeholder="Select classes"
                        popoverOpen={editClassPopoverOpen}
                        setPopoverOpen={setEditClassPopoverOpen}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subjects</Label>
                      <MultiSelectDropdown
                        options={subjectOptions}
                        selected={editingTeacher.subjects}
                        onSelectionChange={(subjects) => setEditingTeacher({ ...editingTeacher, subjects })}
                        placeholder="Select subjects"
                        popoverOpen={editSubjectPopoverOpen}
                        setPopoverOpen={setEditSubjectPopoverOpen}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Update Teacher</Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Modal */}
          <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this teacher? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmDelete}>
                  Delete Teacher
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  )
}

export default function TeacherManagement() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TeacherManagementContent />
      </SidebarInset>
    </SidebarProvider>
  )
}
