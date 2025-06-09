import type { NextAuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import { supabase, isSupabaseConfigured } from "./supabase"

// Define the scopes we need from Discord
const scopes = ["identify", "email"].join(" ")

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: scopes } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the Discord access token and user ID to the token
      if (account && profile) {
        token.accessToken = account.access_token
        //token.id = profile.uid
        token.username = (profile as any).username
        token.discriminator = (profile as any).discriminator
        token.avatar = (profile as any).avatar
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token.id) {
        session.user.id = token.id as string
        session.user.accessToken = token.accessToken as string
        session.user.username = token.username as string
        session.user.discriminator = token.discriminator as string
        session.user.avatar = token.avatar as string

        // Store or update user in Supabase only if configured
        if (isSupabaseConfigured && session.user.email) {
          try {
            // Check if the user already exists
            const { data: existingUsers, error: fetchError } = await supabase
              .from("users")
              .select("id")
              .eq("id", session.user.id)

            if (fetchError) {
              console.error("Error fetching user from Supabase:", fetchError)
            }

            if (!existingUsers || existingUsers.length === 0) {
              // Check if this is the first user to mark as admin
              const { data: allUsers, error: countError } = await supabase
                .from("users")
                .select("id")

              const isAdmin = !countError && allUsers && allUsers.length === 0

              const { error } = await supabase.from("users").insert({
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                username: session.user.username,
                discriminator: session.user.discriminator,
                avatar: session.user.avatar,
                image: session.user.image,
                last_login: new Date().toISOString(),
                role: isAdmin ? "admin" : "user",
              })

              if (error) {
                console.error("Error creating user in Supabase:", error)
              } else {
                console.log("User successfully created in Supabase:", session.user)
              }
            } else {
              // Update last login for existing user
              const { error } = await supabase
                .from("users")
                .update({ last_login: new Date().toISOString() })
                .eq("id", session.user.id)

              if (error) {
                console.error("Error updating user in Supabase:", error)
              }
            }
          } catch (error) {
            console.error("Failed to store or update user in Supabase:", error)
          }
        }
      }

      return session
    },
    async redirect({ url, baseUrl }) {
      // Redirect to admin page after login
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/admin`
    },
  },
  pages: {
    signIn: "/",
    signOut: "/",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      accessToken: string
      username: string
      discriminator: string
      avatar: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    accessToken?: string
    username?: string
    discriminator?: string
    avatar?: string
  }
}
