-- Production run item stone order tracking fields

ALTER TABLE "ProductionRunItem" ADD COLUMN "stoneOrderDate" TIMESTAMP(3);
ALTER TABLE "ProductionRunItem" ADD COLUMN "stoneDeliveryDate" TIMESTAMP(3);
ALTER TABLE "ProductionRunItem" ADD COLUMN "stoneSignOff" TEXT;
