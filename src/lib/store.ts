/**
 * OLYMPUS 2.0 - E-Commerce Store Data Layer
 * Mock data for the e-commerce application
 */

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image: string;
  description: string;
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  items: { productId: string; name: string; quantity: number; price: number }[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  shippingAddress: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  totalSpent: number;
  joinedAt: string;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

export interface StoreStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
}

// Mock Products Data
export const products: Product[] = [
  {
    id: 'prod_1',
    name: 'Premium Wireless Headphones',
    price: 299.99,
    stock: 45,
    category: 'Electronics',
    image: '/products/headphones.jpg',
    description: 'High-quality wireless headphones with noise cancellation',
    createdAt: '2024-12-01T10:00:00Z',
  },
  {
    id: 'prod_2',
    name: 'Organic Green Tea Set',
    price: 45.99,
    stock: 120,
    category: 'Beverages',
    image: '/products/greentea.jpg',
    description: 'Premium organic green tea collection',
    createdAt: '2024-12-02T11:00:00Z',
  },
  {
    id: 'prod_3',
    name: 'Leather Laptop Bag',
    price: 189.5,
    stock: 28,
    category: 'Accessories',
    image: '/products/laptopbag.jpg',
    description: 'Genuine leather laptop bag with compartments',
    createdAt: '2024-12-03T09:00:00Z',
  },
  {
    id: 'prod_4',
    name: 'Yoga Mat Premium',
    price: 79.99,
    stock: 85,
    category: 'Fitness',
    image: '/products/yogamat.jpg',
    description: 'Non-slip premium yoga mat',
    createdAt: '2024-12-04T14:00:00Z',
  },
  {
    id: 'prod_5',
    name: 'Stainless Steel Water Bottle',
    price: 34.99,
    stock: 200,
    category: 'Home & Kitchen',
    image: '/products/waterbottle.jpg',
    description: 'Insulated stainless steel water bottle',
    createdAt: '2024-12-05T16:00:00Z',
  },
  {
    id: 'prod_6',
    name: 'Bluetooth Speaker',
    price: 149.99,
    stock: 55,
    category: 'Electronics',
    image: '/products/speaker.jpg',
    description: 'Portable Bluetooth speaker with 20h battery',
    createdAt: '2024-12-06T12:00:00Z',
  },
  {
    id: 'prod_7',
    name: 'Artisan Coffee Beans 1kg',
    price: 59.99,
    stock: 75,
    category: 'Beverages',
    image: '/products/coffee.jpg',
    description: 'Premium single-origin artisan coffee beans',
    createdAt: '2024-12-07T08:00:00Z',
  },
  {
    id: 'prod_8',
    name: 'Running Shoes Pro',
    price: 229.99,
    stock: 32,
    category: 'Sports',
    image: '/products/shoes.jpg',
    description: 'Professional running shoes with cushioning',
    createdAt: '2024-12-08T10:30:00Z',
  },
];

// Mock Customers Data
export const customers: Customer[] = [
  {
    id: 'cust_1',
    name: 'Ahmed Al-Rashidi',
    email: 'ahmed@example.com',
    phone: '+971 50 123 4567',
    orders: 12,
    totalSpent: 2456.78,
    joinedAt: '2024-06-15T10:00:00Z',
  },
  {
    id: 'cust_2',
    name: 'Fatima Hassan',
    email: 'fatima@example.com',
    phone: '+971 55 987 6543',
    orders: 8,
    totalSpent: 1567.45,
    joinedAt: '2024-07-20T14:00:00Z',
  },
  {
    id: 'cust_3',
    name: 'Khalid Mohammed',
    email: 'khalid@example.com',
    phone: '+971 52 456 7890',
    orders: 15,
    totalSpent: 3890.23,
    joinedAt: '2024-05-10T09:00:00Z',
  },
  {
    id: 'cust_4',
    name: 'Layla Ibrahim',
    email: 'layla@example.com',
    phone: '+971 58 321 0987',
    orders: 5,
    totalSpent: 890.5,
    joinedAt: '2024-08-05T16:00:00Z',
  },
  {
    id: 'cust_5',
    name: 'Omar Farooq',
    email: 'omar@example.com',
    phone: '+971 54 654 3210',
    orders: 22,
    totalSpent: 5123.99,
    joinedAt: '2024-04-20T11:00:00Z',
  },
];

