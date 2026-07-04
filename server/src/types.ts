export type UserRole =
  | "SuperAdmin"
  | "Admin"
  | "ProductionManager"
  | "SalesManager"
  | "Store"
  | "Karigar"
  | "Accountant";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type CreateUserInput = {
  userId: string;
  name: string;
  password: string;
  role: UserRole;
  branchId?: string;
};

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  defaultBranchId?: string;
  createdAt: string;
};

export type MetalType =
  | "Gold"
  | "Silver"
  | "Platinum"
  | "Rose Gold"
  | "Base Metal";
export type Purity = "24K" | "22K" | "18K" | "14K" | "925";
export type InventoryUnitStatus =
  | "Available"
  | "Sold"
  | "Reserved"
  | "InTransit"
  | "Transferred";

export type PaymentMode = "Cash" | "UPI" | "Card";
export type PaymentStatus = "Paid" | "Partial" | "Unpaid";
export type OrderStatus =
  | "Pending"
  | "Designing"
  | "Production"
  | "QC"
  | "Ready"
  | "Delivered"
  | "Cancelled";

export type CustomerTier = "Bronze" | "Silver" | "Gold" | "Platinum";

export type ProductImage = {
  id: string;
  url: string;
  name: string;
};

export type InventoryUnitPriceSource = "live" | "sold" | "locked";

export type InventoryUnit = {
  id: string;
  itemCode: string;
  sku: string;
  branchId?: string;
  branchName?: string;
  status: InventoryUnitStatus;
  price: number;
  priceSource: InventoryUnitPriceSource;
  createdAt: string;
};

export type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  metal: MetalType;
  purity: Purity;
  weightGrams: number;
  makingCharges: number;
  stoneCarat?: number;
  stock: number;
  price: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  imageColor: string;
  images: ProductImage[];
  units: InventoryUnit[];
  branchId?: string;
  branchName?: string;
  createdAt: string;
};

export type StockTransferStatus =
  | "Pending"
  | "Accepted"
  | "Rejected"
  | "PartiallyAccepted";

export type StockTransferDocumentType =
  | "Wholesale GST Invoice"
  | "Delivery Challan";

export type StockTransfer = {
  id: string;
  transferNo: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  customerId?: string;
  customerName?: string;
  customerBranchId?: string;
  customerBranchName?: string;
  documentType: StockTransferDocumentType;
  transferDate: string;
  itemCount: number;
  totalValue: number;
  status: StockTransferStatus;
  notes?: string;
  recipientGstNumber?: string;
  recipientGstRegisteredName?: string;
  recipientPanNumber?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  placeOfSupplyState?: string;
  placeOfSupplyStateCode?: string;
  placeOfDeliveryState?: string;
  placeOfDeliveryStateCode?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  courierCompany?: string;
  dispatchDate?: string;
  invoiceNo?: string;
  invoicedAt?: string;
  acceptedById?: string;
  acceptedByName?: string;
  acceptedAt?: string;
  rejectionReason?: string;
  createdByName: string;
  createdAt: string;
  items: StockTransferItem[];
};

export type StockTransferItem = {
  id: string;
  itemCode: string;
  productId: string;
  productName: string;
  sku: string;
  metal: string;
  purity: string;
  price: number;
  accepted: boolean;
  weightGrams?: number;
};

export type CreateStockTransferInput = {
  customerId: string;
  customerBranchId: string;
  documentType: StockTransferDocumentType;
  transferDate: string;
  itemCodes: string[];
  notes?: string;
  billing?: {
    recipientGstNumber?: string;
    recipientGstRegisteredName?: string;
    recipientPanNumber?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    recipientAddress?: string;
    placeOfSupplyState?: string;
    placeOfSupplyStateCode?: string;
    placeOfDeliveryState?: string;
    placeOfDeliveryStateCode?: string;
  };
};

export type PartialAcceptTransferInput = {
  accepted: string[];
  rejected: string[];
  reason?: string;
};

export type MarketRatesCurrent = {
  gold22k: number | null;
  silver925: number | null;
  goldMakingChargesPct: number;
  silverMakingChargesPct: number;
  source: string | null;
  fetchedAt: string | null;
  isStale: boolean;
};

