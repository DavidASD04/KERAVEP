'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { warehousesApi, type Warehouse, type StockItem, type StockMovement } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Warehouse as WarehouseIcon,
  Package,
  Plus,
  Minus,
  ArrowRightLeft,
  History,
  AlertTriangle,
  Search,
  X,
  ChevronDown,
  Truck,
  MapPin,
} from 'lucide-react';

export default function AlmacenPage() {
  const { token } = useAuthStore();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [stock, setStock] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'stock' | 'movements'>('stock');
  const [searchStock, setSearchStock] = useState('');

  // Modals
  const [showAddStock, setShowAddStock] = useState(false);
  const [showRemoveStock, setShowRemoveStock] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    warehousesApi.getAll(token).then(w => {
      setWarehouses(w);
      if (w.length > 0) {
        setSelectedWarehouse(w[0].id);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedWarehouse) return;
    loadWarehouseData();
  }, [token, selectedWarehouse]);

  const loadWarehouseData = async () => {
    if (!token || !selectedWarehouse) return;
    setLoading(true);
    try {
      const [s, m] = await Promise.all([
        warehousesApi.getStock(token, selectedWarehouse),
        warehousesApi.getMovements(token, selectedWarehouse),
      ]);
      setStock(s);
      setMovements(m);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleAddStock = async () => {
    if (!token || !selectedWarehouse || !selectedProduct || !quantity) return;
    setSubmitting(true);
    try {
      await warehousesApi.addStock(token, selectedWarehouse, {
        productId: selectedProduct.productId,
        quantity: parseInt(quantity),
        notes: reason || undefined,
      });
      toast.success('Stock agregado');
      setShowAddStock(false);
      setQuantity('');
      setReason('');
      loadWarehouseData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
    setSubmitting(false);
  };

  const handleRemoveStock = async () => {
    if (!token || !selectedWarehouse || !selectedProduct || !quantity || !reason) return;
    setSubmitting(true);
    try {
      await warehousesApi.removeStock(token, selectedWarehouse, {
        productId: selectedProduct.productId,
        quantity: parseInt(quantity),
        reason,
      });
      toast.success('Stock removido');
      setShowRemoveStock(false);
      setQuantity('');
      setReason('');
      loadWarehouseData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
    setSubmitting(false);
  };

  const currentWarehouse = warehouses.find(w => w.id === selectedWarehouse);
  const filteredStock = stock.filter(s =>
    !searchStock ||
    s.productName.toLowerCase().includes(searchStock.toLowerCase()) ||
    (s.productSku || s.sku || '').toLowerCase().includes(searchStock.toLowerCase())
  );

  const totalUnits = stock.reduce((sum, s) => sum + s.quantity, 0);
  const lowStockCount = stock.filter(s => s.quantity > 0 && s.quantity <= s.minStock).length;
  const outOfStockCount = stock.filter(s => s.quantity === 0).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Almacén e Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">Control de stock y movimientos</p>
        </div>
      </div>

      {/* Warehouse selector + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Warehouse tiles */}
        {warehouses.map(w => (
          <button
            key={w.id}
            onClick={() => setSelectedWarehouse(w.id)}
            className={`glass-card p-4 text-left transition-all ${selectedWarehouse === w.id ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${w.type === 'CENTRAL' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-600'}`}>
                {w.type === 'CENTRAL' ? <WarehouseIcon size={18} /> : <Truck size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{w.name}</p>
                <span className={`badge text-[10px] ${w.type === 'CENTRAL' ? 'badge-purple' : 'badge-warning'}`}>
                  {w.type}
                </span>
              </div>
            </div>
            {w.assignedUserName && w.assignedUserName.trim() && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <MapPin size={10} /> {w.assignedUserName}
              </p>
            )}
          </button>
        ))}

        {/* Quick stats */}
        <div className="glass-card p-4 flex flex-col justify-center">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900">{totalUnits}</p>
              <p className="text-[10px] text-gray-400">Unidades</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-500">{lowStockCount}</p>
              <p className="text-[10px] text-gray-400">Stock Bajo</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-500">{outOfStockCount}</p>
              <p className="text-[10px] text-gray-400">Agotado</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-[var(--color-border)] w-fit">
        <button
          onClick={() => setTab('stock')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'stock' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Package size={14} className="inline mr-1.5" />
          Stock
        </button>
        <button
          onClick={() => setTab('movements')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'movements' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <History size={14} className="inline mr-1.5" />
          Movimientos
        </button>
      </div>

      {tab === 'stock' && (
        <>
          {/* Search + Actions */}
          <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={searchStock}
                onChange={e => setSearchStock(e.target.value)}
                className="input-field pl-9"
              />
            </div>
          </div>

          {/* Stock Table */}
          <div className="glass-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filteredStock.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Package size={40} className="mx-auto mb-3 opacity-40" />
                <p>Sin stock registrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>SKU</th>
                      <th className="text-center">Stock Actual</th>
                      <th className="text-center">Mínimo</th>
                      <th>Estado</th>
                      <th>Unidad</th>
                      <th className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.map((item) => {
                      const isLow = item.quantity > 0 && item.quantity <= item.minStock;
                      const isOut = item.quantity === 0;
                      return (
                        <tr key={item.productId}>
                          <td className="font-medium">{item.productName}</td>
                          <td className="text-gray-400 text-xs font-mono">{item.sku}</td>
                          <td className="text-center">
                            <span className={`text-lg font-bold ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-gray-900'}`}>
                              {item.quantity}
                            </span>
                          </td>
                          <td className="text-center text-gray-400">{item.minStock}</td>
                          <td>
                            {isOut ? (
                              <span className="badge badge-danger">Agotado</span>
                            ) : isLow ? (
                              <span className="badge badge-warning flex items-center gap-1 w-fit"><AlertTriangle size={10} /> Bajo</span>
                            ) : (
                              <span className="badge badge-success">Normal</span>
                            )}
                          </td>
                          <td className="text-gray-500 text-sm">{item.unit}</td>
                          <td>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => { setSelectedProduct(item); setShowAddStock(true); }}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600"
                                title="Agregar stock"
                              >
                                <Plus size={15} />
                              </button>
                              <button
                                onClick={() => { setSelectedProduct(item); setShowRemoveStock(true); }}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500"
                                title="Remover stock"
                                disabled={item.quantity === 0}
                              >
                                <Minus size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'movements' && (
        <div className="glass-card overflow-hidden">
          {movements.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <History size={40} className="mx-auto mb-3 opacity-40" />
              <p>Sin movimientos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th className="text-center">Cantidad</th>
                    <th className="text-center">Antes</th>
                    <th className="text-center">Después</th>
                    <th>Razón</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((mov) => (
                    <tr key={mov.id}>
                      <td className="text-xs text-gray-500">{formatDateTime(mov.createdAt)}</td>
                      <td className="font-medium">{mov.productName}</td>
                      <td>
                        <span className={`badge ${mov.type === 'ENTRADA' ? 'badge-success' : mov.type === 'SALIDA' ? 'badge-danger' : 'badge-info'}`}>
                          {mov.type}
                        </span>
                      </td>
                      <td className="text-center font-semibold">{mov.quantity}</td>
                      <td className="text-center text-gray-400">{mov.previousStock}</td>
                      <td className="text-center font-medium">{mov.newStock}</td>
                      <td className="text-xs text-gray-500">{mov.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStock && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-card animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <h2 className="font-bold text-lg">Agregar Stock</h2>
              <button onClick={() => { setShowAddStock(false); setQuantity(''); setReason(''); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium">{selectedProduct.productName}</p>
                <p className="text-xs text-gray-400">Stock actual: {selectedProduct.quantity}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cantidad *</label>
                <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="input-field" required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nota</label>
                <input value={reason} onChange={e => setReason(e.target.value)} className="input-field" placeholder="Opcional" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowAddStock(false); setQuantity(''); setReason(''); }} className="btn-secondary">Cancelar</button>
                <button onClick={handleAddStock} disabled={submitting || !quantity} className="btn-primary">
                  {submitting ? 'Guardando...' : 'Agregar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Stock Modal */}
      {showRemoveStock && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-card animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <h2 className="font-bold text-lg">Remover Stock</h2>
              <button onClick={() => { setShowRemoveStock(false); setQuantity(''); setReason(''); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium">{selectedProduct.productName}</p>
                <p className="text-xs text-gray-400">Stock actual: {selectedProduct.quantity}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cantidad *</label>
                <input type="number" min="1" max={selectedProduct.quantity} value={quantity} onChange={e => setQuantity(e.target.value)} className="input-field" required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Razón *</label>
                <input value={reason} onChange={e => setReason(e.target.value)} className="input-field" placeholder="Motivo de la remoción" required />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowRemoveStock(false); setQuantity(''); setReason(''); }} className="btn-secondary">Cancelar</button>
                <button onClick={handleRemoveStock} disabled={submitting || !quantity || !reason} className="btn-danger">
                  {submitting ? 'Procesando...' : 'Remover'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
