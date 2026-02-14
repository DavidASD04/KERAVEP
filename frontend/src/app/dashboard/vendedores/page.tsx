'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { usersApi, salesApi, warehousesApi, type User, type SellerReport, type SellerWithAssignment, type MobileInventory, type SellerProductSummary } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  Users,
  Eye,
  X,
  BarChart3,
  ShoppingCart,
  DollarSign,
  Award,
  Calendar,
  Search,
  MapPin,
  Package,
  Truck,
  Edit3,
  Save,
  Box,
} from 'lucide-react';

type TabType = 'overview' | 'zones' | 'inventory';

export default function VendedoresPage() {
  const { token, user: currentUser } = useAuthStore();
  const [sellers, setSellers] = useState<SellerWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Report modal
  const [showReport, setShowReport] = useState<SellerReport | null>(null);
  const [reportSeller, setReportSeller] = useState<SellerWithAssignment | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Zone editing
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [zoneValue, setZoneValue] = useState('');

  // Mobile inventory modal
  const [showInventory, setShowInventory] = useState<MobileInventory | null>(null);
  const [inventorySeller, setInventorySeller] = useState<SellerWithAssignment | null>(null);

  // Products summary modal
  const [showProducts, setShowProducts] = useState<SellerProductSummary[] | null>(null);
  const [productsSeller, setProductsSeller] = useState<SellerWithAssignment | null>(null);

  useEffect(() => {
    if (!token) return;
    loadSellers();
  }, [token]);

  const loadSellers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await usersApi.getSellersWithAssignments(token);
      setSellers(data);
    } catch {
      // Fallback to basic list
      try {
        const res = await usersApi.getAll(token, { role: 'VENDEDOR', limit: '50' });
        setSellers(res.data.map(s => ({ ...s, mobileWarehouse: null })));
      } catch { /* ignore */ }
    }
    setLoading(false);
  };

  const viewReport = async (seller: SellerWithAssignment) => {
    if (!token) return;
    setLoadingReport(true);
    setReportSeller(seller);
    try {
      const report = await salesApi.getSellerReport(token, seller.id);
      setShowReport(report);
    } catch {
      toast.error('Error al cargar reporte');
    }
    setLoadingReport(false);
  };

  const saveZone = async (sellerId: string) => {
    if (!token) return;
    try {
      await usersApi.updateZone(token, sellerId, zoneValue);
      setSellers(prev => prev.map(s => s.id === sellerId ? { ...s, zone: zoneValue } : s));
      setEditingZone(null);
      toast.success('Zona/ruta actualizada');
    } catch {
      toast.error('Error al guardar zona');
    }
  };

  const viewMobileInventory = async (seller: SellerWithAssignment) => {
    if (!token) return;
    setInventorySeller(seller);
    try {
      const inv = await usersApi.getMobileInventory(token, seller.id);
      setShowInventory(inv);
    } catch {
      toast.error('Error al cargar inventario');
    }
  };

  const viewProductsSummary = async (seller: SellerWithAssignment) => {
    if (!token) return;
    setProductsSeller(seller);
    try {
      const prods = await usersApi.getProductsSummary(token, seller.id);
      setShowProducts(prods);
    } catch {
      toast.error('Error al cargar productos');
    }
  };

  const filteredSellers = sellers.filter(s =>
    !search ||
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
    (s.zone && s.zone.toLowerCase().includes(search.toLowerCase()))
  );

  const tabs = [
    { id: 'overview' as TabType, label: 'Desempeño', icon: BarChart3 },
    { id: 'zones' as TabType, label: 'Rutas / Zonas', icon: MapPin },
    { id: 'inventory' as TabType, label: 'Inventario Móvil', icon: Truck },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Actividad de Vendedores</h1>
        <p className="text-sm text-gray-500 mt-1">Desempeño, rutas, inventario móvil y productos asignados</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Users className="text-white" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Total Vendedores</p>
              <p className="text-2xl font-bold text-gray-900">{sellers.length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5 stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <TrendingUp className="text-white" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Con Ruta Asignada</p>
              <p className="text-2xl font-bold text-emerald-600">{sellers.filter(s => s.zone).length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5 stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Truck className="text-white" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Con Almacén Móvil</p>
              <p className="text-2xl font-bold text-amber-600">{sellers.filter(s => s.mobileWarehouse).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card p-1.5 flex gap-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center ${
            activeTab === tab.id ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'
          }`}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" placeholder="Buscar vendedor por nombre, email o zona..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredSellers.length === 0 ? (
        <div className="text-center py-16 text-gray-400 glass-card">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p>No hay vendedores registrados</p>
        </div>
      ) : activeTab === 'overview' ? (
        /* === TAB: DESEMPEÑO === */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSellers.map((seller) => (
            <div key={seller.id} className="glass-card p-5 stat-card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    {seller.firstName.charAt(0)}{seller.lastName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{seller.firstName} {seller.lastName}</h3>
                    <p className="text-xs text-gray-400">{seller.email}</p>
                    {seller.zone && (
                      <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {seller.zone}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`badge ${seller.isActive ? 'badge-success' : 'badge-danger'}`}>
                  {seller.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => viewReport(seller)} disabled={loadingReport} className="btn-secondary text-xs py-1.5 px-3 flex-1">
                  <BarChart3 size={12} /> Reporte
                </button>
                <button onClick={() => viewProductsSummary(seller)} className="btn-secondary text-xs py-1.5 px-3 flex-1">
                  <Package size={12} /> Productos
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'zones' ? (
        /* === TAB: RUTAS/ZONAS === */
        <div className="glass-card overflow-hidden">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Teléfono</th>
                <th>Zona / Ruta</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredSellers.map(seller => (
                <tr key={seller.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                        {seller.firstName.charAt(0)}{seller.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{seller.firstName} {seller.lastName}</p>
                        <p className="text-xs text-gray-400">{seller.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm text-gray-600">{seller.phone || '—'}</td>
                  <td>
                    {editingZone === seller.id ? (
                      <div className="flex items-center gap-2">
                        <input type="text" value={zoneValue} onChange={e => setZoneValue(e.target.value)} className="input-field text-sm py-1.5" placeholder="Ej: Zona Norte - Santo Domingo" autoFocus />
                        <button onClick={() => saveZone(seller.id)} className="text-emerald-500 hover:text-emerald-700"><Save size={16} /></button>
                        <button onClick={() => setEditingZone(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${seller.zone ? 'text-gray-700' : 'text-gray-300 italic'}`}>
                          {seller.zone || 'Sin asignar'}
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${seller.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {seller.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => { setEditingZone(seller.id); setZoneValue(seller.zone || ''); }} className="btn-secondary text-xs py-1.5 px-3">
                      <Edit3 size={12} /> Editar Ruta
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* === TAB: INVENTARIO MÓVIL === */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSellers.map(seller => (
            <div key={seller.id} className="glass-card p-5 stat-card">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                  {seller.firstName.charAt(0)}{seller.lastName.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{seller.firstName} {seller.lastName}</h3>
                  {seller.mobileWarehouse ? (
                    <p className="text-xs text-emerald-500 flex items-center gap-1 mt-0.5">
                      <Truck size={10} /> {seller.mobileWarehouse.name}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic mt-0.5">Sin almacén móvil</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => viewMobileInventory(seller)}
                disabled={!seller.mobileWarehouse}
                className={`w-full text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  seller.mobileWarehouse
                    ? 'btn-primary'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Box size={12} /> {seller.mobileWarehouse ? 'Ver Inventario' : 'No asignado'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Report Modal */}
      {showReport && reportSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-card animate-fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] sticky top-0 bg-white/95 backdrop-blur-lg z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold">
                  {reportSeller.firstName.charAt(0)}{reportSeller.lastName.charAt(0)}
                </div>
                <div>
                  <h2 className="font-bold text-lg">{reportSeller.firstName} {reportSeller.lastName}</h2>
                  <p className="text-xs text-gray-400">Reporte de desempeño</p>
                </div>
              </div>
              <button onClick={() => { setShowReport(null); setReportSeller(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl text-center">
                  <ShoppingCart size={20} className="mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold text-primary">{showReport.totalSales}</p>
                  <p className="text-xs text-gray-500">Ventas</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl text-center">
                  <DollarSign size={20} className="mx-auto text-emerald-600 mb-1" />
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(showReport.totalAmount)}</p>
                  <p className="text-xs text-gray-500">Monto Total</p>
                </div>
              </div>

              {showReport.topProducts && showReport.topProducts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Award size={14} className="text-amber-500" /> Top Productos</h3>
                  <div className="space-y-2">
                    {showReport.topProducts.map((product, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                          i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-300'
                        }`}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{product.productName}</p>
                          <p className="text-xs text-gray-400">{product.quantity} unidades</p>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(product.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showReport.totalSales === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Sin ventas registradas</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-[var(--color-border)] flex justify-end">
              <button onClick={() => { setShowReport(null); setReportSeller(null); }} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Inventory Modal */}
      {showInventory && inventorySeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl glass-card animate-fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] sticky top-0 bg-white/95 backdrop-blur-lg z-10">
              <div>
                <h2 className="font-bold text-lg flex items-center gap-2"><Truck size={18} className="text-primary" /> Inventario Móvil</h2>
                <p className="text-sm text-gray-400">{inventorySeller.firstName} {inventorySeller.lastName} — {showInventory.warehouse?.name || 'N/A'}</p>
              </div>
              <button onClick={() => { setShowInventory(null); setInventorySeller(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="p-5">
              {showInventory.message ? (
                <div className="text-center py-8 text-gray-400">
                  <Truck size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">{showInventory.message}</p>
                </div>
              ) : showInventory.stock.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Box size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No hay productos en el inventario móvil</p>
                </div>
              ) : (
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>SKU</th>
                      <th>Cantidad</th>
                      <th>Precio</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showInventory.stock.map((item, i) => (
                      <tr key={i}>
                        <td className="font-medium">{item.productName}</td>
                        <td className="text-xs text-gray-400">{item.productSku}</td>
                        <td className="font-semibold">{item.quantity}</td>
                        <td>{formatCurrency(item.productPrice || '0')}</td>
                        <td>
                          <span className={`badge ${
                            item.quantity <= 0 ? 'badge-danger' : item.quantity <= item.minStock ? 'badge-warning' : 'badge-success'
                          }`}>
                            {item.quantity <= 0 ? 'Agotado' : item.quantity <= item.minStock ? 'Bajo' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Products Summary Modal */}
      {showProducts && productsSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl glass-card animate-fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] sticky top-0 bg-white/95 backdrop-blur-lg z-10">
              <div>
                <h2 className="font-bold text-lg flex items-center gap-2"><Package size={18} className="text-primary" /> Productos del Vendedor</h2>
                <p className="text-sm text-gray-400">{productsSeller.firstName} {productsSeller.lastName} — Últimos 30 días</p>
              </div>
              <button onClick={() => { setShowProducts(null); setProductsSeller(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="p-5">
              {showProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Package size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Sin productos vendidos en los últimos 30 días</p>
                </div>
              ) : (
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>SKU</th>
                      <th>Unidades Vendidas</th>
                      <th>Ingresos</th>
                      <th>Última Venta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showProducts.map((item, i) => (
                      <tr key={i}>
                        <td className="font-medium">{item.productName}</td>
                        <td className="text-xs text-gray-400">{item.productSku}</td>
                        <td className="font-semibold">{item.totalQuantitySold}</td>
                        <td className="font-semibold text-emerald-600">{formatCurrency(item.totalRevenue)}</td>
                        <td className="text-xs text-gray-400">{formatDate(item.lastSaleDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-5 border-t border-[var(--color-border)] flex justify-end">
              <button onClick={() => { setShowProducts(null); setProductsSeller(null); }} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
