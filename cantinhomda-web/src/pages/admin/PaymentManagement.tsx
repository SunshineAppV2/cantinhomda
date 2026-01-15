import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import {
    CreditCard,
    CheckCircle,
    XCircle,
    Clock,
    RefreshCw,
    Building2,
    Phone,
    ExternalLink,
    DollarSign,
    Trash2,
    Receipt,
    AlertTriangle
} from 'lucide-react';

interface Payment {
    id: string;
    clubId: string;
    type: 'SUBSCRIPTION' | 'MEMBER_ADDITION' | 'RENEWAL';
    amount: number;
    status: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'REFUNDED';
    paymentMethod: string;
    description: string;
    metadata?: {
        memberCount?: number;
        months?: number;
        billingCycle?: string;
        planName?: string;
        startDate?: string;
    };
    confirmedAt?: string;
    confirmedBy?: string;
    expiresAt?: string;
    createdAt: string;
    club?: {
        id: string;
        name: string;
        phoneNumber?: string;
        union?: string;
        association?: string;
    };
    confirmedByUser?: {
        id: string;
        name: string;
    };
}

export function PaymentManagement() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Buscar pagamentos pendentes
    const { data: pendingPayments = [], isLoading: loadingPending, refetch: refetchPending } = useQuery({
        queryKey: ['pending-payments'],
        queryFn: async () => {
            const res = await api.get('/subscriptions/payments/pending');
            return res.data as Payment[];
        },
        enabled: user?.role === 'MASTER' || user?.email === 'master@cantinhodbv.com'
    });

    // Confirmar pagamento
    const confirmMutation = useMutation({
        mutationFn: async (paymentId: string) => {
            return api.patch(`/subscriptions/payments/${paymentId}/confirm`);
        },
        onSuccess: () => {
            toast.success('Pagamento confirmado! Clube ativado.');
            queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Erro ao confirmar pagamento');
        }
    });

    // Deletar pagamento
    const deleteMutation = useMutation({
        mutationFn: async (paymentId: string) => {
            return api.delete(`/subscriptions/payments/${paymentId}`);
        },
        onSuccess: () => {
            toast.success('Pagamento removido');
            queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Erro ao deletar pagamento');
        }
    });

    const handleConfirm = (paymentId: string) => {
        if (window.confirm('Confirma o recebimento do PIX? O clube será ativado imediatamente.')) {
            confirmMutation.mutate(paymentId);
        }
    };

    const handleDelete = (paymentId: string) => {
        if (window.confirm('Tem certeza que deseja DELETAR este pagamento? Esta ação não pode ser desfeita.')) {
            deleteMutation.mutate(paymentId);
        }
    };

    const openWhatsApp = (phone: string, clubName: string, amount: number) => {
        const cleanPhone = phone.replace(/\D/g, '');
        const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
        const message = encodeURIComponent(
            `Olá! Identificamos o pagamento de ${formattedAmount} referente ao clube "${clubName}" no Cantinho DBV. Seu acesso foi liberado! 🎉`
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

    const getStatusBadge = (status: Payment['status']) => {
        switch (status) {
            case 'PENDING':
                return <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold"><Clock className="w-3 h-3" /> Pendente</span>;
            case 'CONFIRMED':
                return <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold"><CheckCircle className="w-3 h-3" /> Confirmado</span>;
            case 'EXPIRED':
                return <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold"><XCircle className="w-3 h-3" /> Expirado</span>;
            case 'REFUNDED':
                return <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold"><AlertTriangle className="w-3 h-3" /> Estornado</span>;
            default:
                return null;
        }
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
                    <div className="bg-green-100 p-3 rounded-xl text-green-600">
                        <CreditCard className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Gestão de Pagamentos</h1>
                        <p className="text-slate-500">
                            {pendingPayments.length} pagamento{pendingPayments.length !== 1 ? 's' : ''} pendente{pendingPayments.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => refetchPending()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar
                </button>
            </div>

            {/* Loading */}
            {loadingPending && (
                <div className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                    Carregando pagamentos...
                </div>
            )}

            {/* Empty State */}
            {!loadingPending && pendingPayments.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-green-800">Nenhum pagamento pendente</h3>
                    <p className="text-green-600">Todos os pagamentos foram processados.</p>
                </div>
            )}

            {/* Lista de Pagamentos Pendentes */}
            {pendingPayments.length > 0 && (
                <div className="grid gap-4">
                    {pendingPayments.map((payment) => (
                        <div
                            key={payment.id}
                            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                        >
                            <div className="p-5">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    {/* Info Principal */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-amber-100 p-2 rounded-full">
                                                <DollarSign className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-lg">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}
                                                </h3>
                                                <p className="text-sm text-slate-500">{payment.description}</p>
                                            </div>
                                            {getStatusBadge(payment.status)}
                                        </div>

                                        {/* Detalhes do Clube */}
                                        {payment.club && (
                                            <div className="pl-12 space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Building2 className="w-4 h-4" />
                                                    <span className="font-medium">{payment.club.name}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                                                    {payment.club.union && <span>União: {payment.club.union}</span>}
                                                    {payment.club.association && <span>Associação: {payment.club.association}</span>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Info de Contato e Data */}
                                        <div className="pl-12 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                            {payment.club?.phoneNumber && (
                                                <button
                                                    onClick={() => openWhatsApp(payment.club!.phoneNumber!, payment.club!.name, payment.amount)}
                                                    className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:underline"
                                                >
                                                    <Phone className="w-4 h-4" />
                                                    Notificar via WhatsApp
                                                    <ExternalLink className="w-3 h-3" />
                                                </button>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                Criado em: {formatDate(payment.createdAt)}
                                            </span>
                                            {payment.expiresAt && (
                                                <span className="flex items-center gap-1 text-amber-600">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    Expira: {formatDate(payment.expiresAt)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Metadados */}
                                    {payment.metadata && (
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 min-w-[180px]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Receipt className="w-4 h-4 text-slate-500" />
                                                <span className="text-sm font-medium text-slate-700">Detalhes</span>
                                            </div>
                                            <div className="space-y-1 text-sm">
                                                {payment.metadata.billingCycle && (
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Ciclo:</span>
                                                        <span className="font-medium">{payment.metadata.billingCycle}</span>
                                                    </div>
                                                )}
                                                {payment.metadata.memberCount && (
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Membros:</span>
                                                        <span className="font-medium">{payment.metadata.memberCount}</span>
                                                    </div>
                                                )}
                                                {payment.metadata.months && (
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Período:</span>
                                                        <span className="font-medium">{payment.metadata.months} mês(es)</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Ações */}
                                    <div className="flex flex-col gap-2 min-w-[160px]">
                                        <button
                                            onClick={() => handleConfirm(payment.id)}
                                            disabled={confirmMutation.isPending}
                                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Confirmar PIX
                                        </button>
                                        <button
                                            onClick={() => handleDelete(payment.id)}
                                            disabled={deleteMutation.isPending}
                                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-bold text-blue-800 mb-2">ℹ️ Como funciona?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Pagamentos são criados automaticamente quando você <strong>aprova</strong> um novo clube.</li>
                    <li>• Quando receber o PIX na sua conta, clique em <strong>"Confirmar PIX"</strong> para ativar o clube.</li>
                    <li>• A confirmação atualiza o status da assinatura para <strong>ACTIVE</strong> e define a data de vencimento.</li>
                    <li>• Use o botão de WhatsApp para notificar o clube sobre a confirmação do pagamento.</li>
                    <li>• Pagamentos não confirmados expiram automaticamente após 7 dias.</li>
                </ul>
            </div>
        </div>
    );
}
