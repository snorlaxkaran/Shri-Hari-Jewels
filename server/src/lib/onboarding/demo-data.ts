import { prisma } from "../db.js";
import { createProduct } from "../inventory/service.js";

/** Sample jewellery SKUs for new tenants exploring the system. */
export const seedDemoData = async (
  organizationId: string,
  actorUserId: string,
): Promise<void> => {
  const productCount = await prisma.product.count({ where: { organizationId } });
  if (productCount > 0) return;

  const branch = await prisma.branch.findFirst({
    where: { organizationId, active: true },
    orderBy: { createdAt: "asc" },
  });
  if (!branch) return;

  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!actor) return;

  const auditActor = {
    id: actor.id,
    name: actor.name,
  };

  await createProduct(
    {
      name: "Demo Gold Bangle · 22K",
      category: "Bangles",
      metal: "Gold",
      purity: "22K",
      weightGrams: 38.12,
      quantity: 1,
      price: 0,
      makingCharges: 17,
      images: [],
    },
    branch.id,
    auditActor,
  );

  await createProduct(
    {
      name: "Demo Silver Ring",
      category: "Rings",
      metal: "Silver",
      purity: "925",
      weightGrams: 4.5,
      quantity: 1,
      price: 0,
      makingCharges: 17,
      images: [],
    },
    branch.id,
    auditActor,
  );
};
