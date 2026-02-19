'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import {
  salesApi,
  customersApi,
  productsApi,
  warehousesApi,
  type Sale,
  type Customer,
  type Product,
  type Warehouse,
  type SaleDetail,
  type CreateSaleData,
} from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  ShoppingCart,
  Plus,
  Search,
  Eye,
  XCircle,
  Trash2,
  X,
  Filter,
  Receipt,
  User,
  MapPin,
  UserPlus,
  Check,
} from 'lucide-react';

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  maxStock: number;
}

export default function VentasPage() {
  const { token, user } = useAuthStore();
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showNewSale, setShowNewSale] = useState(false);
  const [showDetail, setShowDetail] = useState<SaleDetail | null>(null);

  // New sale form
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ firstName: '', lastName: '', phone: '', email: '', address: '', creditLimit: '5000' });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [saleType, setSaleType] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  const loadSales = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (filterType) params.type = filterType;
      if (filterSearch) params.search = filterSearch;
      const res = await salesApi.getAll(token, params);
      setSales(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { loadSales(); }, [token, page, filterType, filterSearch]);

  const openNewSale = async () => {
    if (!token) return;
    try {
      const [c, p, w] = await Promise.all([
        customersApi.getAll(token, { limit: '100' }),
        productsApi.getAll(token, { limit: '100', type: 'TERMINADO' }),
        warehousesApi.getAll(token),
      ]);
      setCustomers(c.data);
      setProducts(p.data);
      setWarehouses(w);
      if (w.length > 0) {
        setSelectedWarehouse(w[0].id);
        loadWarehouseStock(w[0].id);
      }
      setShowNewSale(true);
    } catch (err) {
      toast.error('Error cargando datos');
    }
  };

  const loadWarehouseStock = async (warehouseId: string) => {
    if (!token) return;
    try {
      const stock = await warehousesApi.getStock(token, warehouseId);
      const map: Record<string, number> = {};
      stock.forEach(s => { map[s.productId] = s.quantity; });
      setStockMap(map);
    } catch {
      setStockMap({});
    }
  };

  const handleWarehouseChange = (warehouseId: string) => {
    setSelectedWarehouse(warehouseId);
    setCart([]);
    loadWarehouseStock(warehouseId);
  };

  const addToCart = (product: Product) => {
    const stock = stockMap[product.id] || 0;
    if (stock <= 0) {
      toast.error('Sin stock disponible');
      return;
    }
    const existing = cart.find(c => c.productId === product.id);
    if (existing) {
      if (existing.quantity >= stock) {
        toast.error('Stock insuficiente');
        return;
      }
      setCart(cart.map(c =>
        c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        unitPrice: parseFloat(product.price),
        maxStock: stock,
      }]);
    }
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter(c => c.productId !== productId));
    } else {
      setCart(cart.map(c =>
        c.productId === productId ? { ...c, quantity: Math.min(qty, c.maxStock) } : c
      ));
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(c => c.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleSubmitSale = async () => {
    if (!token || !selectedCustomer || !selectedWarehouse || cart.length === 0) {
      toast.error('Complete todos los campos');
      return;
    }
    setSubmitting(true);
    try {
      const data: CreateSaleData = {
        customerId: selectedCustomer,
        warehouseId: selectedWarehouse,
        type: saleType,
        items: cart.map(c => ({
          productId: c.productId,
          quantity: c.quantity,
          unitPrice: String(c.unitPrice),
        })),
      };
      const result = await salesApi.create(token, data);
      toast.success(`Venta ${result.saleNumber} creada`);
      setShowNewSale(false);
      setCart([]);
      setSelectedCustomer('');
      setSelectedCustomerName('');
      setCustomerSearch('');
      setSaleType('CONTADO');
      loadSales();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear venta';
      toast.error(message);
    }
    setSubmitting(false);
  };

  const viewSaleDetail = async (saleId: string) => {
    if (!token) return;
    try {
      const detail = await salesApi.getById(token, saleId);
      setShowDetail(detail);
    } catch {
      toast.error('Error al cargar detalle');
    }
  };

  const cancelSale = async (saleId: string) => {
    if (!token) return;
    if (!confirm('¿Cancelar esta venta? El stock se restaurará.')) return;
    try {
      await salesApi.cancel(token, saleId);
      toast.success('Venta cancelada');
      setShowDetail(null);
      loadSales();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cancelar';
      toast.error(message);
    }
  };

  const filteredProducts = products.filter(p =>
    !searchProduct || p.name.toLowerCase().includes(searchProduct.toLowerCase()) || p.sku.toLowerCase().includes(searchProduct.toLowerCase())
  );

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    const full = `${c.firstName} ${c.lastName}`.toLowerCase();
    return full.includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q);
  });

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c.id);
    setSelectedCustomerName(`${c.firstName} ${c.lastName}`);
    setCustomerSearch(`${c.firstName} ${c.lastName}`);
    setShowCustomerDropdown(false);
  };

  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearch(value);
    setShowCustomerDropdown(true);
    // If user edits the text, clear the selection
    if (selectedCustomerName && value !== selectedCustomerName) {
      setSelectedCustomer('');
      setSelectedCustomerName('');
    }
  };

  const openCreateCustomer = () => {
    const parts = customerSearch.trim().split(' ');
    setNewCustomerData({
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
      phone: '', email: '', address: '', creditLimit: '5000',
    });
    setShowCreateCustomer(true);
    setShowCustomerDropdown(false);
  };

  const handleCreateCustomer = async () => {
    if (!token || !newCustomerData.firstName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setCreatingCustomer(true);
    try {
      const created = await customersApi.create(token, {
        firstName: newCustomerData.firstName.trim(),
        lastName: newCustomerData.lastName.trim(),
        phone: newCustomerData.phone.trim() || undefined,
        email: newCustomerData.email.trim() || undefined,
        address: newCustomerData.address.trim() || undefined,
        creditLimit: newCustomerData.creditLimit || '5000',
      });
      setCustomers(prev => [...prev, created]);
      selectCustomer(created);
      setShowCreateCustomer(false);
      toast.success(`Cliente ${created.firstName} ${created.lastName} creado`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear cliente');
    }
    setCreatingCustomer(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de ventas y punto de venta</p>
        </div>
        <button onClick={openNewSale} className="btn-primary">
          <Plus size={16} />
          Nueva Venta
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por N° venta, cliente..."
            value={filterSearch}
            onChange={(e) => { setFilterSearch(e.target.value); setPage(1); }}
            className="input-field pl-9"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="input-field w-auto"
        >
          <option value="">Todos los tipos</option>
          <option value="CONTADO">Contado</option>
          <option value="CREDITO">Crédito</option>
        </select>
      </div>

      {/* Sales Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShoppingCart size={40} className="mx-auto mb-3 opacity-40" />
            <p>No hay ventas registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>N° Venta</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th className="text-right">Total</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="font-medium text-primary">{sale.saleNumber}</td>
                    <td className="text-gray-500 text-xs">{formatDateTime(sale.createdAt)}</td>
                    <td className="font-medium">{sale.customerName}</td>
                    <td className="text-gray-500">{sale.sellerName}</td>
                    <td>
                      <span className={`badge ${sale.type === 'CONTADO' ? 'badge-success' : 'badge-warning'}`}>
                        {sale.type}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${sale.status === 'COMPLETADA' ? 'badge-success' : sale.status === 'CANCELADA' ? 'badge-danger' : 'badge-info'}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="text-right font-semibold">{formatCurrency(sale.total)}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => viewSaleDetail(sale.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 15 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
            <p className="text-xs text-gray-500">{total} ventas total</p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 15 >= total}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Sale Modal (POS) */}
      {showNewSale && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-5xl glass-card animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                  <Receipt className="text-white" size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Nueva Venta</h2>
                  <p className="text-xs text-gray-400">Punto de venta</p>
                </div>
              </div>
              <button onClick={() => { setShowNewSale(false); setCart([]); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col lg:flex-row">
              {/* Left: Product selection */}
              <div className="flex-1 p-5 border-b lg:border-b-0 lg:border-r border-[var(--color-border)]">
                {/* Sale config */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="relative">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Cliente *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder="Escribir nombre del cliente..."
                        value={customerSearch}
                        onChange={e => handleCustomerSearchChange(e.target.value)}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className={`input-field text-sm pl-8 pr-8 ${selectedCustomer ? 'border-emerald-300 bg-emerald-50/50' : ''}`}
                        autoComplete="off"
                      />
                      {selectedCustomer && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" size={14} />
                      )}
                    </div>
                    {/* Dropdown */}
                    {showCustomerDropdown && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.slice(0, 8).map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => selectCustomer(c)}
                              className={`w-full text-left px-3 py-2.5 hover:bg-primary/5 transition-colors border-b border-gray-50 last:border-0 flex items-center justify-between ${
                                selectedCustomer === c.id ? 'bg-primary/10' : ''
                              }`}
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                                <p className="text-[10px] text-gray-400">{c.phone || c.email || 'Sin contacto'}</p>
                              </div>
                              {selectedCustomer === c.id && <Check size={14} className="text-primary" />}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-center text-sm text-gray-400">
                            No se encontró &quot;{customerSearch}&quot;
                          </div>
                        )}
                        {/* Create new option */}
                        {customerSearch.trim().length > 0 && (
                          <button
                            type="button"
                            onClick={openCreateCustomer}
                            className="w-full text-left px-3 py-2.5 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center gap-2 text-primary font-medium text-sm border-t border-gray-100"
                          >
                            <UserPlus size={14} />
                            Crear cliente &quot;{customerSearch.trim()}&quot;
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Almacén *</label>
                    <select value={selectedWarehouse} onChange={e => handleWarehouseChange(e.target.value)} className="input-field text-sm">
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo *</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSaleType('CONTADO')}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${saleType === 'CONTADO' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        Contado
                      </button>
                      <button
                        onClick={() => setSaleType('CREDITO')}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${saleType === 'CREDITO' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        Crédito
                      </button>
                    </div>
                  </div>
                </div>

                {/* Product search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={searchProduct}
                    onChange={e => setSearchProduct(e.target.value)}
                    className="input-field pl-8 text-sm"
                  />
                </div>

                {/* Product grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                  {filteredProducts.map(product => {
                    const stock = stockMap[product.id] || 0;
                    const inCart = cart.find(c => c.productId === product.id);
                    return (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        disabled={stock <= 0}
                        className={`p-3 rounded-xl border text-left transition-all ${stock <= 0 ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200' : 'hover:border-primary hover:shadow-sm border-gray-200 bg-white'} ${inCart ? 'border-primary ring-1 ring-primary/20' : ''}`}
                      >
                        <p className="text-xs font-semibold text-gray-900 truncate">{product.name}</p>
                        <p className="text-[10px] text-gray-400">{product.sku}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-bold text-primary">{formatCurrency(product.price)}</span>
                          <span className={`text-[10px] font-medium ${stock <= 0 ? 'text-red-400' : stock <= 5 ? 'text-amber-500' : 'text-gray-400'}`}>
                            Stock: {stock}
                          </span>
                        </div>
                        {inCart && (
                          <div className="mt-1 text-[10px] font-bold text-primary text-center bg-primary/5 rounded-lg py-0.5">
                            {inCart.quantity} en carrito
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Cart */}
              <div className="w-full lg:w-[340px] flex flex-col">
                <div className="p-4 border-b border-[var(--color-border)]">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <ShoppingCart size={14} />
                    Carrito ({cart.length})
                  </h3>
                </div>

                <div className="flex-1 p-4 overflow-y-auto max-h-[350px] space-y-2">
                  {cart.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-8">Carrito vacío</p>
                  ) : (
                    cart.map(item => (
                      <div key={item.productId} className="p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                            <p className="text-[10px] text-gray-400">{formatCurrency(item.unitPrice)} c/u</p>
                          </div>
                          <button onClick={() => removeFromCart(item.productId)} className="text-gray-400 hover:text-red-500 p-0.5">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQty(item.productId, item.quantity - 1)}
                              className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold"
                            >
                              −
                            </button>
                            <span className="text-sm font-semibold w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQty(item.productId, item.quantity + 1)}
                              className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total and submit */}
                <div className="p-4 border-t border-[var(--color-border)] bg-gray-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600">Total</span>
                    <span className="text-xl font-bold text-gray-900">{formatCurrency(cartTotal)}</span>
                  </div>
                  <button
                    onClick={handleSubmitSale}
                    disabled={submitting || cart.length === 0 || !selectedCustomer}
                    className="btn-primary w-full justify-center py-3"
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Procesando...
                      </div>
                    ) : (
                      <>
                        <ShoppingCart size={16} />
                        Confirmar Venta
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click-away overlay for customer dropdown */}
      {showCustomerDropdown && showNewSale && (
        <div className="fixed inset-0 z-40" onClick={() => setShowCustomerDropdown(false)} />
      )}

      {/* Create Customer Modal */}
      {showCreateCustomer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <UserPlus className="text-white" size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Nuevo Cliente</h2>
                  <p className="text-xs text-gray-400">Crear cliente rápido</p>
                </div>
              </div>
              <button onClick={() => setShowCreateCustomer(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
                  <input
                    type="text"
                    value={newCustomerData.firstName}
                    onChange={e => setNewCustomerData(d => ({ ...d, firstName: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="Nombre"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Apellido</label>
                  <input
                    type="text"
                    value={newCustomerData.lastName}
                    onChange={e => setNewCustomerData(d => ({ ...d, lastName: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="Apellido"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Teléfono</label>
                  <input
                    type="text"
                    value={newCustomerData.phone}
                    onChange={e => setNewCustomerData(d => ({ ...d, phone: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="809-555-0000"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={newCustomerData.email}
                    onChange={e => setNewCustomerData(d => ({ ...d, email: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="correo@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Dirección</label>
                <input
                  type="text"
                  value={newCustomerData.address}
                  onChange={e => setNewCustomerData(d => ({ ...d, address: e.target.value }))}
                  className="input-field text-sm"
                  placeholder="Dirección del cliente"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Límite de crédito (RD$)</label>
                <input
                  type="number"
                  value={newCustomerData.creditLimit}
                  onChange={e => setNewCustomerData(d => ({ ...d, creditLimit: e.target.value }))}
                  className="input-field text-sm"
                  placeholder="5000"
                />
              </div>
            </div>
            <div className="p-5 border-t border-[var(--color-border)] flex justify-end gap-3">
              <button onClick={() => setShowCreateCustomer(false)} className="btn-secondary text-sm">
                Cancelar
              </button>
              <button
                onClick={handleCreateCustomer}
                disabled={creatingCustomer || !newCustomerData.firstName.trim()}
                className="btn-primary text-sm"
              >
                {creatingCustomer ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creando...
                  </div>
                ) : (
                  <>
                    <UserPlus size={14} />
                    Crear y Seleccionar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-card animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <div>
                <h2 className="font-bold text-lg">{showDetail.saleNumber}</h2>
                <p className="text-xs text-gray-400">{formatDateTime(showDetail.createdAt)}</p>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase">Cliente</p>
                  <p className="text-sm font-medium">{showDetail.customerName}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase">Vendedor</p>
                  <p className="text-sm font-medium">{showDetail.sellerName}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase">Tipo</p>
                  <span className={`badge ${showDetail.type === 'CONTADO' ? 'badge-success' : 'badge-warning'}`}>
                    {showDetail.type}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase">Estado</p>
                  <span className={`badge ${showDetail.status === 'COMPLETADA' ? 'badge-success' : showDetail.status === 'CANCELADA' ? 'badge-danger' : 'badge-info'}`}>
                    {showDetail.status}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Productos</h3>
                <div className="space-y-2">
                  {showDetail.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{item.productName || `Producto`}</p>
                        <p className="text-xs text-gray-400">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <span className="text-base font-bold">Total</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(showDetail.total)}</span>
              </div>
            </div>

            <div className="p-5 border-t border-[var(--color-border)] flex gap-3 justify-end">
              {showDetail.status === 'COMPLETADA' && user?.role === 'ADMIN' && (
                <button onClick={() => cancelSale(showDetail.id)} className="btn-danger text-xs">
                  <XCircle size={14} />
                  Cancelar Venta
                </button>
              )}
              <button onClick={() => setShowDetail(null)} className="btn-secondary text-xs">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
