-- Track which inventory units were reserved for each web order line
ALTER TABLE "WebOrderItem" ADD COLUMN "reservedUnitIds" JSONB NOT NULL DEFAULT '[]';
