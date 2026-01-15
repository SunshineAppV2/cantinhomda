import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import {
    UserCheck,
    UserX,
    Phone,
    Building2,
    Calendar,
    CreditCard,
    CheckCircle,
    Clock,
    RefreshCw,
    ExternalLink
} from 'lucide-react';

interface PendingUser {
    id: string;
    name: string;
    email: string;
    mobile?: string;
    cpf?: string;
    role: string;
    status: string;
    clubId?: string;
    createdAt: string;
    club?: {
        id: string;
        name: string;
        phoneNumber?: string;
        union?: string;
        association?: string;
        mission?: string;
        region?: string;
        district?: string;
        memberLimit?: number;
        settings?: any;
        subscriptionStatus?: string;
        _count?: { users: number };
    };
}

export function UserApprovals() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Buscar usuários pendentes
    const { data: pendingUsers = [], isLoading, refetch } = useQuery({
        queryKey: ['pending-users'],
        queryFn: async () => {
            const res = await api.get('/users/pending');
            return res.data as PendingUser[];
        },
        enabled: user?.role === 'MASTER' || user?.email === 'master@cantinhodbv.com'
    });

    // Mutation para aprovar
    const approveMutation = useMutation({
        mutationFn: async (userId: string) => {
            return api.patch(`/users/${userId}/approve`);
        },
        onSuccess: () => {
            toast.success('Usuário aprovado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['pending-users'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Erro ao aprovar usuário');
        }
    });

    // Mutation para rejeitar
    const rejectMutation = useMutation({
        mutationFn: async (userId: string) => {
            return api.patch(`/users/${userId}/reject`);
        },
        onSuccess: () => {
            toast.success('Usuário rejeitado');
            queryClient.invalidateQueries({ queryKey: ['pending-users'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Erro ao rejeitar usuário');
        }
    });

    const handleApprove = (userId: string) => {
        if (window.confirm('Confirma a aprovação deste cadastro?')) {
            approveMutation.mutate(userId);
        }
    };

    const handleReject = (userId: string) => {
        if (window.confirm('Tem certeza que deseja REJEITAR este cadastro? O usuário não poderá acessar o sistema.')) {
            rejectMutation.mutate(userId);
        }
    };

    const openWhatsApp = (phone: string, userName: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        const message = encodeURIComponent(
            `Olá ${userName}! Recebemos seu cadastro no Cantinho DBV. Estamos analisando suas informações e em breve você terá acesso ao sistema.`
        );
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const calculateAmount = (club: PendingUser['club']) => {
        if (!club) return 0;
        const settings = club.settings || {};
        const memberLimit = settings.memberLimit || club.memberLimit || 30;
        const billingCycle = settings.billingCycle || 'MENSAL';
        const months = billingCycle === 'TRIMESTRAL' ? 3 : billingCycle === 'ANUAL' ? 12 : 1;
        return memberLimit * 2 * months; // R$ 2,00 por membro/mês
    };

    if (user?.role !== 'MASTER' && user?.email !== 'master@cantinhodbv.com') {
        return (
            <div className="p-8 text-center text-red-500">
                Acesso restrito ao Master.
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-amber-100 p-3 rounded-xl text-amber-600">
                        <UserCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Aprovação de Cadastros</h1>
                        <p className="text-slate-500">
                            {pendingUsers.length} cadastro{pendingUsers.length !== 1 ? 's' : ''} pendente{pendingUsers.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar
                </button>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                    Carregando cadastros pendentes...
                </div>
            )}

            {/* Empty State */}
            {!isLoading && pendingUsers.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-green-800">Tudo em dia!</h3>
                    <p className="text-green-600">Não há cadastros pendentes de aprovação.</p>
                </div>
            )}

            {/* Lista de Pendentes */}
            {pendingUsers.length > 0 && (
                <div className="grid gap-4">
                    {pendingUsers.map((pendingUser) => {
                        const isOwner = pendingUser.role === 'OWNER';
                        const settings = pendingUser.club?.settings || {};
                        const billingCycle = settings.billingCycle || 'MENSAL';
                        const memberLimit = settings.memberLimit || pendingUser.club?.memberLimit || 30;
                        const amount = calculateAmount(pendingUser.club);

                        return (
                            <div
                                key={pendingUser.id}
                                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div className="p-5">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        {/* Info Principal */}
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-amber-100 p-2 rounded-full">
                                                    <Clock className="w-5 h-5 text-amber-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-lg">{pendingUser.name}</h3>
                                                    <p className="text-sm text-slate-500">{pendingUser.email}</p>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${isOwner ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {isOwner ? 'NOVO CLUBE' : pendingUser.role}
                                                </span>
                                            </div>

                                            {/* Detalhes do Clube */}
                                            {pendingUser.club && (
                                                <div className="pl-12 space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <Building2 className="w-4 h-4" />
                                                        <span className="font-medium">{pendingUser.club.name}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                                                        {pendingUser.club.union && <span>União: {pendingUser.club.union}</span>}
                                                        {(pendingUser.club.association || pendingUser.club.mission) && (
                                                            <span>Associação: {pendingUser.club.association || pendingUser.club.mission}</span>
                                                        )}
                                                        {pendingUser.club.region && <span>Região: {pendingUser.club.region}</span>}
                                                        {pendingUser.club.district && <span>Distrito: {pendingUser.club.district}</span>}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Info de Contato */}
                                            <div className="pl-12 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                                {pendingUser.mobile && (
                                                    <button
                                                        onClick={() => openWhatsApp(pendingUser.mobile!, pendingUser.name)}
                                                        className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:underline"
                                                    >
                                                        <Phone className="w-4 h-4" />
                                                        {pendingUser.mobile}
                                                        <ExternalLink className="w-3 h-3" />
                                                    </button>
                                                )}
                                                {pendingUser.cpf && (
                                                    <span className="flex items-center gap-1">
                                                        CPF: {pendingUser.cpf}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(pendingUser.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Plano e Valor */}
                                        {isOwner && (
                                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 min-w-[200px]">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CreditCard className="w-4 h-4 text-slate-500" />
                                                    <span className="text-sm font-medium text-slate-700">Plano Solicitado</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-500">Ciclo:</span>
                                                        <span className="font-medium">{billingCycle}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-500">Membros:</span>
                                                        <span className="font-medium">{memberLimit}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                                                        <span className="text-slate-700 font-medium">Total:</span>
                                                        <span className="font-bold text-green-600">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Ações */}
                                        <div className="flex flex-col gap-2 min-w-[140px]">
                                            <button
                                                onClick={() => handleApprove(pendingUser.id)}
                                                disabled={approveMutation.isPending}
                                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                <UserCheck className="w-4 h-4" />
                                                Aprovar
                                            </button>
                                            <button
                                                onClick={() => handleReject(pendingUser.id)}
                                                disabled={rejectMutation.isPending}
                                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                <UserX className="w-4 h-4" />
                                                Rejeitar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-bold text-blue-800 mb-2">ℹ️ Como funciona?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Quando você <strong>aprova</strong> um cadastro de novo clube (OWNER), um <strong>pagamento pendente</strong> é gerado automaticamente.</li>
                    <li>• Após receber o PIX, acesse a tela de <strong>Pagamentos</strong> para confirmar e ativar o clube.</li>
                    <li>• Membros que se juntam a clubes existentes são aprovados sem gerar pagamento adicional.</li>
                    <li>• Cadastros <strong>rejeitados</strong> ficam bloqueados e o usuário não consegue acessar o sistema.</li>
                </ul>
            </div>
        </div>
    );
}
