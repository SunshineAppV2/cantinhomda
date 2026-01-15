
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { Award, CheckCircle, Clock } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { Modal } from '../../components/Modal';

export function ReferralControl() {
    const [selectedReferrer, setSelectedReferrer] = useState<any | null>(null);

    const { data: stats, isLoading } = useQuery({
        queryKey: ['referral-stats'],
        queryFn: async () => {
            const res = await api.get('/clubs/admin/referrals');
            return res.data;
        }
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-8 h-8 text-indigo-600" />
                Controle de Indicações
            </h1>

            {!stats || stats.length === 0 ? (
                <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200">
                    <p className="text-slate-500">Nenhum registro de indicação encontrado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stats.map((referrer: any) => (
                        <div
                            key={referrer.referrerId}
                            onClick={() => setSelectedReferrer(referrer)}
                            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">{referrer.referrerName}</h3>
                                    <p className="text-sm text-slate-500">{referrer.referrerDirector}</p>
                                </div>
                                <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                                    {Math.round((referrer.validatedIndications / referrer.totalIndications) * 100)}% Conv.
                                </div>
                            </div>

                            <div className="flex gap-4 border-t border-slate-100 pt-4">
                                <div className="text-center flex-1">
                                    <span className="block text-2xl font-bold text-slate-800">{referrer.totalIndications}</span>
                                    <span className="text-xs text-slate-500">Indicados</span>
                                </div>
                                <div className="text-center flex-1 border-l border-slate-100">
                                    <span className="block text-2xl font-bold text-green-600">{referrer.validatedIndications}</span>
                                    <span className="text-xs text-slate-500">Validados</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Details Modal */}
            <Modal
                isOpen={!!selectedReferrer}
                onClose={() => setSelectedReferrer(null)}
                title={`Indicações: ${selectedReferrer?.referrerName}`}
            >
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {selectedReferrer?.details?.map((detail: any) => (
                        <div key={detail.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div>
                                <h4 className="font-bold text-slate-800">{detail.name}</h4>
                                <p className="text-sm text-slate-600">{detail.director} • {detail.mobile}</p>
                                <p className="text-xs text-slate-400">{new Date(detail.date).toLocaleDateString()}</p>
                            </div>
                            <div>
                                {detail.status === 'ACTIVE' ? (
                                    <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded-full">
                                        <CheckCircle className="w-3 h-3" /> Validado
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-orange-600 text-xs font-bold bg-orange-100 px-2 py-1 rounded-full">
                                        <Clock className="w-3 h-3" /> {detail.status}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
}
