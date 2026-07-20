import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";
import { 
  verifyPassword, 
  hashPassword, 
  checkLoginRateLimit, 
  recordFailedLoginAttempt, 
  resetLoginAttempts, 
  sanitizeInput 
} from "./security";

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

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid email or password");
        }

        // Sanitize credentials input
        const rawEmail = sanitizeInput(credentials.email);
        const rawPassword = credentials.password; // do not trim spaces out of password string
        const emailKey = rawEmail.toLowerCase().trim();

        // 1. Rate Limiting Check
        const rateCheck = checkLoginRateLimit(emailKey);
        if (!rateCheck.isAllowed) {
          const minutes = Math.ceil((rateCheck.retryAfterSeconds || 900) / 60);
          throw new Error(`Too many failed login attempts. Please try again in ${minutes} minutes.`);
        }

        // 2. Fetch User
        const dbUser = await db.user.findUnique({
          where: { email: emailKey },
        });

        // 3. User Existence & Lockout Guard (Generic Error to prevent account enumeration)
        if (!dbUser) {
          recordFailedLoginAttempt(emailKey);
          throw new Error("Invalid email or password");
        }

        if (dbUser.status === "PENDING") {
          throw new Error("Your account is pending approval by Company or IT Department.");
        }

        if (dbUser.isArchived) {
          throw new Error("Invalid email or password");
        }

        // 4. Password Verification & Auto-upgrade Hashing
        if (!dbUser.password) {
          recordFailedLoginAttempt(emailKey);
          throw new Error("Invalid email or password");
        }

        const { isValid, needsUpgrade } = await verifyPassword(rawPassword, dbUser.password);
        
        if (!isValid) {
          recordFailedLoginAttempt(emailKey);
          throw new Error("Invalid email or password");
        }

        // Upgrade legacy plaintext password to bcrypt hash on successful sign-in
        if (needsUpgrade) {
          try {
            const hashed = await hashPassword(rawPassword);
            await db.user.update({
              where: { id: dbUser.id },
              data: { password: hashed }
            });
          } catch (err) {
            console.error("Failed to auto-upgrade password hash:", err);
          }
        }

        // Reset rate-limiter on success
        resetLoginAttempts(emailKey);

        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          status: dbUser.status,
          companyId: dbUser.companyId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        const emailKey = sanitizeInput(user.email).toLowerCase().trim();

        // Check if user exists in database
        const existingUser = await db.user.findUnique({
          where: { email: emailKey },
        });

        if (!existingUser) {
          // User registration flow - create pending user
          const newUser = await db.user.create({
            data: {
              id: crypto.randomUUID(),
              email: emailKey,
              name: sanitizeInput(user.name || "Google User"),
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
              userId: newUser.id,
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
      if (user) {
        token.role = (user as any).role;
        token.companyId = (user as any).companyId;
        token.status = (user as any).status;
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).companyId = token.companyId;
        (session.user as any).status = token.status;
      }
      return session;
    },
  },
};
