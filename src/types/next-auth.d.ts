import { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "SUPER_ADMIN" | "COMPANY_OWNER" | "TEAM_LEAD" | "SALES_ASSOCIATE" | "IT_DEPARTMENT";
      status: "PENDING" | "APPROVED" | "BLOCKED" | "REJECTED";
      companyId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "SUPER_ADMIN" | "COMPANY_OWNER" | "TEAM_LEAD" | "SALES_ASSOCIATE" | "IT_DEPARTMENT";
    status: "PENDING" | "APPROVED" | "BLOCKED" | "REJECTED";
    companyId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "SUPER_ADMIN" | "COMPANY_OWNER" | "TEAM_LEAD" | "SALES_ASSOCIATE" | "IT_DEPARTMENT";
    status: "PENDING" | "APPROVED" | "BLOCKED" | "REJECTED";
    companyId?: string | null;
  }
}
