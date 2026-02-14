'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { accountsApi, type AccountReceivable, type AccountReceivableDetail, type AgingReport } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  CreditCard,
  Search,
  Eye,
  DollarSign,
  X,
  Clock,
  AlertTriangle,
  TrendingDown,
  Receipt,
  CheckCircle,
} from 'lucide-react';

export default function CuentasPage() {
  const { token } = useAuthStore();
  const [accounts, setAccounts] = useState<AccountReceivable[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [agingReport, setAgingReport] = useState<AgingReport | null>(null);

  // Modals
  const [showDetail, setShowDetail] = useState<AccountReceivableDetail | null>(null);
  const [showPayment, setShowPayment] = useState<AccountReceivable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [paymentRef, setPaymentRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAccounts = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      const [res, aging] = await Promise.all([
        accountsApi.getAll(token, params),
        accountsApi.getAgingReport(token),
      ]);
      setAccounts(res.data);
      setTotal(res.total);
      setAgingReport(aging);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadAccounts(); }, [token, page, search, filterStatus]);

  const viewDetail = async (id: string) => {
    if (!token) return;
    try {
      const detail = await accountsApi.getById(token, id);
      setShowDetail(detail);
    } catch { toast.error('Error al cargar detalle'); }
  };

  const handlePayment = async () => {
    if (!token || !showPayment || !paymentAmount) return;
    setSubmitting(true);
    try {
      await accountsApi.registerPayment(token, showPayment.id, {
        amount: paymentAmount,
        method: paymentMethod,
        reference: paymentRef || undefined,
      });
      toast.success('Pago registrado');
      setShowPayment(null);
      setPaymentAmount('');
      setPaymentRef('');
      loadAccounts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
    setSubmitting(false);
  };

  const statusLabels: Record<string, string> = {
    PENDIENTE: 'Pendiente', PARCIAL: 'Parcial', PAGADA: 'Pagada', VENCIDA: 'Vencida'
  };
  const statusColors: Record<string, string> = {
    PENDIENTE: 'badge-warning', PARCIAL: 'badge-info', PAGADA: 'badge-success', VENCIDA: 'badge-danger'
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cuentas por Cobrar</h1>
        <p className="text-sm text-gray-500 mt-1">Seguimiento de deudas y pagos</p>
      </div>

      {/* Aging Report Cards */}
      {agingReport && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="glass-card p-4 text-center">
            <p className="text-[10px] text-gray-400 uppercase font-medium">Total Pendiente</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(agingReport.totalPending)}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-[10px] text-emerald-500 uppercase font-medium">Vigente</p>
            <p className="text-lg font-bold text-emerald-600 mt-1">{formatCurrency(agingReport.current?.total || '0')}</p>
            <p className="text-[10px] text-gray-400">{agingReport.current?.count || 0} cuentas</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-[10px] text-amber-500 uppercase font-medium">1-30 días</p>
            <p className="text-lg font-bold text-amber-600 mt-1">{formatCurrency(agingReport.days1to30?.total || '0')}</p>
            <p className="text-[10px] text-gray-400">{agingReport.days1to30?.count || 0} cuentas</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-[10px] text-orange-500 uppercase font-medium">31-60 días</p>
            <p className="text-lg font-bold text-orange-600 mt-1">{formatCurrency(agingReport.days31to60?.total || '0')}</p>
            <p className="text-[10px] text-gray-400">{agingReport.days31to60?.count || 0} cuentas</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-[10px] text-red-500 uppercase font-medium">61-90 días</p>
            <p className="text-lg font-bold text-red-600 mt-1">{formatCurrency(agingReport.days61to90?.total || '0')}</p>
            <p className="text-[10px] text-gray-400">{agingReport.days61to90?.count || 0} cuentas</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-[10px] text-red-700 uppercase font-medium">+90 días</p>
            <p className="text-lg font-bold text-red-700 mt-1">{formatCurrency(agingReport.over90?.total || '0')}</p>
            <p className="text-[10px] text-gray-400">{agingReport.over90?.count || 0} cuentas</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" placeholder="Buscar por venta, cliente..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-field pl-9" />
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="input-field w-auto">
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="PARCIAL">Parcial</option>
          <option value="PAGADA">Pagada</option>
          <option value="VENCIDA">Vencida</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CreditCard size={40} className="mx-auto mb-3 opacity-40" />
            <p>No hay cuentas por cobrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>N° Venta</th>
                  <th>Cliente</th>
                  <th className="text-right">Monto Total</th>
                  <th className="text-right">Pagado</th>
                  <th className="text-right">Saldo</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(acc => {
                  const isOverdue = new Date(acc.dueDate) < new Date() && acc.status !== 'PAGADA';
                  return (
                    <tr key={acc.id}>
                      <td className="font-medium text-primary">{acc.saleNumber}</td>
                      <td className="font-medium">{acc.customerName}</td>
                      <td className="text-right">{formatCurrency(acc.totalAmount)}</td>
                      <td className="text-right text-emerald-600">{formatCurrency(acc.paidAmount)}</td>
                      <td className="text-right font-bold text-red-500">{formatCurrency(acc.balance)}</td>
                      <td className={`text-sm ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                        {isOverdue && <AlertTriangle size={12} className="inline mr-1" />}
                        {formatDate(acc.dueDate)}
                      </td>
                      <td>
                        <span className={`badge ${statusColors[acc.status]}`}>
                          {statusLabels[acc.status]}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => viewDetail(acc.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary" title="Ver detalle">
                            <Eye size={15} />
                          </button>
                          {acc.status !== 'PAGADA' && (
                            <button onClick={() => { setShowPayment(acc); setPaymentAmount(acc.balance); }} className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600" title="Registrar pago">
                              <DollarSign size={15} />
                            </button>
                          )}
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
            <p className="text-xs text-gray-500">{total} cuentas total</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Anterior</button>
              <button onClick={() => setPage(p => p+1)} disabled={page*15>=total} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <div>
                <h2 className="font-bold text-lg">Cuenta {showDetail.saleNumber}</h2>
                <p className="text-xs text-gray-400">{showDetail.customerName}</p>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] text-gray-400">Total</p>
                  <p className="text-sm font-bold">{formatCurrency(showDetail.totalAmount)}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <p className="text-[10px] text-emerald-600">Pagado</p>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(showDetail.paidAmount)}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl">
                  <p className="text-[10px] text-red-600">Saldo</p>
                  <p className="text-sm font-bold text-red-600">{formatCurrency(showDetail.balance)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Vencimiento</span>
                <span className="font-medium">{formatDate(showDetail.dueDate)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Estado</span>
                <span className={`badge ${statusColors[showDetail.status]}`}>{statusLabels[showDetail.status]}</span>
              </div>

              {showDetail.payments && showDetail.payments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Historial de Pagos</h3>
                  <div className="space-y-2">
                    {showDetail.payments.map(pay => (
                      <div key={pay.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-emerald-700 flex items-center gap-1">
                            <CheckCircle size={12} />
                            {formatCurrency(pay.amount)}
                          </p>
                          <p className="text-[10px] text-gray-400">{formatDateTime(pay.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <span className="badge badge-success text-[10px]">{pay.method}</span>
                          {pay.reference && <p className="text-[10px] text-gray-400 mt-0.5">{pay.reference}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-[var(--color-border)] flex justify-end">
              <button onClick={() => setShowDetail(null)} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-card animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <h2 className="font-bold text-lg flex items-center gap-2"><DollarSign size={18} className="text-emerald-500" /> Registrar Pago</h2>
              <button onClick={() => { setShowPayment(null); setPaymentAmount(''); setPaymentRef(''); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium">{showPayment.saleNumber} - {showPayment.customerName}</p>
                <p className="text-xs text-gray-400">Saldo pendiente: <span className="font-bold text-red-500">{formatCurrency(showPayment.balance)}</span></p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Monto del Pago *</label>
                <input type="number" step="0.01" max={parseFloat(showPayment.balance)} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="input-field" required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Método de Pago</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input-field">
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Referencia</label>
                <input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} className="input-field" placeholder="Número de transferencia, cheque, etc." />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowPayment(null); setPaymentAmount(''); setPaymentRef(''); }} className="btn-secondary">Cancelar</button>
                <button onClick={handlePayment} disabled={submitting || !paymentAmount} className="btn-primary">
                  {submitting ? 'Procesando...' : 'Registrar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
