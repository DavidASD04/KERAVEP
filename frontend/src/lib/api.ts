const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface FetchOptions extends RequestInit {
  token?: string;
}

class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    headers,
    ...rest,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(
      data?.message || `Error ${res.status}`,
      res.status,
      data
    );
  }

  if (res.status === 204) return null as T;
  return res.json();
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: { email: string; password: string; firstName: string; lastName: string; role?: string }) =>
    fetchApi<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  logout: (token: string) =>
    fetchApi<{ message: string }>('/auth/logout', { method: 'POST', token }),
  getProfile: (token: string) =>
    fetchApi<User>('/auth/profile', { token }),
  updateProfile: (token: string, data: { firstName?: string; lastName?: string; phone?: string; currentPassword?: string; newPassword?: string }) =>
    fetchApi<User>('/auth/profile', { method: 'PATCH', body: JSON.stringify(data), token }),
};

// Notifications
export const notificationsApi = {
  getAll: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<PaginatedResponse<Notification>>(`/notifications${qs}`, { token });
  },
  getUnreadCount: (token: string) =>
    fetchApi<{ count: number }>('/notifications/unread-count', { token }),
  markAsRead: (token: string, id: string) =>
    fetchApi<Notification>(`/notifications/${id}/read`, { method: 'PATCH', token }),
  markAllAsRead: (token: string) =>
    fetchApi<{ message: string }>('/notifications/read-all', { method: 'PATCH', token }),
  delete: (token: string, id: string) =>
    fetchApi<{ message: string }>(`/notifications/${id}`, { method: 'DELETE', token }),
};

// Dashboard
export const dashboardApi = {
  getStats: (token: string) =>
    fetchApi<DashboardStats>('/dashboard/stats', { token }),
  getRecentSales: (token: string) =>
    fetchApi<Sale[]>('/dashboard/recent-sales', { token }),
  getLowStock: (token: string) =>
    fetchApi<LowStockAlert[]>('/dashboard/low-stock', { token }),
  getSellerPerformance: (token: string) =>
    fetchApi<SellerPerformance[]>('/dashboard/seller-performance', { token }),
};

// Products
export const productsApi = {
  getAll: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<PaginatedResponse<Product>>(`/products${qs}`, { token });
  },
  getById: (token: string, id: string) =>
    fetchApi<Product>(`/products/${id}`, { token }),
  create: (token: string, data: Partial<Product>) =>
    fetchApi<Product>('/products', { method: 'POST', body: JSON.stringify(data), token }),
  update: (token: string, id: string, data: Partial<Product>) =>
    fetchApi<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
  delete: (token: string, id: string) =>
    fetchApi<void>(`/products/${id}`, { method: 'DELETE', token }),
};

// Categories
export const categoriesApi = {
  getAll: (token: string) =>
    fetchApi<Category[]>('/categories', { token }),
  create: (token: string, data: { name: string; description?: string }) =>
    fetchApi<Category>('/categories', { method: 'POST', body: JSON.stringify(data), token }),
};

// Customers
export const customersApi = {
  getAll: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<PaginatedResponse<Customer>>(`/customers${qs}`, { token });
  },
  getById: (token: string, id: string) =>
    fetchApi<Customer>(`/customers/${id}`, { token }),
  create: (token: string, data: Partial<Customer>) =>
    fetchApi<Customer>('/customers', { method: 'POST', body: JSON.stringify(data), token }),
  update: (token: string, id: string, data: Partial<Customer>) =>
    fetchApi<Customer>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
  delete: (token: string, id: string) =>
    fetchApi<void>(`/customers/${id}`, { method: 'DELETE', token }),
  getPurchaseHistory: (token: string, id: string) =>
    fetchApi<Sale[]>(`/customers/${id}/purchases`, { token }),
  getCreditStatus: (token: string, id: string) =>
    fetchApi<CreditStatus>(`/customers/${id}/credit`, { token }),
};

