import { prisma } from "../db.js";
import {
  JEWELLERY_MODULES,
  type JewelleryModuleId,
  normalizeModules,
} from "./config.js";
import { seedDemoData } from "./demo-data.js";

export type SetupProfileInput = {
  implementingFor?: string;
  teamSize?: string;
  businessType?: string;
  currentSystem?: string;
  enabledModules?: string[];
  businessName?: string;
  gstNumber?: string;
  loadDemoData?: boolean;
};

export type ModuleStepStatus = Record<string, boolean>;

export type OnboardingStatusPayload = {
  completed: boolean;
  account: {
    email: string;
    name: string;
    credentialsConfigured: boolean;
  };
  profile: {
    implementingFor: string | null;
    teamSize: string | null;
    businessType: string | null;
    currentSystem: string | null;
    enabledModules: JewelleryModuleId[];
    loadDemoData: boolean;
  };
  steps: {
    credentialsConfigured: boolean;
    businessInfo: boolean;
    gstConfigured: boolean;
    branchCreated: boolean;
    openingStock: boolean;
    personaComplete: boolean;
  };
  modules: Record<
    JewelleryModuleId,
    {
      title: string;
      complete: boolean;
      dismissed: boolean;
      steps: ModuleStepStatus;
    }
  >;
};

const DEFAULT_BUSINESS_NAME = "Jewellery Business";

const computeModuleSteps = async (
  organizationId: string,
  moduleId: JewelleryModuleId,
): Promise<ModuleStepStatus> => {
  const [
    settings,
    branchCount,
    productCount,
    unitCount,
    designCount,
    motifCount,
    workOrderCount,
    productionRunCount,
    karigarCount,
    customerCount,
    saleCount,
    invoiceCount,
    storefront,
    publishedCount,
    webOrderCount,
    transferCount,
  ] = await Promise.all([
    prisma.shopSettings.findUnique({
      where: { organizationId },
      select: { businessName: true, gstNumber: true },
    }),
    prisma.branch.count({ where: { organizationId, active: true } }),
    prisma.product.count({ where: { organizationId } }),
    prisma.inventoryUnit.count({ where: { organizationId } }),
    prisma.design.count({ where: { organizationId } }),
    prisma.motif.count({ where: { branch: { organizationId } } }),
    prisma.workOrder.count({ where: { branch: { organizationId } } }),
    prisma.productionRun.count({ where: { organizationId } }),
    prisma.karigarSettlement.count({ where: { organizationId } }),
    prisma.customer.count({ where: { organizationId } }),
    prisma.sale.count({ where: { branch: { organizationId } } }),
    prisma.invoice.count({ where: { branch: { organizationId } } }),
    prisma.storefrontSettings.findUnique({
      where: { organizationId },
      select: { enabled: true },
    }),
    prisma.product.count({ where: { organizationId, publishedToStorefront: true } }),
    prisma.webOrder.count({ where: { organizationId } }),
    prisma.stockTransfer.count({
      where: { fromBranch: { organizationId } },
    }),
  ]);

  const businessInfo = Boolean(
    settings?.businessName && settings.businessName !== DEFAULT_BUSINESS_NAME,
  );
  const gstConfigured = Boolean(settings?.gstNumber);

  switch (moduleId) {
    case "inventory":
      return {
        businessInfo,
        gstConfigured,
        branchCreated: branchCount > 0,
        openingStock: productCount > 0,
        firstPiece: unitCount > 0,
      };
    case "production":
      return {
        designCreated: designCount > 0,
        motifCreated: motifCount > 0,
        workOrderCreated: workOrderCount > 0,
        productionRunStarted: productionRunCount > 0,
        karigarSettlement: karigarCount > 0,
      };
    case "sales":
      return {
        gstConfigured,
        customerAdded: customerCount > 0,
        firstSale: saleCount > 0,
        firstInvoice: invoiceCount > 0,
      };
    case "storefront":
      return {
        storeEnabled: Boolean(storefront?.enabled),
        productPublished: publishedCount > 0,
        webOrderReceived: webOrderCount > 0,
      };
    case "multibranch":
      return {
        secondBranch: branchCount >= 2,
        stockTransfer: transferCount > 0,
      };
    default:
      return {};
  }
};

const isModuleComplete = (steps: ModuleStepStatus, moduleId: JewelleryModuleId): boolean => {
  const required: Record<JewelleryModuleId, string[]> = {
    inventory: ["businessInfo", "branchCreated", "openingStock"],
    production: ["designCreated", "productionRunStarted"],
    sales: ["firstSale"],
    storefront: ["storeEnabled", "productPublished"],
    multibranch: ["secondBranch"],
  };
  return required[moduleId].every((key) => steps[key]);
};

