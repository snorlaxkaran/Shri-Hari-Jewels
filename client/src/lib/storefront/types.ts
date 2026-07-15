export type StorefrontConfig = {
  slug: string;
  businessName: string;
  enabled: boolean;
  tagline: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  aboutText: string | null;
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  whatsappNumber: string | null;
  shippingNote: string | null;
  returnPolicy: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstNumber: string | null;
};

export type StorefrontProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  metal: string;
  purity: string;
  weightGrams: number;
  price: number;
  stock: number;
  status: string;
  imageColor: string;
  storefrontDescription: string | null;
  images: Array<{ id: string; url: string; name: string }>;
};

export type StorefrontCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
  products?: StorefrontProduct[];
};

export type CartItem = {
  productId: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  imageColor: string;
  maxStock: number;
};

export type WebOrder = {
  id: string;
  orderNo: string;
  customerName: string;
  customerEmail: string | null;
  customerMobile: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  notes: string | null;
  items: Array<{
    id: string;
    productId: string;
    productSku: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  createdAt: string;
};

export type CheckoutInput = {
  customerName: string;
  customerEmail?: string;
  customerMobile: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number }>;
};

export type StorefrontAdminSettings = StorefrontConfig & {
  customDomain: string | null;
  storeUrl: string;
};

export type PublishableProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  publishedToStorefront: boolean;
  storefrontDescription: string | null;
  imageUrl: string | null;
};

export type StorefrontStats = {
  publishedProducts: number;
  totalProducts: number;
  collections: number;
  webOrders: number;
  pendingOrders: number;
};