// Warehouses
export const warehousesApi = {
  getAll: (token: string) =>
    fetchApi<Warehouse[]>('/warehouses', { token }),
  getById: (token: string, id: string) =>
    fetchApi<Warehouse>(`/warehouses/${id}`, { token }),
  create: (token: string, data: Partial<Warehouse>) =>
    fetchApi<Warehouse>('/warehouses', { method: 'POST', body: JSON.stringify(data), token }),
  getStock: (token: string, id: string) =>
    fetchApi<StockItem[]>(`/warehouses/${id}/stock`, { token }),
  adjustStock: (token: string, id: string, data: { productId: string; quantity: number; reason: string }) =>
    fetchApi<void>(`/warehouses/${id}/stock/adjust`, { method: 'POST', body: JSON.stringify(data), token }),
  addStock: (token: string, id: string, data: { productId: string; quantity: number; notes?: string }) =>
    fetchApi<void>(`/warehouses/${id}/stock/add`, { method: 'POST', body: JSON.stringify(data), token }),
  removeStock: (token: string, id: string, data: { productId: string; quantity: number; reason: string }) =>
    fetchApi<void>(`/warehouses/${id}/stock/remove`, { method: 'POST', body: JSON.stringify(data), token }),
  getMovements: (token: string, id: string) =>
    fetchApi<StockMovement[]>(`/warehouses/${id}/movements`, { token }),
  getStockSummary: (token: string) =>
    fetchApi<StockSummary>('/warehouses/stock/summary', { token }),
};

// Sales
export const salesApi = {
  getAll: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<PaginatedResponse<Sale>>(`/sales${qs}`, { token });
  },
  getById: (token: string, id: string) =>
    fetchApi<SaleDetail>(`/sales/${id}`, { token }),
  create: (token: string, data: CreateSaleData) =>
    fetchApi<SaleDetail>('/sales', { method: 'POST', body: JSON.stringify(data), token }),
  cancel: (token: string, id: string) =>
    fetchApi<void>(`/sales/${id}/cancel`, { method: 'POST', token }),
  getDailySummary: (token: string) =>
    fetchApi<DailySummary>('/sales/daily-summary', { token }),
  getSellerReport: (token: string, sellerId: string) =>
    fetchApi<SellerReport>(`/sales/seller-report/${sellerId}`, { token }),
};

// Accounts Receivable
export const accountsApi = {
  getAll: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<PaginatedResponse<AccountReceivable>>(`/accounts-receivable${qs}`, { token });
  },
  getById: (token: string, id: string) =>
    fetchApi<AccountReceivableDetail>(`/accounts-receivable/${id}`, { token }),
  registerPayment: (token: string, id: string, data: { amount: string; method: string; reference?: string }) =>
    fetchApi<void>(`/accounts-receivable/${id}/payment`, { method: 'POST', body: JSON.stringify(data), token }),
  getAgingReport: (token: string) =>
    fetchApi<AgingReport>('/accounts-receivable/aging-report', { token }),
  getCustomerStatement: (token: string, customerId: string) =>
    fetchApi<CustomerStatement>(`/accounts-receivable/customer/${customerId}/statement`, { token }),
};

// Users
export const usersApi = {
  getAll: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<PaginatedResponse<User>>(`/users${qs}`, { token });
  },
  getById: (token: string, id: string) =>
    fetchApi<User>(`/users/${id}`, { token }),
  toggleActive: (token: string, id: string) =>
    fetchApi<User>(`/users/${id}/toggle-active`, { method: 'PATCH', token }),
  updateZone: (token: string, id: string, zone: string) =>
    fetchApi<User>(`/users/${id}/zone`, { method: 'PATCH', body: JSON.stringify({ zone }), token }),
  getSellersWithAssignments: (token: string) =>
    fetchApi<SellerWithAssignment[]>('/users/sellers/assignments', { token }),
  getMobileInventory: (token: string, id: string) =>
    fetchApi<MobileInventory>(`/users/${id}/mobile-inventory`, { token }),
  getProductsSummary: (token: string, id: string) =>
    fetchApi<SellerProductSummary[]>(`/users/${id}/products-summary`, { token }),
};

// Cash Closings
export const cashClosingsApi = {
  getAll: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<PaginatedResponse<CashClosing>>(`/cash-closings${qs}`, { token });
  },
  getById: (token: string, id: string) =>
    fetchApi<CashClosingDetail>(`/cash-closings/${id}`, { token }),
  create: (token: string, data: { warehouseId: string; date: string; notes?: string }) =>
    fetchApi<CashClosing>('/cash-closings', { method: 'POST', body: JSON.stringify(data), token }),
};

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'VENDEDOR' | 'ALMACENERO';
  phone?: string;
  zone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalSalesToday: number;
  totalAmountToday: string;
  totalPendingDebt: string;
  totalSellersActive: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  type: 'TERMINADO' | 'MATERIA_PRIMA' | 'SEMI_TERMINADO';
  price: string;
  cost: string;
  minStock: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit: string;
  currentDebt: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreditStatus {
  customer: Customer;
  pendingAccounts: AccountReceivable[];
  totalDebt: string;
  availableCredit: string;
}

