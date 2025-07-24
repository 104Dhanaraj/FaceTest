import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name, email, classes, subjects } = await request.json()
    const { id } = params

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Update user in the database
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        name,
        email,
        classes,
        subjects,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating teacher:', updateError.message)
      return NextResponse.json(
        { error: `Failed to update teacher: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Teacher updated successfully'
    })

  } catch (error) {
    console.error('Teacher update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Delete from users table first
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting teacher from DB:', deleteError.message)
      return NextResponse.json(
        { error: `Failed to delete teacher: ${deleteError.message}` },
        { status: 500 }
      )
    }

    // Delete the auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError.message)
      // Note: We don't return an error here since the DB record was deleted successfully
      // The auth user deletion failure is logged but doesn't affect the response
    }

    return NextResponse.json({
      success: true,
      message: 'Teacher deleted successfully'
    })

  } catch (error) {
    console.error('Teacher deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 