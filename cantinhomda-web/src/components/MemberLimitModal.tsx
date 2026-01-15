import { AlertTriangle, Phone, X, Users } from 'lucide-react';
import { generateUpgradeWhatsAppLink, formatCurrency, SUBSCRIPTION_CONFIG } from '../lib/subscription';

interface MemberLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    clubName: string;
    currentCount: number;
    memberLimit: number;
}

export function MemberLimitModal({
    isOpen,
    onClose,
    clubName,
    currentCount,
    memberLimit
}: MemberLimitModalProps) {
    if (!isOpen) return null;

    // Calculate suggested new limits
    const suggestedLimits = [
        memberLimit + 10,
        memberLimit + 20,
        memberLimit + 50
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Limite de Membros Atingido</h2>
                            <p className="text-white/80 text-sm">Seu plano atual não permite mais membros</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Current Status */}
                    <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-slate-500" />
                            <span className="text-slate-600">Membros Ativos</span>
                        </div>
                        <span className="font-bold text-lg text-slate-800">
                            {currentCount} / {memberLimit}
                        </span>
                    </div>

                    {/* Explanation */}
                    <p className="text-slate-600 text-sm text-center">
                        Para adicionar novos membros, você precisa fazer um upgrade no seu plano.
                        Escolha uma opção abaixo:
                    </p>

                    {/* Upgrade Options */}
                    <div className="space-y-2">
                        {suggestedLimits.map((limit) => {
                            const additionalMembers = limit - memberLimit;
                            const additionalCost = additionalMembers * SUBSCRIPTION_CONFIG.PRICE_PER_MEMBER_MONTHLY;
                            const whatsappLink = generateUpgradeWhatsAppLink(clubName, memberLimit, limit);

                            return (
                                <a
                                    key={limit}
                                    href={whatsappLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-colors group"
                                >
                                    <div>
                                        <p className="font-medium text-slate-800 group-hover:text-green-700">
                                            {limit} membros
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            +{additionalMembers} membros adicionais
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600">
                                            +{formatCurrency(additionalCost)}/mês
                                        </p>
                                        <p className="text-xs text-slate-400">via PIX</p>
                                    </div>
                                </a>
                            );
                        })}
                    </div>

                    {/* Custom Option */}
                    <div className="border-t border-slate-100 pt-4">
                        <a
                            href={generateUpgradeWhatsAppLink(clubName, memberLimit, memberLimit * 2)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                        >
                            <Phone className="w-5 h-5" />
                            Solicitar Upgrade via WhatsApp
                        </a>
                        <p className="text-[10px] text-center text-slate-400 mt-2">
                            Fale diretamente com o suporte para opções personalizadas
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
