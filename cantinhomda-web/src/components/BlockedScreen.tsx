import { Ban, Phone, Mail, Calendar, DollarSign } from 'lucide-react';

interface BlockedScreenProps {
    clubStatus: {
        status: 'SUSPENDED' | 'BLOCKED';
        name: string;
        nextPaymentDue?: string;
        subscriptionPlan?: string;
        approvalNotes?: string;
    };
}

export function BlockedScreen({ clubStatus }: BlockedScreenProps) {
    const isSuspended = clubStatus.status === 'SUSPENDED';
    const supportPhone = '+5591983292005';
    const supportPhoneFormatted = '(91) 98329-2005';
    const pixKey = '+5591983292005';

    const openWhatsApp = () => {
        const cleanPhone = supportPhone.replace(/\D/g, '');
        const message = encodeURIComponent(
            `Olá! Meu clube "${clubStatus.name}" foi ${isSuspended ? 'suspenso' : 'bloqueado'} e gostaria de regularizar a situação.`
        );
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    };

    const openEmail = () => {
        const subject = encodeURIComponent(`Regularização - Clube ${clubStatus.name}`);
        const body = encodeURIComponent(
            `Olá,\n\nMeu clube "${clubStatus.name}" foi ${isSuspended ? 'suspenso' : 'bloqueado'} e gostaria de regularizar a situação.\n\nAguardo retorno.`
        );
        window.open(`mailto:suporte@cantinhomda.com?subject=${subject}&body=${body}`);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getPlanLabel = (plan?: string) => {
        switch (plan) {
            case 'MONTHLY': return 'Mensal';
            case 'QUARTERLY': return 'Trimestral';
            case 'ANNUAL': return 'Anual';
            default: return 'N/A';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-600 to-orange-600 p-8 text-center">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                        <Ban className="w-12 h-12 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Acesso Temporariamente Suspenso
                    </h1>
                    <p className="text-red-100 text-lg">
                        {clubStatus.name}
                    </p>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    {/* Motivo */}
                    <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                        <p className="text-red-800 font-medium">
                            {isSuspended
                                ? '📅 Seu clube foi suspenso devido ao não pagamento.'
                                : '🚫 Seu clube foi bloqueado pela administração.'}
                        </p>
                        {clubStatus.approvalNotes && (
                            <p className="text-red-700 text-sm mt-2">
                                Motivo: {clubStatus.approvalNotes}
                            </p>
                        )}
                    </div>

                    {/* Informações */}
                    {isSuspended && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-slate-600 mb-1">
                                    <Calendar className="w-4 h-4" />
                                    <span className="text-sm font-medium">Vencimento:</span>
                                </div>
                                <p className="text-lg font-bold text-slate-800">
                                    {formatDate(clubStatus.nextPaymentDue)}
                                </p>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-slate-600 mb-1">
                                    <DollarSign className="w-4 h-4" />
                                    <span className="text-sm font-medium">Plano:</span>
                                </div>
                                <p className="text-lg font-bold text-slate-800">
                                    {getPlanLabel(clubStatus.subscriptionPlan)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Divisor */}
                    <div className="border-t border-slate-200"></div>

                    {/* Instruções de Reativação */}
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-4">
                            Para reativar seu acesso:
                        </h2>

                        <div className="space-y-4">
                            {isSuspended && (
                                <>
                                    {/* Passo 1 */}
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                            1
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-800 mb-1">
                                                Realize o pagamento via PIX
                                            </h3>
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-sm text-blue-700 mb-1">Chave PIX:</p>
                                                <p className="text-lg font-mono font-bold text-blue-900">
                                                    {pixKey}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Passo 2 */}
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                            2
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-800 mb-2">
                                                Envie o comprovante via WhatsApp
                                            </h3>
                                            <button
                                                onClick={openWhatsApp}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors w-full justify-center"
                                            >
                                                <Phone className="w-5 h-5" />
                                                Abrir WhatsApp: {supportPhoneFormatted}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Passo 3 */}
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                            3
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-800">
                                                Aguarde a confirmação (até 24h)
                                            </h3>
                                            <p className="text-sm text-slate-600 mt-1">
                                                Seu acesso será reativado automaticamente após a confirmação do pagamento.
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {!isSuspended && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <p className="text-amber-800">
                                        Entre em contato com o suporte para mais informações sobre o bloqueio.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Divisor */}
                    <div className="border-t border-slate-200"></div>

                    {/* Contato */}
                    <div>
                        <h3 className="font-bold text-slate-800 mb-3">
                            Dúvidas? Entre em contato:
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button
                                onClick={openWhatsApp}
                                className="flex items-center gap-2 px-4 py-3 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded-lg transition-colors justify-center"
                            >
                                <Phone className="w-5 h-5" />
                                WhatsApp
                            </button>
                            <button
                                onClick={openEmail}
                                className="flex items-center gap-2 px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium rounded-lg transition-colors justify-center"
                            >
                                <Mail className="w-5 h-5" />
                                Email
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-slate-600">
                            Agradecemos sua compreensão e aguardamos sua regularização.
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Equipe CantinhoMDA
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
