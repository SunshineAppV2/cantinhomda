import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export function ReferralBanner() {
    const { user } = useAuth();
    const [dismissed, setDismissed] = useState(false);

    // Check if banner was dismissed
    useEffect(() => {
        if (localStorage.getItem('referralBannerDismissed')) {
            setDismissed(true);
        }
    }, []);

    // Fetch club status for referral code
    const { data: clubStatus } = useQuery({
        queryKey: ['club-status-api'],
        queryFn: async () => {
            const res = await api.get('/clubs/status');
            return res.data;
        },
        enabled: user?.role === 'OWNER',
        staleTime: 1000 * 60 * 30
    });

    const handleCopyReferral = () => {
        if (clubStatus?.referralCode) {
            const link = `${window.location.origin}/register?ref=${clubStatus.referralCode}`;
            const inviteText = `🎉 Venha fazer parte do CantinhoDBV.\nSistema que vai mudar o engajamento no seu clube\n\nUse meu código de indicação: ${clubStatus.referralCode}\n\nCadastre-se aqui: ${link}`;
            navigator.clipboard.writeText(inviteText);
            import('sonner').then(({ toast }) => toast.success('Convite copiado!'));
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('referralBannerDismissed', 'true');
        setDismissed(true);
    };

    // Don't show if not OWNER, no referral code, or dismissed
    if (user?.role !== 'OWNER' || !clubStatus?.referralCode || dismissed) {
        return null;
    }

    return (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 text-white shadow-md relative">
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 text-white/80 hover:text-white"
                aria-label="Fechar"
            >
                ✕
            </button>
            <div className="flex items-center justify-between gap-4 pr-6">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-bold text-sm">Indique e Ganhe! 🎉</p>
                        <p className="text-xs text-green-100">
                            Compartilhe seu código <span className="font-mono font-bold">{clubStatus.referralCode}</span> e ganhe 20% de desconto
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 items-center flex-shrink-0">
                    <button
                        onClick={handleCopyReferral}
                        className="bg-white text-green-600 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-green-50 transition-colors whitespace-nowrap"
                    >
                        Copiar Link
                    </button>
                    <button
                        onClick={() => {
                            const link = `${window.location.origin}/register?ref=${clubStatus.referralCode}`;
                            const msg = encodeURIComponent(`🎉 Venha fazer parte do *Ranking DBV*!\n\nUse meu código de indicação: *${clubStatus.referralCode}*\n\nLink: ${link}`);
                            window.open(`https://wa.me/?text=${msg}`, '_blank');
                        }}
                        className="bg-[#25D366] text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-[#128C7E] transition-colors whitespace-nowrap"
                    >
                        WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );
}
