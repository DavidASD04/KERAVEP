'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { dashboardApi, type DashboardStats, type Sale, type LowStockAlert, type SellerPerformance } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  CreditCard,
} from 'lucide-react';

export default function DashboardPage() {
  const { token } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
  const [sellerPerf, setSellerPerf] = useState<SellerPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      dashboardApi.getStats(token),
      dashboardApi.getRecentSales(token),
      dashboardApi.getLowStock(token),
      dashboardApi.getSellerPerformance(token),
    ]).then(([s, rs, ls, sp]) => {
      setStats(s);
      setRecentSales(rs);
      setLowStock(ls);
      setSellerPerf(sp);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Ventas Hoy', value: String(stats?.totalSalesToday || 0), icon: ShoppingCart, color: 'from-violet-500 to-purple-600', subValue: formatCurrency(stats?.totalAmountToday || '0') },
    { label: 'Deuda Pendiente', value: formatCurrency(stats?.totalPendingDebt || '0'), icon: CreditCard, color: 'from-amber-500 to-orange-600', subValue: 'Cuentas por cobrar' },
    { label: 'Productos', value: String(stats?.totalProducts || 0), icon: Package, color: 'from-emerald-500 to-teal-600', subValue: 'Registrados' },
    { label: 'Clientes', value: String(stats?.totalCustomers || 0), icon: Users, color: 'from-sky-500 to-blue-600', subValue: 'Activos' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen general del negocio</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="glass-card p-5 stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.subValue}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="text-white" size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Ventas Recientes</h2>
            <a href="/dashboard/ventas" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
              Ver todo <ArrowUpRight size={12} />
            </a>
          </div>
          {recentSales.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No hay ventas recientes
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>N° Venta</th>
                    <th>Cliente</th>
                    <th>Vendedor</th>
                    <th>Tipo</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.slice(0, 5).map((sale) => (
                    <tr key={sale.id} className="animate-fade-in">
                      <td className="font-medium text-primary">{sale.saleNumber}</td>
                      <td>{sale.customerName}</td>
                      <td className="text-gray-500">{sale.sellerName}</td>
                      <td>
                        <span className={`badge ${sale.type === 'CONTADO' ? 'badge-success' : 'badge-warning'}`}>
                          {sale.type}
                        </span>
                      </td>
                      <td className="text-right font-semibold">{formatCurrency(sale.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right side panels */}
        <div className="space-y-6">
          {/* Low Stock Alerts */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="text-base font-semibold text-gray-900">Stock Bajo</h2>
            </div>
            {lowStock.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-400">
                <span className="text-green-500 font-medium">✓</span> Todo en orden
              </div>
            ) : (
              <div className="space-y-3">
                {lowStock.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                      <p className="text-xs text-gray-400">{item.warehouseName}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${item.currentStock === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                        {item.currentStock}
                      </span>
                      <p className="text-[10px] text-gray-400">min: {item.minStock}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seller Performance */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-primary" />
              <h2 className="text-base font-semibold text-gray-900">Top Vendedores</h2>
            </div>
            {sellerPerf.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-400">
                Sin datos aún
              </div>
            ) : (
              <div className="space-y-3">
                {sellerPerf.map((seller, i) => (
                  <div key={seller.sellerId} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : 'bg-amber-600'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{seller.sellerName}</p>
                      <p className="text-xs text-gray-400">{seller.totalSales} ventas</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(seller.totalAmount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
