import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import {
    CheckCircle,
    RefreshCw,
    Building2,
    User,
    Mail,
    Phone,
    MessageSquare,
    Ban,
    Search,
    ShieldAlert
} from 'lucide-react';

interface PendingClub {
    id: string;
    name: string;
    region?: string;
    district?: string;
    association?: string;
    union?: string;
    phoneNumber?: string;
    approvalMessage?: string;
    createdAt: string;
    users: Array<{
        id: string;
        name: string;
        email: string;
        phone?: string;
    }>;
}

interface ApprovalMetrics {
    pending: number;
    approved: number;
    rejected: number;
    trial: number;
}

export function ClubApprovals() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedClub, setSelectedClub] = useState<PendingClub | null>(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form states
    const [grantTrial, setGrantTrial] = useState(false);
    const [trialDays, setTrialDays] = useState(7);
    const [subscriptionPlan, setSubscriptionPlan] = useState<'MONTHLY' | 'QUARTERLY' | 'ANNUAL'>('MONTHLY');
    const [notes, setNotes] = useState('');
    const [rejectReason, setRejectReason] = useState('');

    // Buscar clubes pendentes
    const { data: pendingClubs = [], isLoading: loadingPending, refetch } = useQuery({
        queryKey: ['clubs', 'pending'],
        queryFn: async () => {
            const res = await api.get('/clubs/admin/pending');
            return res.data as PendingClub[];
        },
        enabled: user?.role === 'MASTER' || user?.email === 'master@cantinhomda.com'
    });

    // Buscar métricas
    const { data: metrics } = useQuery<ApprovalMetrics>({
        queryKey: ['clubs', 'approval-metrics'],
        queryFn: async () => {
            const res = await api.get('/clubs/admin/approval-metrics');
            return res.data;
        },
        enabled: user?.role === 'MASTER' || user?.email === 'master@cantinhomda.com'
    });

    const approveMutation = useMutation({
        mutationFn: async (data: {
            clubId: string;
            grantTrial?: boolean;
            trialDays?: number;
            subscriptionPlan: string;
            notes?: string;
        }) => {
            return api.post(`/clubs/${data.clubId}/approve`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clubs', 'pending'] });
            queryClient.invalidateQueries({ queryKey: ['clubs', 'approval-metrics'] });
            toast.success('Clube aprovado com sucesso!');
            closeModals();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Erro ao aprovar clube');
        }
    });

    const rejectMutation = useMutation({
        mutationFn: async (data: { clubId: string; reason: string }) => {
            return api.post(`/clubs/${data.clubId}/reject`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clubs', 'pending'] });
            queryClient.invalidateQueries({ queryKey: ['clubs', 'approval-metrics'] });
            toast.success('Clube rejeitado.');
            closeModals();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Erro ao rejeitar clube');
        }
    });

    const closeModals = () => {
        setShowApproveModal(false);
        setShowRejectModal(false);
        setSelectedClub(null);
        setGrantTrial(false);
        setTrialDays(7);
        setSubscriptionPlan('MONTHLY');
        setNotes('');
        setRejectReason('');
    };

    const handleApprove = () => {
        if (!selectedClub) return;
        approveMutation.mutate({
            clubId: selectedClub.id,
            grantTrial,
            trialDays: grantTrial ? trialDays : undefined,
            subscriptionPlan,
            notes
        });
    };

    const handleReject = () => {
        if (!selectedClub || !rejectReason.trim()) {
            toast.error('Por favor, informe o motivo da rejeição');
            return;
        }
        rejectMutation.mutate({
            clubId: selectedClub.id,
            reason: rejectReason
        });
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const filteredClubs = pendingClubs.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.users[0]?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (user?.role !== 'MASTER' && user?.email !== 'master@cantinhomda.com') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4 glass-card p-12 rounded-[3rem]">
                    <div className="bg-rose-100 text-rose-600 p-4 rounded-2xl inline-block">
                        <Ban className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
                    <p className="text-slate-500 max-w-sm">Esta área é exclusiva para o administrador MASTER do sistema.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header section with Stats */}
            <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl shadow-slate-900/20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-[80px] -ml-32 -mb-32" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                                <Building2 className="w-8 h-8 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tight">Aprovações</h1>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Gestão de Novos Cadastros</p>
                            </div>
                        </div>

                        {metrics && (
                            <div className="flex flex-wrap gap-4">
                                <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-4 rounded-3xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pendentes</p>
                                    <p className="text-2xl font-black text-amber-400">{metrics.pending}</p>
                                </div>
                                <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-4 rounded-3xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Aprovados</p>
                                    <p className="text-2xl font-black text-emerald-400">{metrics.approved}</p>
                                </div>
                                <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-4 rounded-3xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Em Teste</p>
                                    <p className="text-2xl font-black text-blue-400">{metrics.trial}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => refetch()}
                        className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-black transition-all backdrop-blur-md border border-white/10 flex items-center gap-3 text-xs uppercase tracking-widest"
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingPending ? 'animate-spin' : ''}`} />
                        Atualizar Lista
                    </button>
                </div>
            </div>

            {/* Controls & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por clube ou diretor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-white rounded-3xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-700 shadow-sm"
                    />
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredClubs.map((club, idx) => {
                        const owner = club.users[0];
                        return (
                            <motion.div
                                key={club.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="glass-card rounded-[2.5rem] p-8 premium-shadow group hover:border-blue-300 transition-all flex flex-col justify-between"
                            >
                                <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-100/50 p-4 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                                                <Building2 className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-800">{club.name}</h3>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registrado em {formatDate(club.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {club.association && (
                                                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                                                    {club.association}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Director Info Box */}
                                    <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <User className="w-3 h-3" />
                                            Informações do Diretor
                                        </p>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <span className="font-bold text-slate-700">{owner?.name || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                    <Mail className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <span className="text-sm font-medium text-slate-500">{owner?.email || 'N/A'}</span>
                                            </div>
                                            {owner?.phone && (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                        <Phone className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-500">{owner.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Message */}
                                    {club.approvalMessage && (
                                        <div className="relative p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                                            <MessageSquare className="absolute top-4 right-4 w-4 h-4 text-blue-300" />
                                            <p className="text-xs text-blue-700 italic font-medium leading-relaxed">
                                                "{club.approvalMessage}"
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 mt-8">
                                    <button
                                        onClick={() => {
                                            setSelectedClub(club);
                                            setShowApproveModal(true);
                                        }}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Aprovar
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedClub(club);
                                            setShowRejectModal(true);
                                        }}
                                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-6 py-4 rounded-2xl font-black transition-all border border-rose-100 flex items-center gap-2 text-xs uppercase tracking-widest"
                                    >
                                        <Ban className="w-4 h-4" />
                                        Rejeitar
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Empty States */}
            {!loadingPending && filteredClubs.length === 0 && (
                <div className="text-center py-20 glass-card rounded-[3rem]">
                    <div className="bg-emerald-100 text-emerald-600 p-6 rounded-3xl inline-block mb-6">
                        <CheckCircle className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Tudo em dia!</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-2">Nenhum clube aguardando aprovação no momento.</p>
                </div>
            )}

            {/* Modals - Standard styled as well */}
            <AnimatePresence>
                {showApproveModal && selectedClub && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeModals}
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
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Deseja Aprovar?</h2>
                                <p className="text-slate-500 mt-2 font-medium">Configurações para o clube <span className="text-blue-600 font-black">{selectedClub.name}</span></p>
                            </div>

                            <div className="space-y-6">
                                {/* Option Section */}
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Período de Experiência</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setGrantTrial(false)}
                                            className={`p-4 rounded-2xl border-2 transition-all text-center ${!grantTrial ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}
                                        >
                                            <p className="font-black text-xs uppercase tracking-widest">Direto</p>
                                            <p className="text-[10px] mt-1 font-bold opacity-60">Sem teste</p>
                                        </button>
                                        <button
                                            onClick={() => setGrantTrial(true)}
                                            className={`p-4 rounded-2xl border-2 transition-all text-center ${grantTrial ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}
                                        >
                                            <p className="font-black text-xs uppercase tracking-widest">Cortesia</p>
                                            <p className="text-[10px] mt-1 font-bold opacity-60">Liberar Teste</p>
                                        </button>
                                    </div>
                                </div>

                                {grantTrial && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 font-medium">Duração do Teste</p>
                                        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl">
                                            {[7, 15, 30].map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => setTrialDays(d)}
                                                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${trialDays === d ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    {d} Dias
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Plano Inicial Sugerido</p>
                                    <div className="space-y-2">
                                        {[
                                            { id: 'MONTHLY', label: 'Mensal', price: 'R$ 1,00/membro' },
                                            { id: 'QUARTERLY', label: 'Trimestral', price: '10% Desc.' },
                                            { id: 'ANNUAL', label: 'Anual', price: '20% Desc.' }
                                        ].map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setSubscriptionPlan(p.id as any)}
                                                className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all ${subscriptionPlan === p.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'}`}
                                            >
                                                <span className="font-black text-xs uppercase tracking-widest">{p.label}</span>
                                                <span className={`text-[10px] font-bold ${subscriptionPlan === p.id ? 'text-blue-400' : 'text-slate-400'}`}>{p.price}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={closeModals} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors">Voltar</button>
                                <button
                                    onClick={handleApprove}
                                    disabled={approveMutation.isPending}
                                    className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-600/20 disabled:opacity-50"
                                >
                                    {approveMutation.isPending ? 'Processando...' : 'Confirmar Aprovação'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {showRejectModal && selectedClub && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeModals}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            className="bg-white rounded-[3rem] p-10 max-w-lg w-full relative z-10 shadow-2xl space-y-8"
                        >
                            <div className="text-center">
                                <div className="bg-rose-100 text-rose-600 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-600/10">
                                    <Ban className="w-8 h-8" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight text-center">Rejeitar Clube?</h2>
                                <p className="text-slate-500 mt-2 font-medium">Esta ação impedirá o acesso de <span className="text-rose-600 font-black">{selectedClub.name}</span>.</p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Motivo da Rejeição</p>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    rows={4}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 outline-none focus:ring-4 focus:ring-rose-500/10 transition-all font-medium text-slate-700"
                                    placeholder="Informe o motivo para o histórico..."
                                />
                            </div>

                            <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100">
                                <p className="text-xs text-rose-600 font-bold leading-relaxed flex items-start gap-3">
                                    <ShieldAlert className="w-5 h-5 shrink-0" />
                                    Atenção: O clube será bloqueado e não poderá realizar novos logins.
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={closeModals} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors">Voltar</button>
                                <button
                                    onClick={handleReject}
                                    disabled={rejectMutation.isPending || !rejectReason.trim()}
                                    className="flex-[2] py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-rose-600/20 disabled:opacity-50"
                                >
                                    {rejectMutation.isPending ? 'Processando...' : 'Rejeitar Permanentemente'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
