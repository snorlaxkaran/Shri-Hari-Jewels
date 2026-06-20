-- Multiple finished piece photos on Design builder Photo step
ALTER TABLE "Design" ADD COLUMN IF NOT EXISTS "finishedPhotoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
