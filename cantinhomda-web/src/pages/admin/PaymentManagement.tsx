import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import {
    CheckCircle,
    Clock,
    RefreshCw,
    Search,
    DollarSign,
    Trash2,
    AlertTriangle,
    ShieldAlert,
    MoreVertical,
    Receipt,
    Phone
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Modal } from '../../components/Modal';

// --- Interfaces ---

interface ClubPaymentStatus {
    id: string;
    name: string;
    status: 'PENDING_APPROVAL' | 'TRIAL' | 'ACTIVE' | 'PAYMENT_WARNING' | 'SUSPENDED' | 'BLOCKED' | 'INACTIVE';
    subscriptionPlan: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | null;
    nextPaymentDue: string | null;
    lastPaymentDate: string | null;
    trialEndsAt: string | null;
    director?: {
        name: string;
        phone: string;
    };
}

interface Payment {
    id: string;
    clubId: string;
    type: 'SUBSCRIPTION' | 'MEMBER_ADDITION' | 'RENEWAL';
    amount: number;
    status: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'REFUNDED';
    paymentMethod: string;
    description: string;
    metadata?: any;
    created_at: string;
    club?: { name: string };
    confirmedByUser?: { name: string };
}

// --- Status Badge Component ---
const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        ACTIVE: 'bg-green-100 text-green-700 border-green-200',
        TRIAL: 'bg-blue-100 text-blue-700 border-blue-200',
        PAYMENT_WARNING: 'bg-orange-100 text-orange-700 border-orange-200',
        SUSPENDED: 'bg-red-100 text-red-700 border-red-200',
        BLOCKED: 'bg-red-900 text-white border-red-800',
        INACTIVE: 'bg-slate-100 text-slate-700 border-slate-200',
        PENDING_APPROVAL: 'bg-purple-100 text-purple-700 border-purple-200'
    };

    const labels: Record<string, string> = {
        ACTIVE: 'Em Dia',
        TRIAL: 'Período de Teste',
        PAYMENT_WARNING: 'Aviso de Pagamento',
        SUSPENDED: 'Suspenso',
        BLOCKED: 'Bloqueado',
        INACTIVE: 'Inativo',
        PENDING_APPROVAL: 'Aprovação Pendente'
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
            {labels[status] || status}
        </span>
    );
};

