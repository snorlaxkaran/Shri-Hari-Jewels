export type MetalType = "Gold" | "Silver" | "Platinum" | "Rose Gold";
export type Purity = "24K" | "22K" | "18K" | "14K" | "925";
export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Ready"
  | "Delivered"
  | "Cancelled";
export type PaymentStatus = "Paid" | "Partial" | "Unpaid";

export type InventoryUnitStatus = "Available" | "Sold" | "Reserved";

export type ProductImage = {
  id: string;
  url: string;
  name: string;
};

export type InventoryUnit = {
  id: string;
  itemCode: string;
  sku: string;
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

export type Order = {
  id: string;
  orderNo: string;
  customerName: string;
  items: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  date: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  totalOrders: number;
  totalSpent: number;
  lastVisit: string;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
};

export type Collection = {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  featured: boolean;
  season: string;
};

export type Invoice = {
  id: string;
  invoiceNo: string;
  customerName: string;
  amount: number;
  gst: number;
  date: string;
  status: "Paid" | "Due" | "Overdue";
};

export type DashboardStats = {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  inventoryCount: number;
  lowStockCount: number;
  activeCustomers: number;
  customersChange: number;
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
