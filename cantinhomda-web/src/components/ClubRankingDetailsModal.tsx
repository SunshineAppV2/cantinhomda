import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../lib/axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Calendar, Paperclip, RotateCcw, Trash2 } from 'lucide-react';
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
    answerFileUrl?: string | null;
    eventId?: string;
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

    // Actions
    const handleRevoke = async (detail: RankingDetail) => {
        if (!detail.eventId) return toast.error('Evento não identificado para esta ação.');
        if (!confirm('Tem certeza que deseja REVOGAR a aprovação deste item? Ele voltará para "Pendente" e os pontos serão removidos temporariamente.')) return;

        try {
            await api.post(`/regional-events/${detail.eventId}/responses/${detail.id}/revoke`);
            toast.success('Aprovação revogada com sucesso!');
            fetchDetails(); // Refresh list/points
        } catch (error) {
            console.error('Erro ao revogar:', error);
            toast.error('Erro ao revogar aprovação. Verifique suas permissões.');
        }
    };

    const handleDelete = async (detail: RankingDetail) => {
        if (!detail.eventId) return toast.error('Evento não identificado para esta ação.');
        if (!confirm('ATENÇÃO: Tem certeza que deseja EXCLUIR este histórico? Esta ação não pode ser desfeita.')) return;

        try {
            await api.delete(`/regional-events/${detail.eventId}/responses/${detail.id}`);
            toast.success('Histórico excluído com sucesso!');
            fetchDetails(); // Refresh list/points
        } catch (error) {
            console.error('Erro ao excluir:', error);
            toast.error('Erro ao excluir histórico. Verifique suas permissões.');
        }
    };

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
                                    <th className="px-4 py-3 text-center">Anexo</th>
                                    <th className="px-4 py-3 text-right">Pontos</th>
                                    <th className="px-4 py-3 text-center">Ações</th>
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
                                        <td className="px-4 py-3 text-center">
                                            {item.answerFileUrl ? (
                                                <a
                                                    href={item.answerFileUrl.startsWith('http') ? item.answerFileUrl : `${'https://cantinhomda-backend.onrender.com'}${item.answerFileUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                                    title="Ver anexo"
                                                >
                                                    <Paperclip className="w-4 h-4" />
                                                </a>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                                            {item.points}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleRevoke(item)}
                                                    className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
                                                    title="Revogar Aprovação (Voltar para Pendente)"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                    title="Excluir Histórico Permanentemente"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
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
