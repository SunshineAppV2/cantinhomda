import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../lib/axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Award, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface ClubRankingDetailsModalProps {
    clubId: string | null;
    clubName: string;
    isOpen: boolean;
    onClose: () => void;
    filters: {
        period: 'YEAR' | 'QUARTER' | 'MONTH';
        date: Date;
        eventId?: string;
        region?: string;
        district?: string;
        association?: string;
    };
}

interface RankingDetail {
    id: string;
    eventName: string;
    requirementTitle: string;
    points: number;
    date: string;
}

export function ClubRankingDetailsModal({ clubId, clubName, isOpen, onClose, filters }: ClubRankingDetailsModalProps) {
    const [details, setDetails] = useState<RankingDetail[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && clubId) {
            fetchDetails();
        }
    }, [isOpen, clubId, filters]); // Refetch if filters change while open (unlikely but good practice)

    const fetchDetails = async () => {
        if (!clubId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('period', filters.period);
            params.append('date', filters.date.toISOString());
            if (filters.eventId) params.append('eventId', filters.eventId);
            if (filters.region) params.append('region', filters.region);
            if (filters.district) params.append('district', filters.district);
            if (filters.association) params.append('association', filters.association);

            const response = await api.get(`/ranking-regional/details/${clubId}?${params.toString()}`);
            setDetails(response.data);
        } catch (error) {
            console.error('Erro ao buscar detalhes do clube:', error);
            toast.error('Não foi possível carregar o detalhamento de pontos.');
        } finally {
            setLoading(false);
        }
    };

    const totalPoints = details.reduce((sum, item) => sum + item.points, 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalhamento de Pontos: ${clubName}`} maxWidth="max-w-3xl">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                    <p className="text-slate-500">Carregando detalhes...</p>
                </div>
            ) : details.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    Nenhum ponto registrado para este clube no período selecionado.
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-indigo-50 p-4 rounded-lg flex justify-between items-center text-indigo-900 border border-indigo-100">
                        <div className="flex gap-4 items-center">
                            <span className="font-semibold">Total no Período:</span>
                            <span className="font-bold text-xl">{totalPoints.toLocaleString()} pontos</span>
                        </div>
                    </div>

                    <div className="overflow-hidden border border-slate-100 rounded-lg max-h-[60vh] overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3">Evento</th>
                                    <th className="px-4 py-3">Requisito</th>
                                    <th className="px-4 py-3 text-right">Pontos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {details.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3 h-3 text-slate-400" />
                                                {format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR })}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-700">
                                            {item.eventName}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {item.requirementTitle}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                                            {item.points}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Modal>
    );
}
