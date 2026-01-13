import { useState } from 'react';
import { X, Copy, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ReferralPopupProps {
    referralCode: string;
    clubName: string;
    onClose: () => void;
}

export function ReferralPopup({ referralCode, onClose }: ReferralPopupProps) {
    const [copied, setCopied] = useState(false);

    const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(referralLink);
            setCopied(true);
            toast.success('Link copiado!');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error('Erro ao copiar link');
        }
    };

    const handleWhatsAppShare = () => {
        const message = encodeURIComponent(
            `🎉 Venha fazer parte do CantinhoDBV.\n` +
            `Sistema que vai mudar o engajamento no seu clube\n\n` +
            `Use meu código de indicação: *${referralCode}*\n\n` +
            `Cadastre-se aqui: ${referralLink}`
        );
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    const handleDontShowAgain = () => {
        localStorage.setItem('referralPopupDismissed', 'true');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fadeIn">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="text-center">
                        <div className="text-4xl mb-2">🎉</div>
                        <h2 className="text-2xl font-bold">Indique e Ganhe!</h2>
                        <p className="text-green-100 mt-2">
                            Compartilhe o Ranking DBV com outros clubes
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Referral Code */}
                    <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
                        <p className="text-sm text-gray-600 mb-2 text-center">Seu código de indicação:</p>
                        <div className="text-center">
                            <span className="text-3xl font-bold text-green-600 tracking-wider">
                                {referralCode}
                            </span>
                        </div>
                    </div>

                    {/* Referral Link */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Link de indicação:
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={referralLink}
                                readOnly
                                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                            />
                            <button
                                onClick={handleCopy}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copiado!' : 'Copiar'}
                            </button>
                        </div>
                    </div>

                    {/* Benefits */}
                    <div className="bg-green-50 rounded-lg p-4">
                        <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                            <Share2 className="w-5 h-5" />
                            Benefícios da Indicação:
                        </h3>
                        <ul className="space-y-2 text-sm text-green-800">
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-1">✓</span>
                                <span><strong>20% de desconto</strong> quando o clube indicado fizer o primeiro pagamento</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-1">✓</span>
                                <span>Acumule até <strong>3 descontos</strong> válidos por 30, 60 e 90 dias</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-1">✓</span>
                                <span>Ajude outros clubes a crescerem organizados</span>
                            </li>
                        </ul>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={handleWhatsAppShare}
                            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            Compartilhar no WhatsApp
                        </button>

                        <button
                            onClick={handleDontShowAgain}
                            className="w-full px-6 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
                        >
                            Não mostrar novamente
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
