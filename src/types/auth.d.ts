import { DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "MITRA" | "PEMBELI" | "ADMIN";
      status: "ACTIVE" | "SUSPENDED" | "CLOSED";
      phone?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "MITRA" | "PEMBELI" | "ADMIN";
    status: "ACTIVE" | "SUSPENDED" | "CLOSED";
    phone?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "MITRA" | "PEMBELI" | "ADMIN";
    status: "ACTIVE" | "SUSPENDED" | "CLOSED";
    phone?: string | null;
  }
}
