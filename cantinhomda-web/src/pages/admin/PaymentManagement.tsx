import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
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
    Phone,
    TrendingUp,
    CreditCard,
    Filter,
    User
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    _count?: {
        users: number;
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
const StatusBadge = ({ club }: { club: ClubPaymentStatus }) => {
    let effectiveStatus = club.status;
    if (club.status === 'ACTIVE' && !club.lastPaymentDate) {
        effectiveStatus = 'NO_PAYMENT' as any;
    }

    const styles: Record<string, string> = {
        ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        NO_PAYMENT: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        TRIAL: 'bg-blue-100 text-blue-700 border-blue-200',
        PAYMENT_WARNING: 'bg-orange-100 text-orange-700 border-orange-200',
        SUSPENDED: 'bg-rose-100 text-rose-700 border-rose-200',
        BLOCKED: 'bg-slate-900 text-white border-slate-800',
        INACTIVE: 'bg-slate-100 text-slate-700 border-slate-200',
        PENDING_APPROVAL: 'bg-purple-100 text-purple-700 border-purple-200'
    };

    const labels: Record<string, string> = {
        ACTIVE: 'Em Dia',
        NO_PAYMENT: 'Aguardando Pagto.',
        TRIAL: 'Período de Teste',
        PAYMENT_WARNING: 'Aviso de Pagamento',
        SUSPENDED: 'Suspenso',
        BLOCKED: 'Bloqueado',
        INACTIVE: 'Inativo',
        PENDING_APPROVAL: 'Aprovação Pendente'
    };

    return (
        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[effectiveStatus] || 'bg-gray-100 text-gray-700'}`}>
            {labels[effectiveStatus] || effectiveStatus}
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

    const { data: clubsStatus = [], isLoading: loadingClubs } = useQuery<ClubPaymentStatus[]>({
        queryKey: ['admin-clubs-payment-status'],
        queryFn: async () => (await api.get('/clubs/admin/payment-status')).data,
        enabled: user?.role === 'MASTER'
    });

    const { data: pendingPayments = [], isLoading: loadingPayments } = useQuery<Payment[]>({
        queryKey: ['pending-payments'],
        queryFn: async () => (await api.get('/subscriptions/payments/pending')).data,
        enabled: user?.role === 'MASTER'
    });

    const metrics = {
        active: clubsStatus.filter(c => c.status === 'ACTIVE' || c.status === 'TRIAL').length,
        warning: clubsStatus.filter(c => c.status === 'PAYMENT_WARNING').length,
        suspended: clubsStatus.filter(c => ['SUSPENDED', 'BLOCKED'].includes(c.status)).length,
        monthlyRevenue: clubsStatus
            .filter(c => c.status === 'ACTIVE' && c.lastPaymentDate)
            .reduce((acc, curr) => acc + ((curr._count?.users || 0) * 2.00), 0)
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
        <div className="space-y-8 pb-12">
            {/* Premium Header */}
            <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl shadow-slate-900/20">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] -mr-64 -mt-64" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-[80px] -ml-32 -mb-32" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-emerald-500/20 text-emerald-400 p-4 rounded-3xl backdrop-blur-md border border-emerald-500/10">
                                <DollarSign className="w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tighter">Financeiro</h1>
                                <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] mt-1">Gestão de Receitas e Assinaturas</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-4 rounded-[2.5rem]">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Receita Est. Mês</p>
                                <p className="text-2xl font-black text-emerald-400">R$ {metrics.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-4 rounded-[2.5rem]">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Inadimplência</p>
                                <p className="text-2xl font-black text-rose-400">{metrics.suspended + metrics.warning}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => runCheckMutation.mutate()}
                        disabled={runCheckMutation.isPending}
                        className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black transition-all hover:scale-105 active:scale-95 flex items-center gap-3 text-xs uppercase tracking-widest shadow-xl shadow-white/10"
                    >
                        <RefreshCw className={`w-4 h-4 ${runCheckMutation.isPending ? 'animate-spin' : ''}`} />
                        Verificar Vencimentos
                    </button>
                </div>
            </div>

            {/* Quick Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Clubes Ativos', val: metrics.active, icon: CheckCircle, color: 'emerald' },
                    { label: 'Em Aviso', val: metrics.warning, icon: AlertTriangle, color: 'amber' },
                    { label: 'Suspensos', val: metrics.suspended, icon: ShieldAlert, color: 'rose' },
                    { label: 'Aguard. PIX', val: pendingPayments.length, icon: Clock, color: 'blue' }
                ].map((m, idx) => (
                    <motion.div
                        key={m.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="glass-card p-6 rounded-[2rem] premium-shadow flex items-center gap-5"
                    >
                        <div className={`p-4 rounded-2xl bg-${m.color}-50 text-${m.color}-600`}>
                            <m.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
                            <h3 className="text-2xl font-black text-slate-800">{m.val}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Tabs & List Section */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex bg-slate-100 p-1.5 rounded-[2rem] w-full md:w-auto">
                        <button
                            onClick={() => setActiveTab('CLUBS')}
                            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'CLUBS' ? 'bg-white text-blue-600 shadow-xl shadow-blue-600/10' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Assinaturas
                        </button>
                        <button
                            onClick={() => setActiveTab('PAYMENTS')}
                            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-2 ${activeTab === 'PAYMENTS' ? 'bg-white text-blue-600 shadow-xl shadow-blue-600/10' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            PIX Pendentes
                            {pendingPayments.length > 0 && <span className="bg-rose-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">{pendingPayments.length}</span>}
                        </button>
                    </div>

                    {activeTab === 'CLUBS' && (
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar clube..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-6 py-3.5 bg-white rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-700"
                                />
                            </div>
                            <div className="relative">
                                <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    className="pl-11 pr-8 py-3.5 bg-white rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-[10px] uppercase tracking-widest appearance-none text-slate-600"
                                >
                                    <option value="ALL">Todos Status</option>
                                    <option value="ACTIVE">Ativos</option>
                                    <option value="PAYMENT_WARNING">Em Aviso</option>
                                    <option value="SUSPENDED">Suspensos</option>
                                    <option value="TRIAL">Em Teste</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'CLUBS' ? (
                        <motion.div
                            key="clubs-tab"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20 overflow-hidden"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Clube & Diretor</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Membros</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ciclo</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Próx. Renovação</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loadingClubs ? (
                                            <tr><td colSpan={5} className="py-20 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-300" /></td></tr>
                                        ) : filteredClubs.length === 0 ? (
                                            <tr><td colSpan={5} className="py-20 text-center font-bold text-slate-400">Nenhum clube encontrado.</td></tr>
                                        ) : (
                                            filteredClubs.map(club => (
                                                <tr key={club.id} className="group hover:bg-slate-50 transition-colors">
                                                    <td className="px-8 py-6">
                                                        <div className="font-black text-slate-800 text-lg tracking-tight group-hover:text-blue-600 transition-colors uppercase">{club.name}</div>
                                                        {club.director && (
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mt-1">
                                                                <User className="w-3 h-3" />
                                                                {club.director.name}
                                                                {club.director.phone && (
                                                                    <span className="flex items-center gap-1 text-blue-400 ml-2">
                                                                        <Phone className="w-3 h-3" /> {club.director.phone}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <StatusBadge club={club} />
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg text-xs">
                                                            {club._count?.users || 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        {club.subscriptionPlan ? (
                                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg">
                                                                <CreditCard className="w-3 h-3 text-slate-400" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                                                                    {club.subscriptionPlan === 'MONTHLY' ? 'Mensal' :
                                                                        club.subscriptionPlan === 'QUARTERLY' ? 'Trimestral' : 'Anual'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        {club.nextPaymentDue ? (
                                                            <div className={`flex flex-col ${new Date(club.nextPaymentDue) < new Date() ? 'text-rose-500' : 'text-slate-600'}`}>
                                                                <span className="text-xs font-black">{format(new Date(club.nextPaymentDue), "dd 'de' MMMM", { locale: ptBR })}</span>
                                                                <span className="text-[10px] uppercase font-bold opacity-60 tracking-widest">{format(new Date(club.nextPaymentDue), "yyyy", { locale: ptBR })}</span>
                                                                {new Date(club.nextPaymentDue) < new Date() && (
                                                                    <span className="text-[8px] font-black uppercase bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded mt-1 w-fit">Inadimplente</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                                                            {(['SUSPENDED', 'BLOCKED', 'PAYMENT_WARNING'].includes(club.status)) && (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedClub(club);
                                                                        setReactivateModalOpen(true);
                                                                    }}
                                                                    className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-emerald-600/20"
                                                                >
                                                                    Regularizar
                                                                </button>
                                                            )}
                                                            <button className="p-2.5 text-slate-400 hover:text-slate-900 bg-white rounded-xl border border-slate-100">
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
                        </motion.div>
                    ) : (
                        <motion.div
                            key="payments-tab"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20 overflow-hidden"
                        >
                            <div className="px-10 py-8 bg-slate-900 text-white flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                        <TrendingUp className="text-emerald-400" /> Confirmações de PIX
                                    </h3>
                                    <p className="text-slate-400 text-xs font-medium mt-1">Valide os comprovantes recebidos manualmente.</p>
                                </div>
                                <div className="bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-md">
                                    <span className="text-emerald-400 font-black text-xl">{pendingPayments.length}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Pendentes</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-10">
                                {loadingPayments ? (
                                    <div className="col-span-full py-20 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-200" /></div>
                                ) : pendingPayments.length === 0 ? (
                                    <div className="col-span-full py-20 text-center glass-card rounded-[2rem]">
                                        <div className="bg-emerald-100 text-emerald-600 p-4 rounded-2xl inline-block mb-4">
                                            <CheckCircle className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800">Tudo limpo!</h3>
                                        <p className="text-slate-400 text-sm">Não há solicitações de pagamento pendentes.</p>
                                    </div>
                                ) : (
                                    pendingPayments.map(payment => (
                                        <motion.div
                                            key={payment.id}
                                            layout
                                            className="bg-slate-50 border border-slate-100 rounded-3xl p-6 hover:border-emerald-300 transition-all group"
                                        >
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{format(new Date(payment.created_at || new Date()), "dd 'de' MMMM", { locale: ptBR })}</p>
                                                    <h4 className="text-lg font-black text-slate-800 uppercase leading-tight">{payment.club?.name}</h4>
                                                </div>
                                                <div className="bg-white p-2 rounded-xl border border-slate-200 text-emerald-600 font-black text-sm">
                                                    R$ {payment.amount.toFixed(2)}
                                                </div>
                                            </div>

                                            <div className="space-y-4 mb-8">
                                                <div className="flex items-center gap-3">
                                                    <Receipt className="w-4 h-4 text-slate-400" />
                                                    <span className="text-xs font-bold text-slate-600">{payment.description}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <CreditCard className="w-4 h-4 text-slate-400" />
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 bg-white px-3 py-1 rounded-lg border border-slate-200">{payment.paymentMethod}</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Confirma o recebimento de R$ ' + payment.amount + '?')) {
                                                            confirmPaymentMutation.mutate(payment.id);
                                                        }
                                                    }}
                                                    className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle className="w-4 h-4" /> Validar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Remover este registro?')) {
                                                            deletePaymentMutation.mutate(payment.id);
                                                        }
                                                    }}
                                                    className="p-3 text-rose-400 hover:text-white hover:bg-rose-500 rounded-2xl transition-all border border-slate-200"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Premium Modal for Reactivation */}
            <AnimatePresence>
                {reactivateModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setReactivateModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            className="bg-white rounded-[3rem] p-10 max-w-lg w-full relative z-10 shadow-2xl space-y-8"
                        >
                            <div className="text-center">
                                <div className="bg-emerald-100 text-emerald-600 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-600/10">
                                    <TrendingUp className="w-8 h-8" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Regularizar Clube</h2>
                                <p className="text-slate-500 mt-2 font-medium">Registrar pagamento para <span className="text-blue-600 font-black">{selectedClub?.name}</span></p>
                            </div>

                            <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50">
                                <p className="text-xs text-blue-700 font-bold leading-relaxed flex items-start gap-3">
                                    <CreditCard className="w-5 h-5 shrink-0" />
                                    Isso mudará o status para Ativo e renovará a data de validade com base no plano.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 font-medium">Selecione o Plano Pago</p>
                                <div className="space-y-2">
                                    {[
                                        { id: 'MONTHLY', label: 'Mensal', price: '+30 dias' },
                                        { id: 'QUARTERLY', label: 'Trimestral', price: '+90 dias' },
                                        { id: 'ANNUAL', label: 'Anual', price: '+365 dias' }
                                    ].map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setReactivatePlan(p.id as any)}
                                            className={`w-full flex justify-between items-center p-5 rounded-[1.5rem] border-2 transition-all ${reactivatePlan === p.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl px-8' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'}`}
                                        >
                                            <span className="font-black text-xs uppercase tracking-widest">{p.label}</span>
                                            <span className={`text-[10px] font-bold ${reactivatePlan === p.id ? 'text-emerald-400' : 'text-slate-400'}`}>{p.price}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setReactivateModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors">Voltar</button>
                                <button
                                    onClick={() => reactivateMutation.mutate()}
                                    disabled={reactivateMutation.isPending}
                                    className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-600/20 disabled:opacity-50"
                                >
                                    {reactivateMutation.isPending ? 'Gravando...' : 'Confirmar e Reativar'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
