-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('Trialing', 'Active', 'Past Due', 'Suspended', 'Cancelled');

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'Trialing',
    "planName" TEXT NOT NULL DEFAULT 'Standard',
    "monthlyAmount" DECIMAL(10,2) NOT NULL,
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "suspendedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPayment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "periodCovered" TEXT NOT NULL,
    "recordedByName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_currentPeriodEnd_idx" ON "Subscription"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX "PlatformPayment_subscriptionId_idx" ON "PlatformPayment"("subscriptionId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPayment" ADD CONSTRAINT "PlatformPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill subscriptions for existing organizations (2-month trial from now)
INSERT INTO "Subscription" (
    "id",
    "organizationId",
    "status",
    "planName",
    "monthlyAmount",
    "trialEndsAt",
    "currentPeriodEnd",
    "gracePeriodDays",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    o."id",
    'Trialing',
    'Standard',
    5000.00,
    o."createdAt" + INTERVAL '2 months',
    o."createdAt" + INTERVAL '2 months',
    0,
    NOW(),
    NOW()
FROM "Organization" o
WHERE NOT EXISTS (
    SELECT 1 FROM "Subscription" s WHERE s."organizationId" = o."id"
);
