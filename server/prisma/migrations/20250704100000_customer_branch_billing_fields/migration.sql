-- AlterTable
ALTER TABLE "CustomerBranch" ADD COLUMN "gstNumber" TEXT;
ALTER TABLE "CustomerBranch" ADD COLUMN "gstRegisteredName" TEXT;
ALTER TABLE "CustomerBranch" ADD COLUMN "panNumber" TEXT;
ALTER TABLE "CustomerBranch" ADD COLUMN "email" TEXT;
ALTER TABLE "CustomerBranch" ADD COLUMN "phone" TEXT;

-- AlterTable
ALTER TABLE "StockTransfer" ADD COLUMN "recipientGstNumber" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN "recipientGstRegisteredName" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN "recipientPanNumber" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN "recipientEmail" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN "recipientPhone" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN "recipientAddress" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN "placeOfSupplyState" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN "placeOfSupplyStateCode" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN "placeOfDeliveryState" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN "placeOfDeliveryStateCode" TEXT;
