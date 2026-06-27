import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock_id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock_secret",
    }),
    CredentialsProvider({
      id: "developer-login",
      name: "Developer Bypass",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (process.env.ALLOW_DEV_LOGIN !== "true") {
          return null;
        }

        if (!credentials?.email) return null;

        const dbUser = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (dbUser) {
          if (dbUser.status === "PENDING") {
            throw new Error("Your account is pending approval by Company or IT Department.");
          }
          // Centralized password verification:
          // If the user has a password in the database, verify it.
          if (dbUser.password && credentials.password !== dbUser.password) {
            return null;
          }

          return {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role,
            status: dbUser.status,
            companyId: dbUser.companyId,
          };
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        // Check if user exists in database
        const existingUser = await db.user.findUnique({
          where: { email: user.email },
        });

        if (!existingUser) {
          // User registration flow - create pending user
          const newUser = await db.user.create({
            data: {
              id: crypto.randomUUID(),
              email: user.email,
              name: user.name || "Google User",
              image: user.image,
              role: "SALES_ASSOCIATE",
              status: "PENDING",
              updatedAt: new Date(),
            },
          });

          // Create notification for Super Admin, Team Lead, and IT Department
          await db.notification.create({
            data: {
              id: crypto.randomUUID(),
              userId: newUser.id, // Notification target (or system-wide notification model)
              title: "New User Registration Awaiting Approval",
              message: `${newUser.name} (${newUser.email}) has signed in with Google and is pending approval.`,
              type: "Company Request",
              isRead: false,
            },
          });

          return false; // Block initial login
        } else if (existingUser.status === "PENDING") {
          return false; // Block subsequent login attempts
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // Handle updates if session is updated manually
      if (trigger === "update" && session?.user) {
        token.role = session.user.role;
        token.status = session.user.status;
        token.companyId = session.user.companyId;
        token.name = session.user.name;
      }

      // Initial login
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.companyId = user.companyId;
      } else if (token.email) {
        // Fetch fresh status and role from DB on subsequent requests
        const dbUser = await db.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, status: true, companyId: true, name: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.companyId = dbUser.companyId;
          token.name = dbUser.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.companyId = token.companyId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
