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
        // Use account.providerAccountId for Discord user ID (always present)
        token.id = account.providerAccountId
        token.username = (profile as any).username
        token.discriminator = (profile as any).discriminator
        token.avatar = (profile as any).avatar
      }
      return token
    },
    async signIn({ user, account, profile }) {
      // Only allow your own Discord ID to log in
      const allowedDiscordId = process.env.ADMIN_DISCORD_ID || "YOUR_DISCORD_USER_ID";
      const discordId = account?.providerAccountId;
      if (discordId === allowedDiscordId) {
        return true; // allow sign-in
      } else {
        return false; // deny sign-in
      }
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
            const { error } = await supabase.from("users").upsert(
              {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                username: session.user.username,
                discriminator: session.user.discriminator,
                avatar: session.user.avatar,
                image: session.user.image,
                last_login: new Date().toISOString(),
              },
              {
                onConflict: "id",
              },
            )

            if (error) {
              console.error("Error storing user in Supabase:", error)
            }
          } catch (error) {
            console.error("Failed to store user in Supabase:", error)
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