export type OverrideMarketRatesInput = {
  gold22k: number;
  silver925: number;
  goldMakingChargesPct: number;
  silverMakingChargesPct: number;
  note?: string;
};

export type MarketRateHistoryEntry = {
  id: string;
  metalType: string;
  purity: string;
  ratePerGram: number;
  source: string;
  fetchedAt: string;
};

export type SalePriceBreakdown = {
  metalValue: number;
  makingCharges: number;
  stoneCharges: number;
  listPrice: number;
  ratePerGram: number;
  makingChargesPct: number;
  weightGrams: number;
};

export type SaleLookupResult = {
  itemCode: string;
  productName: string;
  sku: string;
  category: string;
  listPrice: number;
  priceBreakdown?: SalePriceBreakdown;
};

export type NewProductInput = {
  name: string;
  category: string;
  metal: MetalType;
  purity: Purity;
  weightGrams: number;
  makingCharges: number;
  stoneCarat?: number;
  price: number;
  quantity: number;
  images: ProductImage[];
  /** Legacy catalog / SKU number — used instead of auto-generated SKU when set */
  catalogNo?: string;
  /** Barcode / item codes — one per unit when importing legacy stock */
  itemCodes?: string[];
};

export type LegacyStockImportRow = {
  catalogNo: string;
  itemCode: string;
  name: string;
  category: string;
  subCategory?: string;
  collection?: string;
  vendor?: string;
  metal: string;
  purity: string;
  weightGrams: number;
  stoneName?: string;
  retailPrice: number;
  hsn?: string;
  stockType?: string;
};

export type BulkStockImportResult = {
  created: number;
  unitsAdded: number;
  errors: string[];
};

export type UpdateProductInput = {
  name?: string;
  category?: string;
  metal?: MetalType;
  purity?: Purity;
  weightGrams?: number;
  makingCharges?: number;
  stoneCarat?: number | null;
  price?: number;
  images?: ProductImage[];
};

export type Customer = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  city?: string;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingPincode?: string;
  billingCountry?: string;
  panNumber?: string;
  gstNumber?: string;
  gstRegisteredName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  birthday?: string;
  anniversary?: string;
  ringSize?: string;
  preferences?: string;
  totalOrders: number;
  totalSpent: number;
  lastVisit?: string;
  tier: CustomerTier;
  createdAt: string;
};

export type NewCustomerInput = {
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  city?: string;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingPincode?: string;
  billingCountry?: string;
  panNumber?: string;
  gstNumber?: string;
  gstRegisteredName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  birthday?: string;
  anniversary?: string;
  ringSize?: string;
  preferences?: string;
};

export type UpdateCustomerInput = {
  name?: string;
  mobile?: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPincode?: string | null;
  billingCountry?: string | null;
  panNumber?: string | null;
  gstNumber?: string | null;
  gstRegisteredName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  birthday?: string | null;
  anniversary?: string | null;
  ringSize?: string | null;
  preferences?: string | null;
};

export type CustomerDetail = Customer & {
  sales: Sale[];
};

