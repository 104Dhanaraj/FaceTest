//1.Music/face-attendance-system/src/app/admin/students/page.tsx
"use client"

import React, { useState, useRef, ChangeEvent, FormEvent } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandItem, CommandInput, CommandList, CommandEmpty } from "@/components/ui/command"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { ChevronDown, Camera, Upload, X, AlertCircle, Check } from 'lucide-react'
import { AppSidebar } from "@/components/admin/components/app-sidebar"
import { cn } from "@/lib/utils"

const classOptions = ["MCA-IA", "MCA-IB", "MCA-IIA", "MCA-IIB"]
const subjectOptions = ["Math", "DevOps","Major Project","MAD","IOT","Data-Science I","Data-Science II","DBMS","Computer Networks","Linux","Research Methodology","Minor Project","Techincal Seminar"]

export default function StudentRegistration() {
  type FormDataType = {
    name: string
    usn: string
    class: string
    subjects: string[]
    phone: string
    guardianEmail: string
    guardianPhone: string
  }
  const [formData, setFormData] = useState<FormDataType>({
    name: '',
    usn: '',
    class: '',
    subjects: [],
    phone: '',
    guardianEmail: '',
    guardianPhone: '',
  })
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [subjectsOpen, setSubjectsOpen] = useState<boolean>(false)
  const [classOpen, setClassOpen] = useState<boolean>(false)
  const [webcamActive, setWebcamActive] = useState<boolean>(false)
  const [webcamError, setWebcamError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [blurryImages, setBlurryImages] = useState<string[]>([])
  const [blurryImagesMessage, setBlurryImagesMessage] = useState<string | null>(null)

  // Webcam logic (no face-api.js)
  const startWebcam = async () => {
    setWebcamError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      if (videoRef.current) {
        (videoRef.current as HTMLVideoElement).srcObject = stream
        streamRef.current = stream
        setWebcamActive(true)
      }
    } catch {
      setWebcamError('Unable to access webcam')
    }
  }
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      streamRef.current = null
    }
    setWebcamActive(false)
  }
  const captureWebcam = async (): Promise<File> => {
    if (!videoRef.current) throw new Error('No video element')
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')
    ctx.drawImage(videoRef.current, 0, 0)
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Failed to capture image'))
        resolve(new File([blob], `webcam-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.95)
    })
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    const selectedFiles = Array.from(e.target.files).slice(0, 5 - images.length)
    for (const file of selectedFiles) {
      // Only basic validation (file type/size)
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed.')
        continue
      }
      setImages(prev => prev.length < 5 ? [...prev, file] : prev)
      setImagePreviews(prev => prev.length < 5 ? [...prev, URL.createObjectURL(file)] : prev)
    }
  }

  const handleCapture = async () => {
    if (images.length >= 5) {
      setError('Maximum 5 images allowed')
      return
    }
    try {
      const file = await captureWebcam()
      setImages(prev => [...prev, file])
      setImagePreviews(prev => [...prev, URL.createObjectURL(file)])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function removeImage(index: number) {
    setImages((imgs) => imgs.filter((_, i) => i !== index))
    setImagePreviews((previews) => previews.filter((_, i) => i !== index))
  }

  function handleInputChange(name: keyof FormDataType, value: string) {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  function toggleSubject(subject: string) {
    setFormData((prev) => {
      const subjects = prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject]
      return { ...prev, subjects }
    })
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setBlurryImages([])
    setBlurryImagesMessage(null)
    if (!formData.name || !formData.usn || !formData.class) {
      setError('Name, USN, and Class are required.')
      return
    }
    if (images.length < 1) {
      setError('Please upload or capture at least one image.')
      return
    }
    setLoading(true)
    try {
      // Prepare FormData for backend
      const form = new FormData()
      form.append('name', formData.name)
      form.append('usn', formData.usn)
      form.append('class_', formData.class)
      form.append('phone', formData.phone)
      form.append('guardianEmail', formData.guardianEmail)
      form.append('guardianPhone', formData.guardianPhone)
      formData.subjects.forEach((subject) => form.append('subjects', subject))
      images.forEach((img, idx) => form.append('files', img, img.name))

      const response = await fetch('http://localhost:8000/register', {
        method: 'POST',
        body: form,
      })
      const result = await response.json()
      // --- BEGIN BLURRY IMAGE HANDLING ---
      if (result && Array.isArray(result.warnings)) {
        // Find blurry image warnings
        const blurryFilenames: string[] = []
        const blurryPattern = /Image ([^ ]+) is too blurry/;
        result.warnings.forEach((w: string) => {
          const match = blurryPattern.exec(w)
          if (match && match[1]) {
            blurryFilenames.push(match[1])
          }
        })
        if (blurryFilenames.length > 0) {
          // Remove blurry images from state
          setImages((prev) => prev.filter((img) => !blurryFilenames.includes(img.name)))
          setImagePreviews((prev) => {
            // Map images to previews by index, so filter previews by images that remain
            const filtered: string[] = []
            images.forEach((img, idx) => {
              if (!blurryFilenames.includes(img.name)) {
                filtered.push(prev[idx])
              }
            })
            return filtered
          })
          setBlurryImages(blurryFilenames)
          setBlurryImagesMessage(
            `${blurryFilenames.length} image(s) were rejected and removed because they were too blurry: ${blurryFilenames.join(", ")}. Please add clear replacements.`
          )
        } else {
          setBlurryImages([])
          setBlurryImagesMessage(null)
        }
      }
      // --- END BLURRY IMAGE HANDLING ---
      if (result.status === 'success') {
        alert('Student registered!')
      setFormData({
        name: '',
        usn: '',
        class: '',
        subjects: [],
        phone: '',
        guardianEmail: '',
        guardianPhone: '',
      })
      setImages([])
      setImagePreviews([])
      setError(null)
        setBlurryImages([])
        setBlurryImagesMessage(null)
      } else {
        setError('Registration failed: ' + (result.message || 'Unknown error'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err) || 'An error occurred during submission.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/admin/dashboard">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Student Registration</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="p-6">
          <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Register New Student</h1>
                <p className="text-gray-600">Fill in the details to register a new student</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Basic student details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Enter student name"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="usn">USN *</Label>
                        <Input
                          id="usn"
                          type="text"
                          placeholder="Enter USN"
                          value={formData.usn}
                          onChange={(e) => handleInputChange("usn", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter phone number"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Academic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Academic Information</CardTitle>
                    <CardDescription>Class and subject details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Class *</Label>
                      <Popover open={classOpen} onOpenChange={setClassOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={classOpen}
                            className="w-full justify-between"
                          >
                            {formData.class || "Select class..."}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search class..." />
                            <CommandList>
                              <CommandEmpty>No class found.</CommandEmpty>
                              <CommandGroup>
                                {classOptions.map((option) => (
                                  <CommandItem
                                    key={option}
                                    value={option}
                                    onSelect={(currentValue) => {
                                      handleInputChange("class", currentValue === formData.class ? "" : currentValue)
                                      setClassOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={cn("mr-2 h-4 w-4", formData.class === option ? "opacity-100" : "opacity-0")}
                                    />
                                    {option}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Subjects *</Label>
                      <Popover open={subjectsOpen} onOpenChange={setSubjectsOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={subjectsOpen}
                            className="w-full justify-between min-h-10"
                          >
                            <div className="flex flex-wrap gap-1 flex-1 text-left">
                              {formData.subjects.length > 0 ? (
                                formData.subjects.map((subject) => (
                                  <Badge key={subject} variant="secondary" className="text-xs">
                                    {subject}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground">Select subjects...</span>
                              )}
                            </div>
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search subjects..." />
                            <CommandList>
                              <CommandEmpty>No subject found.</CommandEmpty>
                              <CommandGroup>
                                {subjectOptions.map((subject) => (
                                  <CommandItem
                                    key={subject}
                                    value={subject}
                                    onSelect={(currentValue) => {
                                      toggleSubject(currentValue)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.subjects.includes(subject) ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    {subject}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardContent>
                </Card>

                {/* Guardian Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Guardian Information</CardTitle>
                    <CardDescription>Guardian contact details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="guardianEmail">Guardian Email *</Label>
                        <Input
                          id="guardianEmail"
                          type="email"
                          placeholder="Enter guardian email"
                          value={formData.guardianEmail}
                          onChange={(e) => handleInputChange("guardianEmail", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="guardianPhone">Guardian Phone *</Label>
                        <Input
                          id="guardianPhone"
                          type="tel"
                          placeholder="Enter guardian phone"
                          value={formData.guardianPhone}
                          onChange={(e) => handleInputChange("guardianPhone", e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Image Upload & Webcam Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Student Images</CardTitle>
                    <CardDescription>
                      Upload up to 5 clear, close-up face images (minimum 1 required). 
                      Ensure good lighting, face is clearly visible, and avoid blurry images.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Webcam Capture */}
                    {/* <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Camera className="h-8 w-8 text-blue-500" />
                        <h3 className="font-medium text-blue-700">Webcam Capture</h3>
                        {webcamActive ? (
                          <>
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              width={320}
                              height={240}
                              className="rounded border mb-2"
                            />
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" onClick={handleCapture} disabled={images.length >= 5}>
                                Capture Image
                              </Button>
                              <Button type="button" variant="outline" onClick={stopWebcam}>
                                Stop Camera
                              </Button>
                            </div>
                          </>
                        ) : (
                          <Button type="button" variant="outline" onClick={startWebcam}>
                            Start Camera
                          </Button>
                        )}
                        {webcamError && <p className="text-xs text-red-500">{webcamError}</p>}
                        <p className="text-xs text-gray-600 mt-1">Face will be auto-cropped and checked for quality</p>
                        <p className="text-xs text-blue-600 mt-1">💡 Tip: Ensure good lighting and face is clearly visible</p>
                      </div>
                    </div> */}

                    {/* Image Previews */}
                    {imagePreviews.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-3">Selected Images ({images.length}/5)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative">
                              <img
                                src={preview || "/placeholder.svg"}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.preventDefault()
                                  removeImage(index)
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bulk Upload */}
                    <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        id="bulk-upload"
                        disabled={images.length >= 5}
                      />
                      <div className="text-center pointer-events-none">
                        <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Drop multiple images here or click to browse</p>
                        <p className="text-xs text-gray-500 mt-1">Maximum 5 images allowed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Error Messages */}
                {error && (
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-red-800 mb-2">Error:</h3>
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {/* Blurry Images Message */}
                {blurryImagesMessage && (
                  <Card className="border-yellow-200 bg-yellow-50 mt-4">
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-yellow-800 mb-2">Image Quality Warning</h3>
                          <p className="text-sm text-yellow-700">{blurryImagesMessage}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Submit Button */}
                <div className="flex justify-center">
                  <Button type="submit" size="lg" className="px-8" disabled={loading}>
                    {loading ? "Registering..." : "Register Student"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
