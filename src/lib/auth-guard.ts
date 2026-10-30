import { auth } from "./auth";
import db from "@/db";
import { partnerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export class UnauthorizedError extends Error {
  constructor(message = "Anda harus login untuk mengakses fitur ini.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Anda tidak memiliki izin untuk melakukan aksi ini.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return session.user;
}

export async function requireRole(allowedRoles: ("MITRA" | "PEMBELI" | "ADMIN")[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `Peran '${user.role}' tidak berwenang. Diperlukan peran: ${allowedRoles.join(", ")}`
    );
  }
  return user;
}

export async function requireAdmin() {
  return requireRole(["ADMIN"]);
}

export async function requireVerifiedPartner() {
  const user = await requireRole(["MITRA"]);
  const profile = await db.query.partnerProfiles.findFirst({
    where: eq(partnerProfiles.userId, user.id),
  });

  if (!profile || profile.verificationStatus !== "VERIFIED") {
    throw new ForbiddenError(
      "Identitas mitra belum diverifikasi. Hanya mitra terverifikasi yang dapat mengajukan pakaian."
    );
  }

  return { user, profile };
}
