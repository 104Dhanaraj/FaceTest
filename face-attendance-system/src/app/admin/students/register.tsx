"use client"

import React, { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandItem } from "@/components/ui/command"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { ChevronRight } from 'lucide-react'

const MODEL_URL = '/models' // ❌ don't prefix with /public

const initialFormData = {
  name: '',
  usn: '',
  class: '',
  subjects: [] as string[],
  phone: '',
  guardianEmail: '',
  guardianPhone: '',
}

export default function StudentRegistration() {
  const [formData, setFormData] = useState(initialFormData)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subjectsOpen, setSubjectsOpen] = useState(false)

  // Remove useEffect that loads face-api.js models
  // Remove getEmbedding and any face-api.js usage
  // All face embedding is now handled by the backend via /register endpoint

  // Handle image file selection
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    const selectedFiles = Array.from(e.target.files).slice(0, 5)
    setImages(selectedFiles)
    setImagePreviews(selectedFiles.map((file) => URL.createObjectURL(file)))
  }

  // Remove image by index
  function removeImage(index: number) {
    setImages((imgs) => imgs.filter((_, i) => i !== index))
    setImagePreviews((previews) => previews.filter((_, i) => i !== index))
  }

  // Handle form input changes
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Toggle subject selection
  function toggleSubject(subject: string) {
    setFormData((prev) => {
      const subjects = prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject]
      return { ...prev, subjects }
    })
  }

  // Main submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Basic validation
    if (!formData.name || !formData.usn || !formData.class) {
      setError('Name, USN, and Class are required.')
      return
    }
    if (images.length < 1) {
      setError('Please upload at least one image.')
      return
    }

    setLoading(true)

    try {
      // 1. Extract embeddings first to validate images
      // All face embedding is now handled by the backend via /register endpoint

      // 2. Upload images to Supabase Storage after validation
      const uploadedImageUrls: string[] = []
      for (const image of images) {
        const fileExt = image.name.split('.').pop()
        const uniqueName = `${uuidv4()}.${fileExt}`
        const filePath = `students/${formData.usn}/${uniqueName}`

        const { error: uploadError } = await supabase.storage
          .from('student-images')
          .upload(filePath, image, { upsert: true })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('student-images')
          .getPublicUrl(filePath)
  
        if (!urlData) throw new Error('Failed to get public URL')

        uploadedImageUrls.push(urlData.publicUrl)
      }
  
      // 3. Insert student record with image URLs
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert([{ ...formData, image_urls: uploadedImageUrls }])
        .select()
        .single()

      if (studentError) throw studentError

      // 4. Insert embeddings into face_embeddings table
      // All face embedding is now handled by the backend via /register endpoint

      // Reset form on success
      setFormData(initialFormData)
      alert('Student registered successfully!')
      setImages([])
      setImagePreviews([])
      setError(null)
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
          <Breadcrumb>
            <BreadcrumbList>
          <BreadcrumbItem>Home</BreadcrumbItem>
          <BreadcrumbItem>Admin</BreadcrumbItem>
          <BreadcrumbItem>Student Registration</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
      <Separator className="my-4" />

      <Card>
              <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
              name="name"
                          value={formData.name}
              onChange={handleInputChange}
              required
                        />
                      </div>

          <div>
            <Label htmlFor="usn">USN</Label>
                        <Input
                          id="usn"
              name="usn"
                          value={formData.usn}
              onChange={handleInputChange}
              required
                        />
                      </div>

          <div>
            <Label htmlFor="class">Class</Label>
                      <Input
              id="class"
              name="class"
              value={formData.class}
              onChange={handleInputChange}
              required
                      />
                    </div>

          <div>
            <Label>Subjects</Label>
                      <Popover open={subjectsOpen} onOpenChange={setSubjectsOpen}>
                        <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                              {formData.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {formData.subjects.map((subject) => (
                        <Badge key={subject} variant="secondary">
                                    {subject}
                                  </Badge>
                      ))}
                    </div>
                              ) : (
                    <span>Select subjects</span>
                              )}
                  <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                          <Command>
                              <CommandGroup>
                    {['Math', 'Physics', 'Chemistry', 'Biology', 'English'].map(
                      (subject) => (
                                  <CommandItem
                                    key={subject}
                          onSelect={() => {
                            toggleSubject(subject)
                            setSubjectsOpen(false)
                          }}
                        >
                                    {subject}
                                  </CommandItem>
                      )
                    )}
                              </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <Label htmlFor="guardianEmail">Guardian Email</Label>
                      <Input
                        id="guardianEmail"
              name="guardianEmail"
                        type="email"
                        value={formData.guardianEmail}
              onChange={handleInputChange}
                      />
                    </div>

          <div>
            <Label htmlFor="guardianPhone">Guardian Phone</Label>
                      <Input
                        id="guardianPhone"
              name="guardianPhone"
                        type="tel"
                        value={formData.guardianPhone}
              onChange={handleInputChange}
            />
                  </div>

                    <div>
            <Label>Upload Images (1 to 5)</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              disabled={loading}
            />
            <div className="flex gap-2 mt-2">
              {imagePreviews.map((src, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={src}
                    alt={`preview-${idx}`}
                    className="w-24 h-24 object-cover rounded"
                  />
                  <button
                              type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center"
                    aria-label="Remove image"
                  >
                    &times;
                  </button>
                          </div>
                        ))}
                      </div>
                    </div>

          {error && <p className="text-red-600">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Register Student'}
                </Button>
            </form>
      </Card>
          </div>
  )
}
