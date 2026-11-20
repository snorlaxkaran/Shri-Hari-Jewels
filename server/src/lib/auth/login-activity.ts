import { prisma } from "../db.js";
import { writeAuditLog } from "../audit/service.js";

/** Updates last-login timestamp and appends an audit row (shown in ERP activity). */
export const recordSuccessfulLogin = async (user: {
  id: string;
  email: string;
  name: string;
  organizationId: string | null;
}): Promise<void> => {
  const at = new Date();
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: at },
  });
  await writeAuditLog({
    organizationId: user.organizationId ?? undefined,
    entityType: "User",
    entityId: user.id,
    action: "LOGIN",
    after: { email: user.email, at: at.toISOString() },
    actor: { id: user.id, name: user.name },
  });
};