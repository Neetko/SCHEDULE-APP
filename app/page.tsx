"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { signIn, useSession } from "next-auth/react"
import { Loader2, LogIn } from "lucide-react"
import { useEffect, useState } from "react"

export default function LoginPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isSigningIn, setIsSigningIn] = useState(false)

  // If already authenticated, redirect to admin page
  useEffect(() => {
    if (session) {
      router.push("/admin")
    }
  }, [session, router])

  const handleGuestLogin = () => {
    router.push("/guest")
  }

  const handleDiscordLogin = async () => {
    setIsSigningIn(true)
    try {
      await signIn("discord", { callbackUrl: "/admin" })
    } catch (error) {
      console.error("Sign in error:", error)
      setIsSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/background-collage.jpg"
          alt="Background collage"
          fill
          className="object-cover opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Login Card */}
      <Card className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-sm border-2">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">Welcome to Nikov Plan</CardTitle>
          <p className="text-gray-600 mt-2">Choose how you'd like to continue</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" ? (
            <Button disabled className="w-full h-12 text-lg bg-indigo-600 text-white" size="lg">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </Button>
          ) : (
            <Button
              onClick={handleDiscordLogin}
              disabled={isSigningIn}
              className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-3 transition-all duration-200"
              size="lg"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting to Discord...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  Admin Login with Discord
                </>
              )}
            </Button>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          <Button
            onClick={handleGuestLogin}
            className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
            size="lg"
          >
            <LogIn className="h-5 w-5" />
            Continue as Guest
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
