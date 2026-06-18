export type UserRole =
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
};

export type LoginInput = {
  email: string;
  password: string;
};

export type MetalType = "Gold" | "Silver" | "Platinum" | "Rose Gold";
export type Purity = "24K" | "22K" | "18K" | "14K" | "925";
export type InventoryUnitStatus =
  | "Available"
  | "Sold"
  | "Reserved"
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

export type InventoryUnit = {
  id: string;
  itemCode: string;
  sku: string;
  branchId?: string;
  branchName?: string;
  status: InventoryUnitStatus;
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
  createdAt: string;
};

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
  documentType: StockTransferDocumentType;
  transferDate: string;
  itemCount: number;
  totalValue: number;
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
  birthday?: string | null;
  anniversary?: string | null;
  ringSize?: string | null;
  preferences?: string | null;
};

export type CustomerDetail = Customer & {
  sales: Sale[];
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
  phone: string | null;
  upiVpa: string | null;
};

export type UpdateShopSettingsInput = {
  businessName?: string;
  address?: string;
  phone?: string;
  upiVpa?: string;
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
  name: string;
  type: DesignElementType;
  qtyPerSet: number;
  sortOrder: number;
};

export type Design = {
  id: string;
  code: string;
  name?: string;
  category?: DesignCategory;
  elements: DesignElement[];
  createdAt: string;
  updatedAt: string;
};

export type NewDesignElementInput = {
  name: string;
  type: DesignElementType;
  qtyPerSet: number;
  sortOrder?: number;
};

export type NewDesignInput = {
  code: string;
  name?: string;
  category?: DesignCategory;
  elements?: NewDesignElementInput[];
};

export type UpdateDesignInput = {
  name?: string | null;
  category?: DesignCategory | null;
};

export type UpdateDesignElementInput = {
  name?: string;
  type?: DesignElementType;
  qtyPerSet?: number;
  sortOrder?: number;
};

export type ProductionRunStatus =
  | "Open"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export type ProductionRunItem = {
  id: string;
  productionRunId: string;
  elementName: string;
  elementType: string;
  qtyPerSet: number;
  totalQty: number;
  productionDate?: string;
  waxCount?: number;
  czStones?: number;
  czWeight?: number;
  castingReceived: boolean;
  sortOrder: number;
};

export type ProductionRun = {
  id: string;
  runNo: string;
  designId: string;
  designCode: string;
  designName?: string;
  designCategory?: string;
  setsOrdered: number;
  status: ProductionRunStatus;
  items: ProductionRunItem[];
  castingsReceived: number;
  castingsTotal: number;
  createdAt: string;
  updatedAt: string;
};

export type NewProductionRunInput = {
  designId: string;
  setsOrdered: number;
};

export type UpdateProductionRunInput = {
  status?: ProductionRunStatus;
  setsOrdered?: number;
};

export type UpdateProductionRunItemInput = {
  productionDate?: string | null;
  waxCount?: number | null;
  czStones?: number | null;
  czWeight?: number | null;
  castingReceived?: boolean;
};

export type RecordSaleResult = {
  sale: Sale;
  invoice?: Invoice;
  upiQrString?: string;
  upiQrImageUrl?: string;
  requiresConfirmation: boolean;
  autoCapture: boolean;
};

export type SaleUnitLookup = {
  itemCode: string;
  productName: string;
  sku: string;
  category: string;
  listPrice: number;
};

export type CartLineItem = SaleUnitLookup & {
  discount: number;
  dealPrice: number;
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
  silverGrams: number;
  platinumGrams: number;
  diamondCarats: number;
  preciousCarats: number;
  semiPreciousCarats: number;
  metalValue: number;
  stoneValue: number;
};
