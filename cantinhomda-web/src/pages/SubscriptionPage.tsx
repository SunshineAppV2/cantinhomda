import { CreditCard, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionWidget } from '../components/SubscriptionWidget';

export function SubscriptionPage() {
    const { user } = useAuth();

    const { data: clubData, isLoading } = useQuery({
        queryKey: ['club-subscription-page', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return null;
            const res = await api.get(`/clubs/${user.clubId}`);
            return res.data;
        },
        enabled: !!user?.clubId
    });

    const handleWhatsAppCheckout = () => {
        if (!clubData) return;
        const message = `Desejo regularizar o acesso do clube ${clubData.name || ''} ASSOCIAÇÃO ${clubData.association || ''}, ENVIADO POR MENSAGEM`;
        const url = `https://wa.me/5591983292005?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Carregando informações da assinatura...</div>;
    }

    if (!clubData) {
        return <div className="p-8 text-center text-red-500">Erro ao carregar dados do clube.</div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 p-6">
            <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                    <CreditCard className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Assinatura do Clube</h1>
                    <p className="text-slate-500">Gerencie o plano, pagamentos e status de acesso.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Status & Widget */}
                <div className="lg:col-span-2 space-y-6">
                    <SubscriptionWidget />

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Detalhes do Plano</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between py-3 border-b border-slate-100">
                                <span className="text-slate-500">Plano Atual</span>
                                <span className="font-medium text-slate-800">{clubData.planTier || 'TRIAL'}</span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-slate-100">
                                <span className="text-slate-500">Limite de Membros</span>
                                <span className="font-medium text-slate-800">{clubData.memberLimit || 30}</span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-slate-100">
                                <span className="text-slate-500">Status</span>
                                <span className={`font-bold px-2 py-1 rounded text-xs ${clubData.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                    clubData.subscriptionStatus === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                        'bg-slate-100 text-slate-700'
                                    }`}>
                                    {clubData.subscriptionStatus || 'Indefinido'}
                                </span>
                            </div>
                            <div className="flex justify-between py-3">
                                <span className="text-slate-500">Próximo Vencimento</span>
                                <span className="font-medium text-slate-800">
                                    {clubData.nextBillingDate ? new Date(clubData.nextBillingDate).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Actions */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-lg">
                        <h3 className="text-lg font-bold mb-2">Regularizar Assinatura</h3>
                        <p className="text-sm text-slate-300 mb-6">
                            Utilize o botão abaixo para quitar pendências ou renovar seu plano via WhatsApp.
                        </p>

                        <button
                            onClick={handleWhatsAppCheckout}
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <CreditCard className="w-5 h-5" />
                            Regularizar via WhatsApp
                        </button>

                        <p className="text-xs text-center text-slate-400 mt-4">
                            Você será redirecionado para o WhatsApp.
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-2">Recursos Premium</h3>
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2 text-sm text-slate-600">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Acesso ilimitado ao sistema
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-600">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Gestão financeira completa
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-600">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Relatórios avançados
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-600">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Suporte prioritário
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
