import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { Calendar, MapPin, Upload, ChevronRight, ArrowLeft, Clock } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { format } from 'date-fns';

import { useAuth } from '../../contexts/AuthContext';

// Types (Mirrors backend)
interface RegionalEvent {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    participatingClubs?: { id: string, name: string }[];
    _count?: {
        requirements: number;
    }
}

interface Requirement {
    id: string;
    title: string;
    description: string;
    code?: string;
    points: number;
    type: 'TEXT' | 'FILE' | 'BOTH' | 'QUESTIONNAIRE' | 'NONE';
    startDate?: string;
    endDate?: string;
    questions?: any[];
    completed?: boolean;
    response?: any;
    eventResponses?: { status: string, completedAt?: string, answerText?: string, answerFileUrl?: string }[];
}

// ... imports ...

function ClubEventDetails({ eventId, onBack }: { eventId: string, onBack: () => void }) {
    const [answeringReq, setAnsweringReq] = useState<Requirement | null>(null);

    const { data: eventData } = useQuery({
        queryKey: ['regional-event-details', eventId],
        queryFn: async () => {
            const res = await api.get(`/regional-events/${eventId}`); // Now includes eventResponses
            return res.data;
        }
    });

    const requirements: Requirement[] = eventData?.requirements || [];

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* ... Header codes unchanged ... */}
            <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Eventos
            </button>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">{eventData?.title}</h1>
                <p className="text-slate-600">{eventData?.description}</p>
                <div className="flex gap-4 mt-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Início: {eventData?.startDate && format(new Date(eventData.startDate), 'dd/MM/yyyy')}</span>
                    {eventData?.endDate && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Fim: {format(new Date(eventData.endDate), 'dd/MM/yyyy')}</span>}
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-700">Requisitos</h2>
                {requirements.map(req => {
                    const response = req.eventResponses?.[0];
                    const status = response?.status || 'PENDING_SUBMISSION';
                    const isPendingApproval = status === 'PENDING';
                    const isApproved = status === 'APPROVED';
                    const isRejected = status === 'REJECTED';

                    // Display logic
                    let statusLabel = <span className="text-blue-600 text-xs font-bold flex items-center group-hover:translate-x-1 transition-transform">Responder <ChevronRight className="w-4 h-4 ml-1" /></span>;
                    if (isApproved) statusLabel = <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">Concluído</span>;
                    if (isPendingApproval && response) statusLabel = <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">Em Análise</span>;
                    if (isRejected) statusLabel = <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200">Rejeitado</span>;

                    return (
                        <div
                            key={req.id}
                            onClick={() => setAnsweringReq(req)}
                            className={`bg-white p-4 rounded-xl border shadow-sm cursor-pointer transition-all group ${isRejected ? 'border-red-300' : 'border-slate-200 hover:border-blue-400 hover:shadow-md'}`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{req.code || '#'}</span>
                                        <h3 className="font-bold text-slate-800">{req.title}</h3>
                                        {/* Type Badges */}
                                        {req.type === 'FILE' && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">Arquivo</span>}
                                        {req.type === 'TEXT' && <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100">Texto</span>}
                                    </div>
                                    <p className="text-slate-600 text-sm mb-3">{req.description}</p>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="font-bold text-blue-600">{req.points} Pontos</span>
                                        {req.endDate && <span className="flex items-center gap-1 text-orange-600"><Clock className="w-3 h-3" /> Prazo: {format(new Date(req.endDate), 'dd/MM/yyyy')}</span>}
                                    </div>
                                    {/* Show Response Preview if Rejected or Pending */}
                                    {(response && !isApproved) && (
                                        <div className="mt-3 bg-slate-50 p-2 rounded text-xs text-slate-600 border border-slate-100">
                                            {response.answerText && <div className="italic">"{response.answerText}"</div>}
                                            {response.answerFileUrl && <div className="text-blue-500 flex items-center gap-1 mt-1"><Upload className="w-3 h-3" /> Arquivo Enviado</div>}
                                        </div>
                                    )}
                                </div>
                                <div className="ml-4 flex flex-col items-end gap-2">
                                    {statusLabel}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {requirements.length === 0 && <p className="text-slate-500">Nenhum requisito listado.</p>}
            </div>

            {answeringReq && (
                <AnswerModal requirement={answeringReq} onClose={() => setAnsweringReq(null)} eventId={eventId} />
            )}
        </div>
    )
}

function AnswerModal({ requirement, onClose, eventId }: { requirement: Requirement, onClose: () => void, eventId: string }) {
    const queryClient = useQueryClient();
    const [textResponse, setTextResponse] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submitMutation = useMutation({
        mutationFn: async () => {
            let fileUrl = '';
            // 1. Upload File if present
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                const uploadRes = await api.post('/uploads', formData);
                fileUrl = uploadRes.data.url;
            }

            // 2. Submit Response
            return await api.post(`/regional-events/${eventId}/requirements/${requirement.id}/response`, {
                text: textResponse,
                file: fileUrl
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regional-event-details', eventId] });
            import('sonner').then(({ toast }) => toast.success('Resposta enviada com sucesso!'));
            onClose();
        },
        onError: () => {
            import('sonner').then(({ toast }) => toast.error('Erro ao enviar resposta.'));
        },
        onSettled: () => setIsSubmitting(false)
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        submitMutation.mutate();
    }

    return (
        <Modal isOpen={true} onClose={onClose} title={`Responder: ${requirement.title}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-slate-50 p-3 rounded text-sm text-slate-600 mb-4">
                    {requirement.description}
                </div>

                {(requirement.type === 'TEXT' || requirement.type === 'BOTH') && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sua Resposta</label>
                        <textarea
                            value={textResponse}
                            onChange={e => setTextResponse(e.target.value)}
                            className="w-full border rounded p-2 h-32"
                            placeholder="Digite sua resposta..."
                            required={requirement.type === 'TEXT'}
                        />
                    </div>
                )}

                {(requirement.type === 'FILE' || requirement.type === 'BOTH') && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Anexar Comprovante</label>
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                onChange={e => setFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                required={requirement.type === 'FILE' && !textResponse}
                            />
                            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-600">{file ? file.name : 'Clique para selecionar um arquivo'}</p>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-4">
                    <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50">
                        {isSubmitting ? 'Enviando...' : 'Enviar Resposta'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

export function ClubRegionalEvents() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    // Fetch Events available for this Club
    const { data: events = [], isLoading } = useQuery<RegionalEvent[]>({
        queryKey: ['club-regional-events'],
        queryFn: async () => {
            const res = await api.get('/regional-events');
            return res.data;
        }
    });

    const subscribeMutation = useMutation({
        mutationFn: async (eventId: string) => await api.post(`/regional-events/${eventId}/subscribe`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['club-regional-events'] });
            import('sonner').then(({ toast }) => toast.success('Inscrição confirmada!'));
        },
        onError: () => {
            import('sonner').then(({ toast }) => toast.error('Erro ao realizar inscrição.'));
        }
    });

    if (selectedEventId) {
        return <ClubEventDetails eventId={selectedEventId} onBack={() => setSelectedEventId(null)} />;
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <MapPin className="text-blue-600" />
                    Eventos Regionais
                </h1>
                <p className="text-slate-500">Participe dos eventos da sua região e cumpra os requisitos.</p>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.map(event => {
                        const isSubscribed = event.participatingClubs?.some(c => c.id === user?.clubId);

                        return (
                            <div
                                key={event.id}
                                className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 transition-all cursor-pointer group ${isSubscribed ? 'hover:border-blue-300' : 'hover:border-slate-300'}`}
                                onClick={() => {
                                    if (isSubscribed) setSelectedEventId(event.id);
                                }}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(event.startDate), 'dd/MM/yyyy')}
                                    </div>
                                    {isSubscribed && <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Inscrito</div>}
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 mb-1 group-hover:text-blue-700 transition-colors">{event.title}</h3>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">{event.description}</p>

                                <div className="flex items-center justify-between mt-auto pt-3 border-t">
                                    <span className="text-xs text-slate-500 font-medium">
                                        {event._count?.requirements || 0} Requisitos
                                    </span>
                                    {isSubscribed ? (
                                        <span className="text-blue-600 text-sm font-bold flex items-center group-hover:translate-x-1 transition-transform">
                                            Acessar <ChevronRight className="w-4 h-4 ml-1" />
                                        </span>
                                    ) : (
                                        !user?.clubId ? (
                                            <span className="text-xs text-red-500 font-bold border border-red-200 bg-red-50 px-2 py-1 rounded">
                                                Erro: Clube não identificado
                                            </span>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Deseja inscrever seu clube neste evento?')) subscribeMutation.mutate(event.id);
                                                }}
                                                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-3 py-1.5 rounded transition-colors"
                                            >
                                                Inscrever-se
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {events.length === 0 && (
                        <div className="col-span-full text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                            Nenhum evento disponível para sua região no momento.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}




