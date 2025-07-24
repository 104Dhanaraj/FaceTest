'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"


import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("teacher")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
  
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
  
    if (authError || !authData.user) {
      setError(authError?.message || "Login failed")
      setLoading(false)
      return
    }
  
    // ✅ Get role from 'users' table using the user's auth ID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", authData.user.id)
      .single()
  
    if (userError || !userData) {
      setError("User role not found")
      setLoading(false)
      return
    }
  
    // ✅ Redirect based on real role from DB (not from UI input)
    if (userData.role === "admin") {
      router.push("/admin/dashboard")
    } else if (userData.role === "teacher") {
      router.push("/teacher/dashboard")
    } else {
      setError("Unauthorized role")
    }
  
    setLoading(false)
  }
  

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
        </CardHeader>

        <CardContent className="space-y-6">
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {/* <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex space-x-6">
                <label className="flex items-center space-x-2">
                  <input type="radio" value="admin" checked={role === "admin"} onChange={() => setRole("admin")} />
                  <span>Admin</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="radio" value="teacher" checked={role === "teacher"} onChange={() => setRole("teacher")} />
                  <span>Teacher</span>
                </label>
              </div>
            </div> */}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