export const getOnboardingStatus = async (
  organizationId: string,
  userId: string,
): Promise<OnboardingStatusPayload> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      credentialsConfigured: true,
    },
  });
  if (!user) {
    throw new Error("User not found.");
  }

  const settings = await prisma.shopSettings.findUnique({
    where: { organizationId },
  });

  const branchCount = await prisma.branch.count({
    where: { organizationId, active: true },
  });
  const productCount = await prisma.product.count({
    where: { organizationId },
  });

  const enabledModules = normalizeModules(settings?.enabledModules ?? ["inventory", "sales"]);
  const dismissed = new Set(settings?.dismissedModuleOnboarding ?? []);

  const modules = {} as OnboardingStatusPayload["modules"];
  for (const moduleId of JEWELLERY_MODULES) {
    if (!enabledModules.includes(moduleId)) continue;
    const steps = await computeModuleSteps(organizationId, moduleId);
    modules[moduleId] = {
      title: moduleId,
      complete: isModuleComplete(steps, moduleId),
      dismissed: dismissed.has(moduleId),
      steps,
    };
  }

  const personaComplete = Boolean(
    settings?.setupImplementingFor &&
      settings?.setupTeamSize &&
      settings?.setupBusinessType &&
      settings?.setupCurrentSystem &&
      enabledModules.length > 0,
  );

  return {
    completed: settings?.onboardingCompletedAt != null,
    account: {
      email: user.email,
      name: user.name,
      credentialsConfigured: user.credentialsConfigured,
    },
    profile: {
      implementingFor: settings?.setupImplementingFor ?? null,
      teamSize: settings?.setupTeamSize ?? null,
      businessType: settings?.setupBusinessType ?? null,
      currentSystem: settings?.setupCurrentSystem ?? null,
      enabledModules,
      loadDemoData: settings?.loadDemoData ?? false,
    },
    steps: {
      credentialsConfigured: user.credentialsConfigured,
      businessInfo: Boolean(
        settings?.businessName && settings.businessName !== DEFAULT_BUSINESS_NAME,
      ),
      gstConfigured: Boolean(settings?.gstNumber),
      branchCreated: branchCount > 0,
      openingStock: productCount > 0,
      personaComplete,
    },
    modules,
  };
};

export const saveSetupProfile = async (
  organizationId: string,
  input: SetupProfileInput,
  actorUserId: string,
): Promise<OnboardingStatusPayload> => {
  const existing = await prisma.shopSettings.findUnique({
    where: { organizationId },
  });
  if (!existing) {
    throw new Error("Shop settings not found.");
  }

  const enabledModules = input.enabledModules
    ? normalizeModules(input.enabledModules)
    : normalizeModules(existing.enabledModules);

  const shouldSeedDemo =
    input.loadDemoData === true && !existing.loadDemoData && existing.onboardingCompletedAt == null;

  await prisma.shopSettings.update({
    where: { organizationId },
    data: {
      ...(input.implementingFor !== undefined && {
        setupImplementingFor: input.implementingFor.trim() || null,
      }),
      ...(input.teamSize !== undefined && {
        setupTeamSize: input.teamSize.trim() || null,
      }),
      ...(input.businessType !== undefined && {
        setupBusinessType: input.businessType.trim() || null,
      }),
      ...(input.currentSystem !== undefined && {
        setupCurrentSystem: input.currentSystem.trim() || null,
      }),
      ...(input.enabledModules !== undefined && { enabledModules }),
      ...(input.businessName !== undefined && {
        businessName: input.businessName.trim() || DEFAULT_BUSINESS_NAME,
      }),
      ...(input.gstNumber !== undefined && {
        gstNumber: input.gstNumber.trim().toUpperCase() || null,
      }),
      ...(input.loadDemoData !== undefined && { loadDemoData: input.loadDemoData }),
    },
  });

  if (shouldSeedDemo) {
    await seedDemoData(organizationId, actorUserId);
  }

  return getOnboardingStatus(organizationId, actorUserId);
};

export const completeOnboarding = async (
  organizationId: string,
): Promise<void> => {
  await prisma.shopSettings.update({
    where: { organizationId },
    data: { onboardingCompletedAt: new Date() },
  });
};

export const dismissModuleOnboarding = async (
  organizationId: string,
  moduleId: JewelleryModuleId,
): Promise<void> => {
  const settings = await prisma.shopSettings.findUnique({
    where: { organizationId },
    select: { dismissedModuleOnboarding: true },
  });
  const dismissed = new Set(settings?.dismissedModuleOnboarding ?? []);
  dismissed.add(moduleId);
  await prisma.shopSettings.update({
    where: { organizationId },
    data: { dismissedModuleOnboarding: [...dismissed] },
  });
};