export function PaymentManagement() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'CLUBS' | 'PAYMENTS'>('CLUBS');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Modals
    const [reactivateModalOpen, setReactivateModalOpen] = useState(false);
    const [selectedClub, setSelectedClub] = useState<ClubPaymentStatus | null>(null);
    const [reactivatePlan, setReactivatePlan] = useState<'MONTHLY' | 'QUARTERLY' | 'ANNUAL'>('MONTHLY');

    // --- Queries ---

    // 1. Status dos Clubes (Assinaturas)
    const { data: clubsStatus = [], isLoading: loadingClubs } = useQuery<ClubPaymentStatus[]>({
        queryKey: ['admin-clubs-payment-status'],
        queryFn: async () => (await api.get('/clubs/admin/payment-status')).data,
        enabled: user?.role === 'MASTER'
    });

    // 2. Pagamentos Pendentes (Avulsos/PIX)
    const { data: pendingPayments = [], isLoading: loadingPayments } = useQuery<Payment[]>({
        queryKey: ['pending-payments'],
        queryFn: async () => (await api.get('/subscriptions/payments/pending')).data,
        enabled: user?.role === 'MASTER'
    });

    // 3. Métricas (Calculadas no front por enquanto ou endpoint específico)
    const metrics = {
        active: clubsStatus.filter(c => c.status === 'ACTIVE' || c.status === 'TRIAL').length,
        warning: clubsStatus.filter(c => c.status === 'PAYMENT_WARNING').length,
        suspended: clubsStatus.filter(c => ['SUSPENDED', 'BLOCKED'].includes(c.status)).length,
        monthlyRevenue: clubsStatus.filter(c => c.status === 'ACTIVE').length * 50 // Est. R$50/mês
    };

    // --- Mutations ---

    const reactivateMutation = useMutation({
        mutationFn: async () => {
            if (!selectedClub) return;
            return api.post(`/clubs/${selectedClub.id}/reactivate`, { subscriptionPlan: reactivatePlan });
        },
        onSuccess: () => {
            toast.success('Clube reativado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['admin-clubs-payment-status'] });
            setReactivateModalOpen(false);
        },
        onError: (err: any) => toast.error('Erro ao reativar: ' + err.response?.data?.message)
    });

    const runCheckMutation = useMutation({
        mutationFn: async () => api.post('/clubs/admin/check-payments'),
        onSuccess: (res: any) => {
            toast.success(`Verificação concluída. ${res.data.suspendedCount} suspensos, ${res.data.warningsSent} avisos.`);
            queryClient.invalidateQueries({ queryKey: ['admin-clubs-payment-status'] });
        }
    });

    const confirmPaymentMutation = useMutation({
        mutationFn: async (id: string) => api.patch(`/subscriptions/payments/${id}/confirm`),
        onSuccess: () => {
            toast.success('Pagamento confirmado!');
            queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
        }
    });

    const deletePaymentMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/subscriptions/payments/${id}`),
        onSuccess: () => {
            toast.success('Pagamento removido.');
            queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
        }
    });

    // --- Helpers ---

    const filteredClubs = clubsStatus.filter(club => {
        const matchesSearch = club.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = statusFilter === 'ALL' || club.status === statusFilter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6">
            {/* Header com Métricas */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gestão Financeira</h1>
                    <p className="text-slate-500">Controle de assinaturas, inadimplência e pagamentos.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => runCheckMutation.mutate()}
                        disabled={runCheckMutation.isPending}
                        className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${runCheckMutation.isPending ? 'animate-spin' : ''}`} />
                        Verificar Vencimentos
                    </button>
                </div>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Clubes Ativos</p>
                        <h3 className="text-2xl font-bold text-slate-800">{metrics.active}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Em Aviso</p>
                        <h3 className="text-2xl font-bold text-slate-800">{metrics.warning}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Suspensos</p>
                        <h3 className="text-2xl font-bold text-slate-800">{metrics.suspended}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Receita Estimada (Mês)</p>
                        <h3 className="text-2xl font-bold text-slate-800">R$ {metrics.monthlyRevenue.toFixed(2)}</h3>
                    </div>
                </div>
            </div>

            {/* Tabs e Filtros */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center p-2 gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('CLUBS')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none ${activeTab === 'CLUBS' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Assinaturas de Clubes
                        </button>
                        <button
                            onClick={() => setActiveTab('PAYMENTS')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none ${activeTab === 'PAYMENTS' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Pagamentos Avulsos {pendingPayments.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingPayments.length}</span>}
                        </button>
                    </div>

                    {activeTab === 'CLUBS' && (
                        <div className="flex gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar clube..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ALL">Todos Status</option>
                                <option value="ACTIVE">Ativos</option>
                                <option value="PAYMENT_WARNING">Em Aviso</option>
                                <option value="SUSPENDED">Suspensos</option>
                                <option value="TRIAL">Em Teste</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Content - CLUBS TAB */}
                {activeTab === 'CLUBS' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Clube</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Plano</th>
                                    <th className="px-6 py-4">Próx. Vencimento</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loadingClubs ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Carregando clubes...</td></tr>
                                ) : filteredClubs.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum clube encontrado.</td></tr>
                                ) : (
                                    filteredClubs.map(club => (
                                        <tr key={club.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800">{club.name}</div>
                                                {club.director && (
                                                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <span>{club.director.name}</span>
                                                        {club.director.phone && (
                                                            <span className="flex items-center gap-0.5 text-blue-400">
                                                                • <Phone className="w-3 h-3" /> {club.director.phone}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={club.status} />
                                            </td>
                                            <td className="px-6 py-4">
                                                {club.subscriptionPlan ? (
                                                    <span className="font-medium text-slate-700">
                                                        {club.subscriptionPlan === 'MONTHLY' ? 'Mensal' :
                                                            club.subscriptionPlan === 'QUARTERLY' ? 'Trimestral' : 'Anual'}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {club.nextPaymentDue ? (
                                                    <div className={`flex items-center gap-1.5 font-medium ${new Date(club.nextPaymentDue) < new Date() ? 'text-red-500' : 'text-slate-600'
                                                        }`}>
                                                        <Clock className="w-4 h-4" />
                                                        {format(new Date(club.nextPaymentDue), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                                        {new Date(club.nextPaymentDue) < new Date() && (
                                                            <span className="text-xs bg-red-100 text-red-600 px-1.5 rounded">Vencido</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {(['SUSPENDED', 'BLOCKED', 'PAYMENT_WARNING'].includes(club.status)) && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedClub(club);
                                                                setReactivateModalOpen(true);
                                                            }}
                                                            className="text-xs font-bold bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
                                                        >
                                                            Reativar / Pagar
                                                        </button>
                                                    )}
                                                    <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Content - PAYMENTS TAB */}
                {activeTab === 'PAYMENTS' && (
                    <div>
                        <div className="p-4 bg-slate-50 border-b border-slate-200">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <Receipt className="w-4 h-4" /> Pagamentos Pendentes (PIX/Transferência)
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Confirme os pagamentos manuais para liberar o acesso ou créditos.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Clube</th>
                                        <th className="px-6 py-4">Descrição</th>
                                        <th className="px-6 py-4">Valor</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loadingPayments ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">Carregando pagamentos...</td></tr>
                                    ) : pendingPayments.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum pagamento pendente.</td></tr>
                                    ) : (
                                        pendingPayments.map(payment => (
                                            <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 text-slate-500">
                                                    {format(new Date(payment.created_at || new Date()), "dd/MMM HH:mm", { locale: ptBR })}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-700">
                                                    {payment.club?.name || 'Clube removido'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>{payment.description}</div>
                                                    <div className="text-xs text-slate-400">{payment.paymentMethod}</div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-800">
                                                    R$ {payment.amount.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                if (confirm('Confirma o recebimento deste pagamento?')) {
                                                                    confirmPaymentMutation.mutate(payment.id);
                                                                }
                                                            }}
                                                            className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded border border-green-200 hover:bg-green-100 text-xs font-bold"
                                                        >
                                                            <CheckCircle className="w-3 h-3" /> Confirmar
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm('Remover este registro de pagamento?')) {
                                                                    deletePaymentMutation.mutate(payment.id);
                                                                }
                                                            }}
                                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Reativação */}
            <Modal
                isOpen={reactivateModalOpen}
                onClose={() => setReactivateModalOpen(false)}
                title="Reativar Clube / Registrar Pagamento"
            >
                <div className="space-y-4">
                    <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
                        <p>Ao confirmar, o status do clube mudará para <strong>ACTIVE</strong> e a data de vencimento será atualizada conforme o plano selecionado.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Clube</label>
                        <div className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-bold">
                            {selectedClub?.name}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Plano Renovado</label>
                        <select
                            value={reactivatePlan}
                            onChange={(e) => setReactivatePlan(e.target.value as any)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="MONTHLY">Mensal</option>
                            <option value="QUARTERLY">Trimestral</option>
                            <option value="ANNUAL">Anual</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                        <button
                            onClick={() => setReactivateModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => reactivateMutation.mutate()}
                            disabled={reactivateMutation.isPending}
                            className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-70 flex items-center gap-2"
                        >
                            {reactivateMutation.isPending ? 'Processando...' : 'Confirmar Pagamento e Reativar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
