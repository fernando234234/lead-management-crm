import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const now = new Date().toISOString();
          console.log(`[AUTH ${now}] Attempting login for username: ${credentials?.username}`);

          if (!credentials?.username || !credentials?.password) {
            console.log(`[AUTH ${now}] ❌ Missing credentials`);
            return null;
          }

          // Find user by username
          const user = await prisma.user.findUnique({
            where: { username: credentials.username },
            select: {
              id: true,
              username: true,
              email: true,
              password: true,
              name: true,
              role: true,
              mustChangePassword: true,
            },
          });

          if (!user) {
            console.log(`[AUTH ${now}] ❌ User not found in database`);
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            console.log(`[AUTH ${now}] ❌ Invalid password`);
            return null;
          }

          console.log(`[AUTH ${now}] ✅ Login successful for ${user.username} (${user.role})${user.mustChangePassword ? ' [MUST CHANGE PASSWORD]' : ''}`);
          
          return {
            id: user.id,
            email: user.email || user.username, // NextAuth requires email, use username as fallback
            name: user.name,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
          };
        } catch (error) {
          console.error("[AUTH] Error during authorization:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
      }
      
      // Allow updating the token when password is changed
      if (trigger === "update") {
        // Refresh user data from database
        const freshUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { mustChangePassword: true },
        });
        if (freshUser) {
          token.mustChangePassword = freshUser.mustChangePassword;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