export interface Warehouse {
  id: string;
  name: string;
  type: 'CENTRAL' | 'MOVIL';
  address?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface StockItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  minStock: number;
  productUnit?: string;
  productPrice?: string;
  sku?: string;
  unit?: string;
}

export interface StockMovement {
  id: string;
  productName: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  createdAt: string;
}

export interface StockSummary {
  totalProducts: number;
  totalUnits: number;
  lowStockItems: StockItem[];
  outOfStockItems: StockItem[];
}

export interface Sale {
  id: string;
  saleNumber: string;
  customerName: string;
  sellerName: string;
  warehouseName: string;
  type: 'CONTADO' | 'CREDITO';
  status: 'COMPLETADA' | 'CANCELADA' | 'PENDIENTE';
  subtotal: string;
  discount: string;
  total: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

export interface SaleDetail extends Sale {
  customerId: string;
  userId: string;
  warehouseId: string;
  tax: string;
  notes?: string;
  items: SaleItem[];
}

export interface CreateSaleData {
  customerId: string;
  type: 'CONTADO' | 'CREDITO';
  warehouseId: string;
  discount?: string;
  notes?: string;
  items: { productId: string; quantity: number; unitPrice: string }[];
}

export interface DailySummary {
  totalSales: number;
  totalAmount: string;
  totalCash: string;
  totalCredit: string;
  salesByType: { type: string; count: number; total: string }[];
}

export interface SellerReport {
  seller: User;
  totalSales: number;
  totalAmount: string;
  topProducts: { productName: string; quantity: number; total: string }[];
}

export interface AccountReceivable {
  id: string;
  saleId: string;
  saleNumber: string;
  customerName: string;
  customerId: string;
  totalAmount: string;
  paidAmount: string;
  balance: string;
  status: 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'VENCIDA';
  dueDate: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  amount: string;
  method: string;
  reference?: string;
  createdAt: string;
}

export interface AccountReceivableDetail extends AccountReceivable {
  payments: Payment[];
}

export interface AgingReport {
  current: { count: number; total: string };
  days1to30: { count: number; total: string };
  days31to60: { count: number; total: string };
  days61to90: { count: number; total: string };
  over90: { count: number; total: string };
  totalPending: string;
}

export interface CustomerStatement {
  customer: Customer;
  accounts: AccountReceivable[];
  totalDebt: string;
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  sku: string;
  warehouseName: string;
  currentStock: number;
  minStock: number;
}

export interface SellerPerformance {
  userId: string;
  sellerName: string;
  totalSales: number;
  totalRevenue: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SellerWithAssignment extends User {
  mobileWarehouse: { id: string; name: string; type: string } | null;
}

export interface MobileInventory {
  warehouse: { id: string; name: string; type: string } | null;
  stock: StockItem[];
  message?: string;
}

export interface SellerProductSummary {
  productId: string;
  productName: string;
  productSku: string;
  totalQuantitySold: string;
  totalRevenue: string;
  lastSaleDate: string;
}

export interface CashClosing {
  id: string;
  warehouseId: string;
  warehouseName: string;
  userId: string;
  userName: string;
  date: string;
  totalCash: string;
  totalCredit: string;
  totalSales: string;
  totalCollections: string;
  notes?: string;
  createdAt: string;
}

export interface CashClosingDetail extends CashClosing {
  sales: {
    id: string;
    saleNumber: string;
    type: string;
    total: string;
    customerName: string;
    createdAt: string;
  }[];
}

export type NotificationType =
  | 'STOCK_BAJO'
  | 'STOCK_AGOTADO'
  | 'NUEVA_VENTA'
  | 'VENTA_CANCELADA'
  | 'NUEVO_CLIENTE'
  | 'PAGO_RECIBIDO'
  | 'CUENTA_VENCIDA'
  | 'CIERRE_CAJA'
  | 'SESION_CERRADA'
  | 'USUARIO_DESACTIVADO'
  | 'TRANSFERENCIA'
  | 'SISTEMA';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  userId?: string;
  targetRole?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}
