"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration. Please contact the administrator."
      case "AccessDenied":
        return "Access denied. You do not have permission to sign in."
      case "Verification":
        return "The verification token has expired or has already been used."
      case "OAuthSignin":
        return "Error in constructing an authorization URL."
      case "OAuthCallback":
        return "Error in handling the response from Discord."
      case "OAuthCreateAccount":
        return "Could not create Discord account in the database."
      case "EmailCreateAccount":
        return "Could not create account with the provided email."
      case "Callback":
        return "Error in the OAuth callback handler route."
      case "OAuthAccountNotLinked":
        return "The Discord account is not linked to any existing account."
      case "EmailSignin":
        return "Sending the e-mail with the verification token failed."
      case "CredentialsSignin":
        return "The authorize callback returned null in the Credentials provider."
      case "SessionRequired":
        return "The content of this page requires you to be signed in at all times."
      default:
        return "An unexpected error occurred during authentication. Please try again."
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">Authentication Error</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">{getErrorMessage(error)}</p>
          {error && <p className="text-sm text-gray-500 bg-gray-100 p-2 rounded">Error code: {error}</p>}
          <div className="space-y-2">
            <Link href="/">
              <Button className="w-full">Try Again</Button>
            </Link>
            <Link href="/guest">
              <Button variant="outline" className="w-full">
                Continue as Guest
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorContent />
    </Suspense>
  )
}