export type CustomerBranch = {
  id: string;
  customerId: string;
  branchId?: string;
  branchName?: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  gstRegisteredName?: string;
  panNumber?: string;
  email?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NewCustomerBranchInput = {
  name: string;
  branchId?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  gstRegisteredName?: string;
  panNumber?: string;
  email?: string;
  phone?: string;
};

export type UpdateCustomerBranchInput = {
  name?: string;
  branchId?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstNumber?: string | null;
  gstRegisteredName?: string | null;
  panNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  active?: boolean;
};

export type Order = {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  description: string;
  estimatedTotal?: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  dueDate?: string;
  createdAt: string;
};

export type NewOrderInput = {
  customerId: string;
  description: string;
  estimatedTotal?: number;
  notes?: string;
  dueDate?: string;
};

export type UpdateOrderInput = {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  description?: string;
  estimatedTotal?: number;
  notes?: string;
  dueDate?: string;
};

export type WorkOrderStatus =
  | "Open"
  | "In Production"
  | "QC"
  | "Completed"
  | "Cancelled";
export type WorkOrderPriority = "Low" | "Normal" | "High";

export type WorkOrder = {
  id: string;
  workOrderNo: string;
  orderId?: string;
  orderNo?: string;
  assignedToId?: string;
  assignedToName?: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type NewWorkOrderInput = {
  title: string;
  description: string;
  orderId?: string;
  priority?: WorkOrderPriority;
  dueDate?: string;
  notes?: string;
};

export type UpdateWorkOrderInput = {
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  title?: string;
  description?: string;
  orderId?: string | null;
  assignedToId?: string | null;
  dueDate?: string | null;
  notes?: string | null;
};

export type SalePaymentStatus = "Pending" | "Completed";

export type Sale = {
  id: string;
  itemCode: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  listPrice: number;
  discount: number;
  dealPrice: number;
  paymentMode: PaymentMode;
  paymentStatus: SalePaymentStatus;
  paymentRef?: string;
  cartGroupId?: string;
  customerId?: string;
  customerPhone: string;
  customerName?: string;
  soldAt: string;
};

export type InvoiceStatus = "Paid" | "Pending";

export type Invoice = {
  id: string;
  invoiceNo: string;
  saleId: string;
  customerId?: string;
  customerName: string;
  customerMobile: string;
  itemCode: string;
  productName: string;
  sku: string;
  listPrice: number;
  discount: number;
  total: number;
  paymentMode: PaymentMode;
  paymentRef?: string;
  status: InvoiceStatus;
  createdAt: string;
};

export type ShopSettings = {
  businessName: string;
  address: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
  phone: string | null;
  upiVpa: string | null;
  panNumber: string | null;
  gstNumber: string | null;
  gstRegisteredName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  goldMakingChargesPct: number;
  silverMakingChargesPct: number;
  makingChargesOverrideNote: string | null;
};

export type UpdateShopSettingsInput = {
  businessName?: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  phone?: string;
  upiVpa?: string;
  panNumber?: string;
  gstNumber?: string;
  gstRegisteredName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  goldMakingChargesPct?: number;
  silverMakingChargesPct?: number;
  makingChargesOverrideNote?: string;
};

export type RecordSaleResult = {
  sale: Sale;
  invoice?: Invoice;
  upiQrString?: string;
  upiQrImageUrl?: string;
  requiresConfirmation: boolean;
  autoCapture: boolean;
};

export type RecordSaleInput = {
  itemCode: string;
  customerId: string;
  dealPrice: number;
  discount?: number;
  paymentMode: PaymentMode;
};

export type CartSaleItemInput = {
  itemCode: string;
  dealPrice: number;
  discount?: number;
};

export type RecordCartSaleInput = {
  items: CartSaleItemInput[];
  customerId: string;
  paymentMode: PaymentMode;
};

export type RecordCartSaleResult = {
  sales: Sale[];
  invoices?: Invoice[];
  total: number;
  primarySaleId?: string;
  upiQrString?: string;
  upiQrImageUrl?: string;
  requiresConfirmation: boolean;
  autoCapture: boolean;
};

export type TopProduct = {
  productId: string;
  productName: string;
  sku: string;
  unitsSold: number;
  revenue: number;
};

export type DashboardStats = {
  totalRevenue: number;
  revenueChange: number;
  totalSales: number;
  salesChange: number;
  inventoryCount: number;
  inventoryValue: number;
  lowStockCount: number;
  activeCustomers: number;
  customersChange: number;
  todaySales: number;
  monthlySales: number;
  pendingOrders: number;
  customerCount: number;
  goldGrams: number;
  silverGrams: number;
  diamondCarats: number;
  activeWorkOrders: number;
};

export type SalesDataPoint = {
  month: string;
  revenue: number;
  orders: number;
};

export type CategoryBreakdown = {
  category: string;
  value: number;
  color: string;
};

export type SalesAnalytics = {
  stats: DashboardStats;
  monthly: SalesDataPoint[];
  categoryBreakdown: CategoryBreakdown[];
  recentSales: Sale[];
  topProducts: TopProduct[];
};

export type RawMetalType = "Gold" | "Silver" | "Platinum";
export type RawStoneType = "Diamond" | "Precious" | "SemiPrecious";
export type RawStockAction = "Create" | "Update" | "Transfer" | "Adjustment";
export type StoneLotStatus = "In Stock" | "Reserved" | "Issued";

export type MetalLot = {
  id: string;
  lotNumber: string;
  metalType: RawMetalType;
  purity: Purity;
  weightGrams: number;
  purchaseRate: number;
  currentRate: number;
  vendor: string;
  location: string;
  notes?: string;
  stockValue: number;
  createdAt: string;
  updatedAt: string;
};

export type NewMetalLotInput = {
  metalType: RawMetalType;
  purity: Purity;
  weightGrams: number;
  purchaseRate: number;
  currentRate: number;
  vendor: string;
  location?: string;
  notes?: string;
};

export type UpdateMetalLotInput = {
  purity?: Purity;
  purchaseRate?: number;
  currentRate?: number;
  vendor?: string;
  location?: string;
  notes?: string | null;
};

export type TransferMetalLotInput = {
  toLocation: string;
  reason?: string;
};

export type AdjustMetalLotInput = {
  weightGrams: number;
  reason: string;
};

export type StoneLot = {
  id: string;
  certificateNumber: string;
  stoneType: RawStoneType;
  carat: number;
  color?: string;
  clarity?: string;
  cut?: string;
  vendor: string;
  purchaseRate?: number;
  currentRate?: number;
  location: string;
  status: StoneLotStatus;
  notes?: string;
  stockValue?: number;
  createdAt: string;
  updatedAt: string;
};

export type NewStoneLotInput = {
  certificateNumber?: string;
  stoneType: RawStoneType;
  carat: number;
  color?: string;
  clarity?: string;
  cut?: string;
  vendor: string;
  purchaseRate?: number;
  currentRate?: number;
  location?: string;
  notes?: string;
};

export type UpdateStoneLotInput = {
  color?: string | null;
  clarity?: string | null;
  cut?: string | null;
  vendor?: string;
  purchaseRate?: number | null;
  currentRate?: number | null;
  location?: string;
  status?: StoneLotStatus;
  notes?: string | null;
};

export type TransferStoneLotInput = {
  toLocation: string;
  reason?: string;
};

export type AdjustStoneLotInput = {
  carat: number;
  reason: string;
};

export type RawStockAuditLog = {
  id: string;
  stockType: "Metal" | "Stone";
  stockId: string;
  lotRef: string;
  action: RawStockAction;
  previousValue?: string;
  newValue?: string;
  fromLocation?: string;
  toLocation?: string;
  delta?: number;
  reason?: string;
  performedById?: string;
  performedByName: string;
  createdAt: string;
};

export type RawInventorySummary = {
  goldGrams: number;
  gold22kGrams: number;
  silverGrams: number;
  platinumGrams: number;
  diamondCarats: number;
  preciousCarats: number;
  semiPreciousCarats: number;
  metalValue: number;
  stoneValue: number;
};

export type Branch = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  manager?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NewBranchInput = {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  manager?: string;
};

export type UpdateBranchInput = {
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  manager?: string | null;
  active?: boolean;
};

export type DesignCategory =
  | "Necklace"
  | "Earring"
  | "Ring"
  | "Bracelet"
  | "Pendant"
  | "Bangle"
  | "Other";

export type DesignElementType = "Motif" | "Stone" | "Casting";

export type DesignElement = {
  id: string;
  designId: string;
  motifId?: string;
  name: string;
  type: DesignElementType;
  qtyPerSet: number;
  unitValue?: number;
  weightGramsPerPc?: number;
  sortOrder: number;
};

export type DesignBuilderStage =
  | "SKU"
  | "CAD"
  | "Mold Making"
  | "Motifs"
  | "Photo"
  | "Complete";

export type Design = {
  id: string;
  code: string;
  name?: string;
  category?: DesignCategory;
  metal?: MetalType;
  purity?: Purity;
  makingChargesPerSet?: number;
  builderStage: DesignBuilderStage;
  cadFileUrl?: string;
  cadCompletedAt?: string;
  moldNotes?: string;
  moldPhotoUrl?: string;
  moldCompletedAt?: string;
  finishedPhotoUrl?: string;
  finishedPhotoUrls?: string[];
  builderCompletedAt?: string;
  elements: DesignElement[];
  createdAt: string;
  updatedAt: string;
};

export type NewDesignElementInput = {
  name: string;
  type: DesignElementType;
  qtyPerSet: number;
  motifId?: string;
  unitValue?: number;
  weightGramsPerPc?: number;
  sortOrder?: number;
};

export type NewDesignInput = {
  code: string;
  name?: string;
  category?: DesignCategory;
  metal?: MetalType;
  purity?: Purity;
  elements?: NewDesignElementInput[];
};

export type UpdateDesignInput = {
  name?: string | null;
  category?: DesignCategory | null;
  metal?: MetalType | null;
  purity?: Purity | null;
  makingChargesPerSet?: number | null;
};

export type UpdateDesignBuilderInput = {
  cadFileUrl?: string | null;
  moldNotes?: string | null;
  moldPhotoUrl?: string | null;
  finishedPhotoUrl?: string | null;
  finishedPhotoUrls?: string[] | null;
};

export type UpdateDesignElementInput = {
  name?: string;
  type?: DesignElementType;
  motifId?: string | null;
  qtyPerSet?: number;
  unitValue?: number | null;
  weightGramsPerPc?: number | null;
  sortOrder?: number;
};

export type BulkStoneLot = {
  id: string;
  sizeLabel: string;
  stoneType: MotifStoneType;
  quantity: number;
  pricePerStone: number;
  vendor?: string;
  lotReference?: string;
  purchaseDate?: string;
  location: string;
  createdAt: string;
  updatedAt: string;
};

export type NewBulkStoneLotInput = {
  sizeLabel: string;
  stoneType: MotifStoneType;
  quantity: number;
  pricePerStone: number;
  vendor?: string;
  lotReference?: string;
  purchaseDate?: string;
  location?: string;
};

export type UpdateBulkStoneLotInput = {
  sizeLabel?: string;
  stoneType?: MotifStoneType;
  quantity?: number;
  pricePerStone?: number;
  vendor?: string | null;
  lotReference?: string | null;
  purchaseDate?: string | null;
  location?: string;
};

export type BulkStoneStockWarning = StoneStockWarning;

export type StoneStockWarning = {
  stoneMasterId: string;
  stoneName: string;
  required: number;
  available: number;
  shortfall: number;
};

export type MetalStockWarning = {
  metal: string;
  purity: string;
  requiredGrams: number;
  availableGrams: number;
  shortfallGrams: number;
  perSetGrams: number;
  requestedSets: number;
  maxSets: number;
};

export type ProductionRunPreview = {
  stoneStockWarnings: StoneStockWarning[];
  metalStockWarning: MetalStockWarning | null;
  stoneRequirements: Array<{
    stoneMasterId: string;
    stoneName: string;
    required: number;
  }>;
};

export type StoneCategory =
  | "CZ"
  | "Diamond"
  | "Precious"
  | "SemiPrecious";

export type StoneOriginType = "Natural" | "LabGrown" | "Synthetic";

export type StoneUOM = "Pcs" | "Carat";

export type StoneShape =
  | "Round"
  | "Oval"
  | "Pear"
  | "Princess"
  | "Cushion"
  | "Emerald"
  | "Marquise"
  | "Heart"
  | "Baguette"
  | "Trillion"
  | "Asscher"
  | "Radiant"
  | "Hexagon"
  | "Octagon"
  | "Cabochon";

export type StoneMaster = {
  id: string;
  stoneCode: string;
  stoneName: string;
  stoneCategory: StoneCategory;
  stoneType: StoneOriginType;
  stoneMaterial: string;
  shape: StoneShape;
  sizeMm: string;
  color: string;
  clarityGrade?: string;
  cut?: string;
  uom: StoneUOM;
  unitWeightCt?: number;
  isActive: boolean;
  notes?: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type NewStoneMasterInput = {
  stoneCode: string;
  stoneName: string;
  stoneCategory: StoneCategory;
  stoneType: StoneOriginType;
  stoneMaterial: string;
  shape: StoneShape;
  sizeMm: string;
  color: string;
  clarityGrade?: string;
  cut?: string;
  uom: StoneUOM;
  unitWeightCt?: number;
  isActive?: boolean;
  notes?: string;
};

export type UpdateStoneMasterInput = Partial<NewStoneMasterInput>;

export type StonePurchaseLotStatus = "Active" | "Depleted" | "Closed";

export type StonePurchaseLot = {
  id: string;
  branchId: string;
  branchName?: string;
  stoneMasterId: string;
  lotNo: string;
  packetNo?: string;
  vendorStoneCode?: string;
  vendorName: string;
  invoiceNo: string;
  invoiceDate: string;
  qtyPurchased: number;
  weightPurchased: number;
  purchaseRate: number;
  amount: number;
  gstPct: number;
  gstAmount: number;
  totalAmount: number;
  currentQty: number;
  currentWeightCt: number;
  location?: string;
  reorderLevel?: number;
  status: StonePurchaseLotStatus;
  notes?: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type StonePurchaseLotWithMaster = StonePurchaseLot & {
  stoneMaster?: {
    id: string;
    stoneCode: string;
    stoneName: string;
    stoneCategory: StoneCategory;
    stoneType: string;
    stoneMaterial: string;
    shape: string;
    sizeMm: string;
    color: string;
    clarityGrade?: string;
    uom: string;
    unitWeightCt?: number;
  };
};

export type NewStonePurchaseLotInput = {
  stoneMasterId: string;
  branchId?: string;
  lotNo?: string;
  packetNo?: string;
  vendorStoneCode?: string;
  vendorName: string;
  invoiceNo: string;
  invoiceDate: string;
  qtyPurchased: number;
  weightPurchased: number;
  purchaseRate: number;
  gstPct?: number;
  location?: string;
  reorderLevel?: number;
  notes?: string;
};

export type AdjustStonePurchaseLotInput = {
  qtyDelta: number;
  weightDeltaCt?: number;
  reason: string;
};

export type StoneMovementType =
  | "Receipt"
  | "Issue"
  | "Return"
  | "Breakage"
  | "Loss"
  | "Adjustment";

export type StoneMovementRecord = {
  id: string;
  movementType: StoneMovementType;
  qty: number;
  weightCt: number;
  balanceQtyAfter: number;
  balanceWeightAfter: number;
  productionRunId?: string;
  karigarName?: string;
  ratePerUnit: number;
  totalValue: number;
  reason?: string;
  notes?: string;
  performedByName: string;
  createdAt: string;
};

export type StoneLotDetail = StonePurchaseLotWithMaster & {
  movements: StoneMovementRecord[];
  stats: {
    purchasedQty: number;
    purchasedWeightCt: number;
    inStockQty: number;
    inStockWeightCt: number;
    issuedQty: number;
    lossQty: number;
    lossValue: number;
  };
};

export type StoneLotSummary = {
  category: string;
  qty: number;
  weightCt: number;
  value: number;
};

export type StonePurchaseLotSummaryCards = {
  totalLots: number;
  activeLots: number;
  totalQty: number;
  totalWeightCt: number;
  totalValue: number;
  lossesMtdQty: number;
  lossesMtdValue: number;
  byCategory: StoneLotSummary[];
};

export type IssueStoneInput = {
  productionRunId: string;
  qtyIssued: number;
  weightIssuedCt?: number;
  karigarName: string;
};

export type SettleStoneIssueInput = {
  qtyReturned?: number;
  weightReturnedCt?: number;
  qtyBroken?: number;
  weightBrokenCt?: number;
  qtyLost?: number;
  weightLostCt?: number;
  qtyUsed?: number;
  weightUsedCt?: number;
  lossReason?: string;
};

export type StoneIssueStatus = "Open" | "Settled";

export type UnsettledStoneIssue = {
  id: string;
  productionRunId: string;
  runNo: string;
  stoneLotId: string;
  lotNo: string;
  stoneMasterId: string;
  stoneName: string;
  qtyIssued: number;
  weightIssuedCt: number;
  karigarName: string;
  status: StoneIssueStatus;
  issuedAt: string;
  issuedByName: string;
  settledAt?: string;
  settledByName?: string;
};

export type MotifStone = {
  id: string;
  stoneMasterId: string;
  qtyPerMotif: number;
  sortOrder: number;
  stoneMaster?: {
    id: string;
    stoneCode: string;
    stoneName: string;
    stoneMaterial: string;
    sizeMm: string;
    shape: string;
    uom: string;
  };
};

export type MotifStoneInput = {
  stoneMasterId: string;
  qtyPerMotif: number;
  sortOrder?: number;
};

export type DesignImportRow = {
  rowNumber: number;
  elementName: string;
  qtyPerSet: number;
  totalQty?: number;
  matchedMotifId?: string;
  matchedMotifName?: string;
  matchConfidence: "exact" | "fuzzy" | "none";
  suggestedMotifs: Array<{ id: string; name: string; score: number }>;
};

export type DesignImportPreview = {
  designCode: string;
  sheetName: string;
  codeMismatch: boolean;
  rows: DesignImportRow[];
  existingElements: DesignElement[];
  warnings: string[];
};

export type ConfirmedDesignImportRow = {
  elementName: string;
  qtyPerSet: number;
  motifId?: string;
  type?: DesignElementType;
};

export type DesignElementDiff = {
  added: NewDesignElementInput[];
  removed: DesignElement[];
  changed: Array<{ before: DesignElement; after: NewDesignElementInput }>;
};

export type CatalogAuditLog = {
  id: string;
  entityType: "Design" | "Motif" | "DesignElement";
  entityId: string;
  entityRef?: string;
  action: string;
  previousValue?: string;
  newValue?: string;
  fieldDiffs?: Array<{ field: string; from: unknown; to: unknown }>;
  reason?: string;
  performedById?: string;
  performedByName: string;
  createdAt: string;
};

export type DesignElementPriceDrift = {
  elementId: string;
  elementName: string;
  motifId: string;
  motifName: string;
  snapshotUnitValue: number;
  liveMotifPrice: number;
  lastMotifPriceChange?: {
    at: string;
    by: string;
  };
};

export type MotifPriceDrift = {
  motifId: string;
  motifName: string;
  storedPrice: number;
  calculatedPrice: number;
  isStale: boolean;
  staleStoneLots: Array<{
    stoneMasterId: string;
    stoneName: string;
    livePricePerStone: number;
    qtyPerMotif: number;
  }>;
};

export type MotifMetal = "Silver" | "Gold" | "Platinum";

export type MotifStoneType =
  | "Glass"
  | "Enamel"
  | "Pearl"
  | "Zircon"
  | "Turquoise"
  | "Black Onyx"
  | "Emerald";

export type MotifSubCategory =
  | "Contemporary"
  | "Traditional"
  | "Tribal"
  | "Bridal";

export type Motif = {
  id: string;
  name: string;
  description?: string;
  weightGrams?: number;
  metal: MotifMetal;
  purity: Purity;
  /** @deprecated Use stones[] instead */
  stone1?: MotifStoneType;
  /** @deprecated Use stones[] instead */
  stone2?: MotifStoneType;
  /** @deprecated Use stones[] instead */
  stone3?: MotifStoneType;
  subCategory: MotifSubCategory;
  makingCost?: number;
  price?: number;
  stones?: MotifStone[];
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type NewMotifInput = {
  name: string;
  description?: string;
  weightGrams?: number;
  metal: MotifMetal;
  purity: Purity;
  /** @deprecated Use stones[] instead */
  stone1?: MotifStoneType | null;
  /** @deprecated Use stones[] instead */
  stone2?: MotifStoneType | null;
  /** @deprecated Use stones[] instead */
  stone3?: MotifStoneType | null;
  subCategory: MotifSubCategory;
  makingCost?: number;
  price?: number;
  stones?: MotifStoneInput[];
  imageUrl?: string;
};

export type UpdateMotifInput = {
  name?: string;
  description?: string | null;
  weightGrams?: number | null;
  metal?: MotifMetal;
  purity?: Purity;
  /** @deprecated Use stones[] instead */
  stone1?: MotifStoneType | null;
  /** @deprecated Use stones[] instead */
  stone2?: MotifStoneType | null;
  /** @deprecated Use stones[] instead */
  stone3?: MotifStoneType | null;
  subCategory?: MotifSubCategory;
  makingCost?: number | null;
  price?: number | null;
  stones?: MotifStoneInput[];
  imageUrl?: string | null;
};

export type ProductionRunStatus =
  | "Open"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export type ProductionRunStage =
  | "Wax Pattern"
  | "Casting"
  | "Cleaning"
  | "Assembly"
  | "Prepolish"
  | "Stone Setting"
  | "Final Polishing"
  | "Plating"
  | "Quality Check"
  | "Packaging";

export type ProductionRunStageLog = {
  id: string;
  productionRunId: string;
  stage: ProductionRunStage;
  notes?: string;
  performedById?: string;
  performedByName: string;
  createdAt: string;
};

export type ProductionRunItem = {
  id: string;
  productionRunId: string;
  elementName: string;
  elementType: string;
  qtyPerSet: number;
  totalQty: number;
  unitValue?: number;
  weightGramsPerPc?: number;
  productionDate?: string;
  waxCount?: number;
  czStones?: number;
  czWeight?: number;
  castingReceived: boolean;
  metalLotId?: string;
  stoneLotId?: string;
  metalWeightGrams?: number;
  rawMaterialDeducted: boolean;
  stoneOrderDate?: string;
  stoneDeliveryDate?: string;
  stoneSignOff?: string;
  sortOrder: number;
  motifId?: string;
  imageUrl?: string;
  stageCheckoffs?: Partial<Record<ProductionRunStage, boolean>>;
};

export type ProductionRunDesignPhotos = {
  cadFileUrl?: string;
  moldPhotoUrl?: string;
  finishedPhotoUrl?: string;
  finishedPhotoUrls?: string[];
};

export type ProductionRun = {
  id: string;
  runNo: string;
  designId: string;
  designCode: string;
  designName?: string;
  designCategory?: string;
  designMetal?: string;
  designPurity?: string;
  designPhotos?: ProductionRunDesignPhotos;
  setsOrdered: number;
  status: ProductionRunStatus;
  currentStage: ProductionRunStage;
  stageLogs: ProductionRunStageLog[];
  items: ProductionRunItem[];
  castingsReceived: number;
  castingsTotal: number;
  finishedGoodsProductId?: string;
  stoneStockWarnings?: BulkStoneStockWarning[];
  metalStockWarning?: MetalStockWarning;
  createdAt: string;
  updatedAt: string;
};

export type CompleteProductionRunStageInput = {
  notes?: string;
};

export type NewProductionRunInput = {
  designId: string;
  setsOrdered: number;
};

export type UpdateProductionRunInput = {
  status?: ProductionRunStatus;
  setsOrdered?: number;
  createFinishedGoods?: boolean;
  finishedGoods?: FinishedGoodsInput;
};

export type FinishedGoodsInput = {
  name: string;
  category: string;
  metal: MetalType;
  purity: Purity;
  weightGrams: number;
  makingCharges: number;
  stoneCarat?: number;
  price: number;
  images?: ProductImage[];
  weightOverrideNote?: string;
};

export type FinishedGoodsDefaults = FinishedGoodsInput & {
  quantity: number;
  runNo: string;
  designCode: string;
  sku: string;
  priceBreakdown?: JewelryPriceBreakdown;
};

export type JewelryPriceBreakdown = {
  metalValue: number;
  componentValue: number;
  makingCharges: number;
  totalPrice: number;
  weightGrams: number;
  stoneCarat: number;
  metalRatePerGram: number;
  components: Array<{
    name: string;
    type: string;
    qtyPerSet: number;
    unitValue: number;
    lineValue: number;
  }>;
};

export type UpdateProductionRunItemInput = {
  productionDate?: string | null;
  waxCount?: number | null;
  czStones?: number | null;
  czWeight?: number | null;
  castingReceived?: boolean;
  metalLotId?: string | null;
  stoneLotId?: string | null;
  metalWeightGrams?: number | null;
  metalWeightOverrideNote?: string;
  stoneOrderDate?: string | null;
  stoneDeliveryDate?: string | null;
  stoneSignOff?: string | null;
  stageCheckoffs?: Partial<Record<ProductionRunStage, boolean>>;
};
