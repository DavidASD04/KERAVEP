'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { productsApi, categoriesApi, type Product, type Category } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Package, Plus, Search, Edit2, Trash2, X, Filter } from 'lucide-react';

export default function ProductosPage() {
  const { token } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: '', sku: '', description: '', categoryId: '', type: 'TERMINADO', price: '', cost: '', minStock: '10', unit: 'unidad',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (search) params.search = search;
      if (filterCategory) params.categoryId = filterCategory;
      if (filterType) params.type = filterType;
      const res = await productsApi.getAll(token, params);
      setProducts(res.data);
      setTotal(res.total);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (!token) return;
    categoriesApi.getAll(token).then(setCategories).catch(() => {});
  }, [token]);

  useEffect(() => { loadProducts(); }, [token, page, search, filterCategory, filterType]);

  const openNew = () => {
    setEditingProduct(null);
    setForm({ name: '', sku: '', description: '', categoryId: categories[0]?.id || '', type: 'TERMINADO', price: '', cost: '', minStock: '10', unit: 'unidad' });
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name, sku: p.sku, description: p.description || '', categoryId: p.categoryId,
      type: p.type, price: p.price, cost: p.cost, minStock: String(p.minStock), unit: p.unit,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      const data = { ...form, minStock: parseInt(form.minStock), type: form.type as Product['type'] };
      if (editingProduct) {
        await productsApi.update(token, editingProduct.id, data);
        toast.success('Producto actualizado');
      } else {
        await productsApi.create(token, data);
        toast.success('Producto creado');
      }
      setShowForm(false);
      loadProducts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
    setSubmitting(false);
  };

  const deleteProduct = async (id: string) => {
    if (!token || !confirm('¿Eliminar este producto?')) return;
    try {
      await productsApi.delete(token, id);
      toast.success('Producto eliminado');
      loadProducts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const typeLabels: Record<string, string> = { TERMINADO: 'Terminado', MATERIA_PRIMA: 'Materia Prima', SEMI_TERMINADO: 'Semi-terminado' };
  const typeColors: Record<string, string> = { TERMINADO: 'badge-success', MATERIA_PRIMA: 'badge-info', SEMI_TERMINADO: 'badge-warning' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500 mt-1">Catálogo de productos y materias primas</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Nuevo Producto</button>
      </div>

      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" placeholder="Buscar por nombre, SKU..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-field pl-9" />
        </div>
        <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} className="input-field w-auto">
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className="input-field w-auto">
          <option value="">Todos los tipos</option>
          <option value="TERMINADO">Terminado</option>
          <option value="MATERIA_PRIMA">Materia Prima</option>
          <option value="SEMI_TERMINADO">Semi-terminado</option>
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-40" />
            <p>No hay productos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th className="text-right">Precio</th>
                  <th className="text-right">Costo</th>
                  <th className="text-center">Min. Stock</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}</td>
                    <td className="text-gray-400 text-xs font-mono">{p.sku}</td>
                    <td><span className="badge badge-purple">{p.categoryName}</span></td>
                    <td><span className={`badge ${typeColors[p.type]}`}>{typeLabels[p.type]}</span></td>
                    <td className="text-right font-semibold">{formatCurrency(p.price)}</td>
                    <td className="text-right text-gray-500">{formatCurrency(p.cost)}</td>
                    <td className="text-center text-gray-500">{p.minStock}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary" title="Editar">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500" title="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 15 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
            <p className="text-xs text-gray-500">{total} productos total</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Anterior</button>
              <button onClick={() => setPage(p => p+1)} disabled={page*15>=total} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md glass-card animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <h2 className="font-bold text-lg">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field text-sm" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">SKU *</label>
                  <input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="input-field text-sm" required />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Unidad</label>
                  <input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="input-field text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Categoría *</label>
                  <select value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} className="input-field text-sm" required>
                    <option value="">Seleccionar</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo *</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="input-field text-sm">
                    <option value="TERMINADO">Terminado</option>
                    <option value="MATERIA_PRIMA">Materia Prima</option>
                    <option value="SEMI_TERMINADO">Semi-terminado</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Precio</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Costo</label>
                  <input type="number" step="0.01" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Min. Stock</label>
                  <input type="number" value={form.minStock} onChange={e => setForm({...form, minStock: e.target.value})} className="input-field text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="input-field text-sm" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
