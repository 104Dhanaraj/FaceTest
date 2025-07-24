// lib/upload.ts
import { supabase } from './supabase'

export async function uploadImage(file: File, usn: string, index: number) {
  const filePath = `students/${usn}/${Date.now()}-${index}.jpg`
  const { error } = await supabase.storage.from('student-faces').upload(filePath, file)

  if (error) throw error

  return supabase.storage.from('student-faces').getPublicUrl(filePath).data.publicUrl
}
