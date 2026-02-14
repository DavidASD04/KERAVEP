'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { customersApi, type Customer, type CreditStatus, type Sale } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Search,
  Eye,
  Edit2,
  CreditCard,
  History,
  X,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
} from 'lucide-react';

export default function ClientesPage() {
  const { token } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showCredit, setShowCredit] = useState<CreditStatus | null>(null);
  const [showHistory, setShowHistory] = useState<{ customer: Customer; sales: Sale[] } | null>(null);

  // Form
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', address: '', creditLimit: '5000', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadCustomers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (search) params.search = search;
      const res = await customersApi.getAll(token, params);
      setCustomers(res.data);
      setTotal(res.total);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadCustomers(); }, [token, page, search]);

  const openNewCustomer = () => {
    setEditingCustomer(null);
    setForm({ firstName: '', lastName: '', email: '', phone: '', address: '', creditLimit: '5000', notes: '' });
    setShowForm(true);
  };

  const openEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      creditLimit: customer.creditLimit,
      notes: customer.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      if (editingCustomer) {
        await customersApi.update(token, editingCustomer.id, form);
        toast.success('Cliente actualizado');
      } else {
        await customersApi.create(token, form);
        toast.success('Cliente creado');
      }
      setShowForm(false);
      loadCustomers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
    setSubmitting(false);
  };

  const viewCredit = async (customerId: string) => {
    if (!token) return;
    try {
      const credit = await customersApi.getCreditStatus(token, customerId);
      setShowCredit(credit);
    } catch {
      toast.error('Error al cargar crédito');
    }
  };

  const viewHistory = async (customer: Customer) => {
    if (!token) return;
    try {
      const sales = await customersApi.getPurchaseHistory(token, customer.id);
      setShowHistory({ customer, sales });
    } catch {
      toast.error('Error al cargar historial');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión y seguimiento de clientes</p>
        </div>
        <button onClick={openNewCustomer} className="btn-primary">
          <Plus size={16} /> Nuevo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre, email, teléfono..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-40" />
            <p>No hay clientes registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th className="text-right">Límite Crédito</th>
                  <th className="text-right">Deuda Actual</th>
                  <th>Estado</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const debtPct = parseFloat(c.creditLimit) > 0 ? (parseFloat(c.currentDebt) / parseFloat(c.creditLimit)) * 100 : 0;
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                            {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                            {c.address && <p className="text-xs text-gray-400">{c.address}</p>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-xs space-y-0.5">
                          {c.phone && <p className="flex items-center gap-1 text-gray-500"><Phone size={10} />{c.phone}</p>}
                          {c.email && <p className="flex items-center gap-1 text-gray-500"><Mail size={10} />{c.email}</p>}
                        </div>
                      </td>
                      <td className="text-right font-medium">{formatCurrency(c.creditLimit)}</td>
                      <td className="text-right">
                        <span className={`font-semibold ${debtPct > 80 ? 'text-red-500' : debtPct > 50 ? 'text-amber-500' : 'text-gray-900'}`}>
                          {formatCurrency(c.currentDebt)}
                        </span>
                        {debtPct > 0 && (
                          <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1">
                            <div
                              className={`h-full rounded-full transition-all ${debtPct > 80 ? 'bg-red-400' : debtPct > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(debtPct, 100)}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {c.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditCustomer(c)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary" title="Editar">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => viewCredit(c.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-amber-500" title="Estado de crédito">
                            <CreditCard size={15} />
                          </button>
                          <button onClick={() => viewHistory(c)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-secondary" title="Historial">
                            <History size={15} />
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

        {total > 15 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
            <p className="text-xs text-gray-500">{total} clientes total</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Anterior</button>
              <button onClick={() => setPage(p => p+1)} disabled={page*15>=total} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <h2 className="font-bold text-lg">{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
                  <input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="input-field text-sm" required />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Apellido *</label>
                  <input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="input-field text-sm" required />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Teléfono</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Límite Crédito</label>
                  <input type="number" value={form.creditLimit} onChange={e => setForm({...form, creditLimit: e.target.value})} className="input-field text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Dirección</label>
                <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input-field text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notas</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="input-field text-sm" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Guardando...' : editingCustomer ? 'Actualizar' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credit Status Modal */}
      {showCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <h2 className="font-bold text-lg flex items-center gap-2"><CreditCard size={18} /> Estado de Crédito</h2>
              <button onClick={() => setShowCredit(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">{showCredit.customer.firstName} {showCredit.customer.lastName}</p>
                <div className="flex items-center justify-center gap-8 mt-3">
                  <div>
                    <p className="text-xs text-gray-400">Deuda Total</p>
                    <p className="text-xl font-bold text-red-500">{formatCurrency(showCredit.totalDebt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Crédito Disponible</p>
                    <p className="text-xl font-bold text-emerald-500">{formatCurrency(showCredit.availableCredit)}</p>
                  </div>
                </div>
              </div>
              {showCredit.pendingAccounts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Cuentas Pendientes</h3>
                  <div className="space-y-2">
                    {showCredit.pendingAccounts.map(acc => (
                      <div key={acc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium">{acc.saleNumber}</p>
                          <p className="text-xs text-gray-400">Vence: {formatDate(acc.dueDate)}</p>
                        </div>
                        <span className="text-sm font-bold text-red-500">{formatCurrency(acc.balance)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-[var(--color-border)] flex justify-end">
              <button onClick={() => setShowCredit(null)} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-card animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <div>
                <h2 className="font-bold text-lg">Historial de Compras</h2>
                <p className="text-xs text-gray-400">{showHistory.customer.firstName} {showHistory.customer.lastName}</p>
              </div>
              <button onClick={() => setShowHistory(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 max-h-[400px] overflow-y-auto">
              {showHistory.sales.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Sin compras registradas</p>
              ) : (
                <div className="space-y-2">
                  {showHistory.sales.map(sale => (
                    <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium">{sale.saleNumber}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(sale.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`badge ${sale.type === 'CONTADO' ? 'badge-success' : 'badge-warning'} mb-1`}>
                          {sale.type}
                        </span>
                        <p className="text-sm font-bold">{formatCurrency(sale.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-[var(--color-border)] flex justify-end">
              <button onClick={() => setShowHistory(null)} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