// Mock Orders Data
export const orders: Order[] = [
  {
    id: 'ord_1',
    customerId: 'cust_1',
    customerName: 'Ahmed Al-Rashidi',
    customerEmail: 'ahmed@example.com',
    items: [
      { productId: 'prod_1', name: 'Premium Wireless Headphones', quantity: 1, price: 299.99 },
    ],
    total: 299.99,
    status: 'delivered',
    createdAt: '2024-12-10T14:30:00Z',
    shippingAddress: 'Dubai Marina, Dubai',
  },
  {
    id: 'ord_2',
    customerId: 'cust_2',
    customerName: 'Fatima Hassan',
    customerEmail: 'fatima@example.com',
    items: [
      { productId: 'prod_2', name: 'Organic Green Tea Set', quantity: 2, price: 45.99 },
      { productId: 'prod_7', name: 'Artisan Coffee Beans 1kg', quantity: 1, price: 59.99 },
    ],
    total: 151.97,
    status: 'shipped',
    createdAt: '2024-12-11T09:15:00Z',
    shippingAddress: 'Al Ain, Abu Dhabi',
  },
  {
    id: 'ord_3',
    customerId: 'cust_3',
    customerName: 'Khalid Mohammed',
    customerEmail: 'khalid@example.com',
    items: [
      { productId: 'prod_3', name: 'Leather Laptop Bag', quantity: 1, price: 189.5 },
      { productId: 'prod_6', name: 'Bluetooth Speaker', quantity: 1, price: 149.99 },
    ],
    total: 339.49,
    status: 'processing',
    createdAt: '2024-12-12T11:00:00Z',
    shippingAddress: 'Jumeirah, Dubai',
  },
  {
    id: 'ord_4',
    customerId: 'cust_4',
    customerName: 'Layla Ibrahim',
    customerEmail: 'layla@example.com',
    items: [{ productId: 'prod_4', name: 'Yoga Mat Premium', quantity: 1, price: 79.99 }],
    total: 79.99,
    status: 'pending',
    createdAt: '2024-12-12T15:30:00Z',
    shippingAddress: 'Sharjah',
  },
  {
    id: 'ord_5',
    customerId: 'cust_5',
    customerName: 'Omar Farooq',
    customerEmail: 'omar@example.com',
    items: [
      { productId: 'prod_8', name: 'Running Shoes Pro', quantity: 1, price: 229.99 },
      { productId: 'prod_5', name: 'Stainless Steel Water Bottle', quantity: 2, price: 34.99 },
    ],
    total: 299.97,
    status: 'delivered',
    createdAt: '2024-12-09T10:00:00Z',
    shippingAddress: 'Business Bay, Dubai',
  },
];

// Daily Revenue Data (14+ days)
export const dailyRevenue: DailyRevenue[] = [
  { date: '2024-12-01', revenue: 1250.0, orders: 8 },
  { date: '2024-12-02', revenue: 1890.5, orders: 12 },
  { date: '2024-12-03', revenue: 2340.0, orders: 15 },
  { date: '2024-12-04', revenue: 3100.75, orders: 18 },
  { date: '2024-12-05', revenue: 2780.25, orders: 16 },
  { date: '2024-12-06', revenue: 3520.0, orders: 22 },
  { date: '2024-12-07', revenue: 4200.5, orders: 25 },
  { date: '2024-12-08', revenue: 3890.0, orders: 21 },
  { date: '2024-12-09', revenue: 4560.75, orders: 28 },
  { date: '2024-12-10', revenue: 5120.0, orders: 32 },
  { date: '2024-12-11', revenue: 4780.5, orders: 29 },
  { date: '2024-12-12', revenue: 5450.25, orders: 35 },
  { date: '2024-12-13', revenue: 6200.0, orders: 38 },
  { date: '2024-12-14', revenue: 5890.75, orders: 36 },
];

// Store Statistics
export const storeStats: StoreStats = {
  totalRevenue: dailyRevenue.reduce((sum, d) => sum + d.revenue, 0),
  totalOrders: dailyRevenue.reduce((sum, d) => sum + d.orders, 0),
  totalCustomers: customers.length,
  totalProducts: products.length,
};

// In-memory data store for CRUD operations
let productsStore = [...products];
let ordersStore = [...orders];
let customersStore = [...customers];

// Helper functions
export function getProducts(): Product[] {
  return productsStore;
}

export function getProduct(id: string): Product | undefined {
  return productsStore.find(p => p.id === id);
}

export function addProduct(product: Omit<Product, 'id' | 'createdAt'>): Product {
  const newProduct: Product = {
    ...product,
    id: `prod_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  productsStore.push(newProduct);
  return newProduct;
}

export function updateProduct(id: string, updates: Partial<Product>): Product | null {
  const index = productsStore.findIndex(p => p.id === id);
  if (index === -1) return null;
  productsStore[index] = { ...productsStore[index], ...updates };
  return productsStore[index];
}

export function deleteProduct(id: string): boolean {
  const index = productsStore.findIndex(p => p.id === id);
  if (index === -1) return false;
  productsStore.splice(index, 1);
  return true;
}

export function getOrders(): Order[] {
  return ordersStore;
}

export function getOrder(id: string): Order | undefined {
  return ordersStore.find(o => o.id === id);
}

export function getCustomers(): Customer[] {
  return customersStore;
}

export function getCustomer(id: string): Customer | undefined {
  return customersStore.find(c => c.id === id);
}
