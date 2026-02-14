'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { usersApi, salesApi, type User, type SellerReport } from '@/lib/api';
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
} from 'lucide-react';

export default function VendedoresPage() {
  const { token } = useAuthStore();
  const [sellers, setSellers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Report modal
  const [showReport, setShowReport] = useState<SellerReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadSellers();
  }, [token]);

  const loadSellers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await usersApi.getAll(token, { role: 'VENDEDOR', limit: '50' });
      setSellers(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const viewReport = async (sellerId: string) => {
    if (!token) return;
    setLoadingReport(true);
    try {
      const report = await salesApi.getSellerReport(token, sellerId);
      setShowReport(report);
    } catch {
      toast.error('Error al cargar reporte');
    }
    setLoadingReport(false);
  };

  const filteredSellers = sellers.filter(s =>
    !search ||
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Actividad de Vendedores</h1>
        <p className="text-sm text-gray-500 mt-1">Monitoreo de desempeño y reportes</p>
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
              <p className="text-xs text-gray-500 uppercase font-medium">Activos</p>
              <p className="text-2xl font-bold text-emerald-600">{sellers.filter(s => s.isActive).length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5 stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <BarChart3 className="text-white" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Inactivos</p>
              <p className="text-2xl font-bold text-amber-600">{sellers.filter(s => !s.isActive).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" placeholder="Buscar vendedor..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" />
        </div>
      </div>

      {/* Sellers Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredSellers.length === 0 ? (
        <div className="text-center py-16 text-gray-400 glass-card">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p>No hay vendedores registrados</p>
        </div>
      ) : (
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
                    {seller.phone && <p className="text-xs text-gray-400">{seller.phone}</p>}
                  </div>
                </div>
                <span className={`badge ${seller.isActive ? 'badge-success' : 'badge-danger'}`}>
                  {seller.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar size={10} /> Desde {formatDate(seller.createdAt)}
                </p>
                <button
                  onClick={() => viewReport(seller.id)}
                  disabled={loadingReport}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  <BarChart3 size={12} /> Ver Reporte
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-card animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold">
                  {showReport.seller.firstName.charAt(0)}{showReport.seller.lastName.charAt(0)}
                </div>
                <div>
                  <h2 className="font-bold text-lg">{showReport.seller.firstName} {showReport.seller.lastName}</h2>
                  <p className="text-xs text-gray-400">Reporte de actividad</p>
                </div>
              </div>
              <button onClick={() => setShowReport(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-5">
              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl text-center">
                  <ShoppingCart size={20} className="mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold text-primary">{showReport.totalSales}</p>
                  <p className="text-xs text-gray-500">Ventas Totales</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl text-center">
                  <DollarSign size={20} className="mx-auto text-emerald-600 mb-1" />
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(showReport.totalAmount)}</p>
                  <p className="text-xs text-gray-500">Monto Total</p>
                </div>
              </div>

              {/* Top Products */}
              {showReport.topProducts && showReport.topProducts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Award size={14} className="text-amber-500" /> Productos Más Vendidos
                  </h3>
                  <div className="space-y-2">
                    {showReport.topProducts.map((product, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                          i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-300'
                        }`}>
                          {i + 1}
                        </div>
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
                  <p className="text-sm">Este vendedor aún no tiene ventas registradas</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-[var(--color-border)] flex justify-end">
              <button onClick={() => setShowReport(null)} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
