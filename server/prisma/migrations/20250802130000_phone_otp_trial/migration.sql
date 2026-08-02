-- Trial signup phone OTP challenges
CREATE TABLE "PhoneOtpChallenge" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneOtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PhoneOtpChallenge_phone_purpose_idx" ON "PhoneOtpChallenge"("phone", "purpose");
CREATE INDEX "PhoneOtpChallenge_expiresAt_idx" ON "PhoneOtpChallenge"("expiresAt");
