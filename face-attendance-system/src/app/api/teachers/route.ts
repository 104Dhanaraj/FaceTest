import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This is the service role key, not the anon key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, classes, subjects } = await request.json()

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Step 1: Create auth user with admin privileges
    const { data: authResult, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        name,
        role: 'teacher'
      }
    })

    if (authError) {
      console.error('Auth creation failed:', authError.message)
      return NextResponse.json(
        { error: `Failed to create user: ${authError.message}` },
        { status: 400 }
      )
    }

    const newUserId = authResult.user?.id
    if (!newUserId) {
      return NextResponse.json(
        { error: 'No user ID returned from auth creation' },
        { status: 500 }
      )
    }

    // Step 2: Insert into users table
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: newUserId,
          name,
          email,
          role: 'teacher',
          classes,
          subjects,
        }
      ])

    if (insertError) {
      console.error('DB insert failed:', insertError.message)
      // Clean up: delete the auth user if DB insert fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      return NextResponse.json(
        { error: `Failed to save user data: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUserId,
        name,
        email,
        role: 'teacher',
        classes,
        subjects
      }
    })

  } catch (error) {
    console.error('Teacher creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, classes, subjects')
      .eq('role', 'teacher')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching teachers:', error.message)
      return NextResponse.json(
        { error: 'Failed to fetch teachers' },
        { status: 500 }
      )
    }

    return NextResponse.json({ teachers: data })
  } catch (error) {
    console.error('Error fetching teachers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 