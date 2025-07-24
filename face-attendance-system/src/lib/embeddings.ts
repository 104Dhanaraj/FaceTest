// lib/embeddings.ts
import { supabase } from './supabase'

export async function insertEmbedding(usn: string, imageUrl: string, embedding: number[]) {
  const { error } = await supabase.from('face_embeddings').insert({
    usn,
    image_url: imageUrl,
    embedding,
    source: 'frontend',
    model: 'face-api'
  })

  if (error) throw error
}
