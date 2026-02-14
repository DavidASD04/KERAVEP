'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { cashClosingsApi, warehousesApi, type CashClosing, type CashClosingDetail, type Warehouse } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Lock,
  Plus,
  X,
  Eye,
  Calendar,
  DollarSign,
  CreditCard,
  TrendingUp,
  Banknote,
  Search,
  Building2,
} from 'lucide-react';

export default function CierresPage() {
  const { token, user } = useAuthStore();
  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ warehouseId: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [creating, setCreating] = useState(false);

  // Detail modal
  const [showDetail, setShowDetail] = useState<CashClosingDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Filters
  const [filterWarehouse, setFilterWarehouse] = useState('');

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token, page, filterWarehouse]);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (filterWarehouse) params.warehouseId = filterWarehouse;

      const [res, whs] = await Promise.all([
        cashClosingsApi.getAll(token, params),
        warehousesApi.getAll(token),
      ]);
      setClosings(res.data);
      setTotalPages(res.totalPages);
      setWarehouses(Array.isArray(whs) ? whs : []);
    } catch {
      toast.error('Error al cargar cierres');
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!token || !createForm.warehouseId || !createForm.date) {
      toast.error('Selecciona almacén y fecha');
      return;
    }
    setCreating(true);
    try {
      await cashClosingsApi.create(token, createForm);
      toast.success('Cierre de caja generado');
      setShowCreate(false);
      setCreateForm({ warehouseId: '', date: new Date().toISOString().split('T')[0], notes: '' });
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Error al crear cierre');
    }
    setCreating(false);
  };

  const viewDetail = async (id: string) => {
    if (!token) return;
    setLoadingDetail(true);
    try {
      const detail = await cashClosingsApi.getById(token, id);
      setShowDetail(detail);
    } catch {
      toast.error('Error al cargar detalle');
    }
    setLoadingDetail(false);
  };

  // Stats
  const totalCash = closings.reduce((acc, c) => acc + parseFloat(c.totalCash), 0);
  const totalCredit = closings.reduce((acc, c) => acc + parseFloat(c.totalCredit), 0);
  const totalSales = closings.reduce((acc, c) => acc + parseFloat(c.totalSales), 0);
  const totalCollections = closings.reduce((acc, c) => acc + parseFloat(c.totalCollections), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cierre de Caja</h1>
          <p className="text-sm text-gray-500 mt-1">Control de ventas por período y vendedor</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> Generar Cierre
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Banknote className="text-white" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Efectivo</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalCash.toFixed(2))}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <CreditCard className="text-white" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Crédito</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(totalCredit.toFixed(2))}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <DollarSign className="text-white" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Total Ventas</p>
              <p className="text-lg font-bold text-violet-600">{formatCurrency(totalSales.toFixed(2))}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <TrendingUp className="text-white" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Cobros</p>
              <p className="text-lg font-bold text-amber-600">{formatCurrency(totalCollections.toFixed(2))}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <select value={filterWarehouse} onChange={e => { setFilterWarehouse(e.target.value); setPage(1); }} className="input-field">
              <option value="">Todos los almacenes</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : closings.length === 0 ? (
        <div className="text-center py-16 text-gray-400 glass-card">
          <Lock size={40} className="mx-auto mb-3 opacity-40" />
          <p>No hay cierres de caja registrados</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 mx-auto">
            <Plus size={16} /> Generar Primer Cierre
          </button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Vendedor</th>
                <th>Almacén</th>
                <th>Efectivo</th>
                <th>Crédito</th>
                <th>Total Ventas</th>
                <th>Cobros</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {closings.map(closing => (
                <tr key={closing.id}>
                  <td className="font-medium flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    {formatDate(closing.date)}
                  </td>
                  <td>{closing.userName}</td>
                  <td>
                    <span className="flex items-center gap-1 text-sm">
                      <Building2 size={12} className="text-gray-400" /> {closing.warehouseName}
                    </span>
                  </td>
                  <td className="text-emerald-600 font-semibold">{formatCurrency(closing.totalCash)}</td>
                  <td className="text-blue-600 font-semibold">{formatCurrency(closing.totalCredit)}</td>
                  <td className="text-violet-600 font-bold">{formatCurrency(closing.totalSales)}</td>
                  <td className="text-amber-600 font-semibold">{formatCurrency(closing.totalCollections)}</td>
                  <td>
                    <button onClick={() => viewDetail(closing.id)} disabled={loadingDetail} className="btn-secondary text-xs py-1.5 px-3">
                      <Eye size={12} /> Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <p className="text-xs text-gray-400">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs py-1.5 px-3">Anterior</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-xs py-1.5 px-3">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <h2 className="font-bold text-lg flex items-center gap-2"><Lock size={18} className="text-primary" /> Generar Cierre de Caja</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Almacén *</label>
                <select value={createForm.warehouseId} onChange={e => setCreateForm({...createForm, warehouseId: e.target.value})} className="input-field">
                  <option value="">Seleccionar almacén</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                <input type="date" value={createForm.date} onChange={e => setCreateForm({...createForm, date: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={createForm.notes} onChange={e => setCreateForm({...createForm, notes: e.target.value})} className="input-field resize-none h-20" placeholder="Observaciones del cierre..." />
              </div>

              <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
                <strong>Nota:</strong> El cierre calculará automáticamente el total de ventas (efectivo y crédito) y cobros realizados por usted en el almacén y fecha seleccionados.
              </div>
            </div>

            <div className="p-5 border-t border-[var(--color-border)] flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleCreate} disabled={creating} className="btn-primary">
                {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lock size={14} />}
                Generar Cierre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl glass-card animate-fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] sticky top-0 bg-white/95 backdrop-blur-lg z-10">
              <div>
                <h2 className="font-bold text-lg">Detalle del Cierre</h2>
                <p className="text-sm text-gray-400">{formatDate(showDetail.date)} — {showDetail.userName} — {showDetail.warehouseName}</p>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-5">
              {/* Totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <p className="text-xs text-gray-500">Efectivo</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(showDetail.totalCash)}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl text-center">
                  <p className="text-xs text-gray-500">Crédito</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(showDetail.totalCredit)}</p>
                </div>
                <div className="p-3 bg-violet-50 rounded-xl text-center">
                  <p className="text-xs text-gray-500">Total Ventas</p>
                  <p className="text-lg font-bold text-violet-600">{formatCurrency(showDetail.totalSales)}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-center">
                  <p className="text-xs text-gray-500">Cobros</p>
                  <p className="text-lg font-bold text-amber-600">{formatCurrency(showDetail.totalCollections)}</p>
                </div>
              </div>

              {showDetail.notes && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Notas</p>
                  <p className="text-sm text-gray-700">{showDetail.notes}</p>
                </div>
              )}

              {/* Sales list */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Ventas del día</h3>
                {showDetail.sales && showDetail.sales.length > 0 ? (
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th># Venta</th>
                        <th>Tipo</th>
                        <th>Cliente</th>
                        <th>Total</th>
                        <th>Hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {showDetail.sales.map(sale => (
                        <tr key={sale.id}>
                          <td className="font-mono text-xs">{sale.saleNumber}</td>
                          <td>
                            <span className={`badge ${sale.type === 'CONTADO' ? 'badge-success' : 'badge-info'}`}>
                              {sale.type}
                            </span>
                          </td>
                          <td className="text-sm">{sale.customerName || '—'}</td>
                          <td className="font-semibold">{formatCurrency(sale.total)}</td>
                          <td className="text-xs text-gray-400">{formatDateTime(sale.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No hay ventas para este cierre</p>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-[var(--color-border)] flex justify-end">
              <button onClick={() => setShowDetail(null)} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
