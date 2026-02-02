import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { Calendar, MapPin, Upload, ChevronRight, ArrowLeft, Clock, CheckCircle2, AlertCircle, XCircle, FileText, Trophy, Hourglass, AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { format, differenceInHours, parseISO } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

// --- Types ---
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

interface EventResponse {
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    completedAt?: string;
    answerText?: string;
    answerFileUrl?: string;
    comments?: string; // Rejection reason
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
    eventResponses?: EventResponse[];
}

// --- Components ---

function ProgressBar({ current, total }: { current: number, total: number }) {
    const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
    return (
        <div className="w-full bg-slate-200 rounded-full h-2.5 mb-1 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
        </div>
    );
}

function StatusBadge({ status, comments }: { status: string, comments?: string }) {
    if (status === 'APPROVED') return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Concluído</span>;
    if (status === 'PENDING') return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200 flex items-center gap-1"><Hourglass className="w-3 h-3" /> Em Análise</span>;
    if (status === 'REJECTED') return (
        <div className="flex flex-col items-end">
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejeitado</span>
            {comments && <span className="text-[10px] text-red-600 mt-1 max-w-[150px] text-right leading-tight">Motivo: {comments}</span>}
        </div>
    );
    return <span className="text-slate-500 text-xs">Pendente</span>;
}

function AnswerModal({ requirement, onClose, eventId, existingResponse }: { requirement: Requirement, onClose: () => void, eventId: string, existingResponse?: EventResponse | null }) {
    const queryClient = useQueryClient();
    const [textResponse, setTextResponse] = useState(existingResponse?.answerText || '');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Load initial file name if exists (mocking it visually)
    const initialFileName = existingResponse?.answerFileUrl ? existingResponse.answerFileUrl.split('/').pop() : null;

    const submitMutation = useMutation({
        mutationFn: async () => {
            let fileUrl = existingResponse?.answerFileUrl || '';

            // 1. Upload File if present (and changed)
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                try {
                    const uploadRes = await api.post('/uploads', formData);
                    fileUrl = uploadRes.data.url;
                } catch (err: any) {
                    console.error("Upload failed in frontend:", err);
                    throw new Error("Falha ao fazer upload do arquivo. Verifique o tamanho (max 2MB).");
                }
            }

            // 2. Submit Response
            return await api.post(`/regional-events/${eventId}/requirements/${requirement.id}/response`, {
                text: textResponse,
                file: fileUrl
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regional-event-details', eventId] });
            toast.success('Resposta enviada com sucesso!');
            onClose();
        },
        onError: (err: any) => {
            console.error("Submit failed:", err);
            toast.error(err.message || 'Erro ao enviar resposta.');
        },
        onSettled: () => setIsSubmitting(false)
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        submitMutation.mutate();
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={existingResponse ? `Editar Resposta: ${requirement.title}` : `Responder: ${requirement.title}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-slate-50 p-3 rounded text-sm text-slate-600 mb-4 border border-slate-100">
                    <p className="font-semibold text-slate-700 mb-1">Descrição:</p>
                    {requirement.description}
                </div>

                {existingResponse?.status === 'REJECTED' && existingResponse.comments && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-red-700 text-sm mb-4 flex gap-2">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <div>
                            <p className="font-bold">Sua resposta anterior foi rejeitada:</p>
                            <p>{existingResponse.comments}</p>
                        </div>
                    </div>
                )}

                {(requirement.type === 'TEXT' || requirement.type === 'BOTH') && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sua Resposta (Texto)</label>
                        <textarea
                            value={textResponse}
                            onChange={e => setTextResponse(e.target.value)}
                            className="w-full border rounded p-2 h-32 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                            placeholder="Descreva a realização do requisito aqui..."
                            required={requirement.type === 'TEXT'}
                        />
                    </div>
                )}

                {(requirement.type === 'FILE' || requirement.type === 'BOTH') && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Anexar Comprovante (PDF/Imagem/Vídeo)</label>
                        <div
                            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer relative ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:bg-slate-50'}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <input
                                type="file"
                                onChange={e => setFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                required={requirement.type === 'FILE' && !existingResponse?.answerFileUrl && !textResponse} // Require if new
                            />
                            <div className="flex flex-col items-center pointer-events-none">
                                <Upload className={`w-8 h-8 mb-2 ${dragActive ? 'text-blue-500' : 'text-slate-400'}`} />
                                <p className="text-sm text-slate-600 font-medium">
                                    {file ? file.name : (initialFileName ? `Arquivo Atual: ${initialFileName} (Arraste outro para trocar)` : 'Clique ou Arraste o arquivo aqui')}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">Máx: 2MB</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between pt-4 border-t mt-4">
                    <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700 font-medium text-sm">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-6 py-2 rounded-lg font-bold text-white shadow-sm transition-all transform active:scale-95 ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'}`}
                    >
                        {isSubmitting ? 'Enviando...' : (existingResponse ? 'Atualizar Resposta' : 'Enviar Resposta')}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

function ClubEventDetails({ eventId, onBack }: { eventId: string, onBack: () => void }) {
    const [answeringReq, setAnsweringReq] = useState<Requirement | null>(null);
    const { user } = useAuth();

    // Debug info
    useEffect(() => {
        console.log(`[Frontend] Viewing Event ${eventId} as User: ${user?.email}, ClubID: ${user?.clubId}, Role: ${user?.role}`);
    }, [eventId, user]);

    const { data: eventData, isLoading } = useQuery({
        queryKey: ['regional-event-details', eventId],
        queryFn: async () => {
            const res = await api.get(`/regional-events/${eventId}`);
            return res.data;
        }
    });

    if (isLoading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

    const requirements: Requirement[] = eventData?.requirements || [];

    // Stats Calculation
    const totalPoints = requirements.reduce((acc, r) => acc + r.points, 0);
    const earnedPoints = requirements.reduce((acc, r) => {
        const approved = r.eventResponses?.some(er => er.status === 'APPROVED');
        return approved ? acc + r.points : acc;
    }, 0);
    const completedCount = requirements.filter(r => r.eventResponses?.some(er => er.status === 'APPROVED')).length;

    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium">
                <ArrowLeft className="w-5 h-5 mr-1" /> Voltar para Eventos
            </button>

            {/* Header Card with Stats */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 mb-2">{eventData?.title}</h1>
                            <p className="text-slate-600 max-w-2xl">{eventData?.description}</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex flex-col items-center min-w-[150px]">
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Pontuação</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-blue-600">{earnedPoints}</span>
                                <span className="text-sm text-slate-400 font-bold">/ {totalPoints}</span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1">
                            <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                <span>Progresso do Clube</span>
                                <span>{percentage}%</span>
                            </div>
                            <ProgressBar current={earnedPoints} total={totalPoints} />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 border-t pt-4">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Início: {eventData?.startDate && format(parseISO(eventData.startDate), 'dd/MM/yyyy')}</span>
                        {eventData?.endDate && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Fim: {format(parseISO(eventData.endDate), 'dd/MM/yyyy')}</span>}
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> {completedCount} de {requirements.length} Concluídos</span>
                    </div>
                </div>
            </div>

            {/* Requirements List */}
            <div className="grid gap-4">
                <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-indigo-600" /> Requisitos
                </h2>

                {requirements.map(req => {
                    const response = req.eventResponses?.[0];
                    const status = response?.status || 'PENDING_SUBMISSION'; // Custom status for 'Not Started'
                    const isRejected = status === 'REJECTED';
                    const isApproved = status === 'APPROVED';
                    const isPending = status === 'PENDING';

                    // Deadline Warning
                    let deadlineWarning = null;
                    if (req.endDate && !isApproved) {
                        const hoursLeft = differenceInHours(parseISO(req.endDate), new Date());
                        if (hoursLeft > 0 && hoursLeft < 48) {
                            deadlineWarning = <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded flex items-center gap-1"><Clock className="w-3 h-3" /> Faltam {Math.ceil(hoursLeft / 24)} dias</span>
                        } else if (hoursLeft < 0) {
                            deadlineWarning = <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Expirado</span>
                        }
                    }

                    return (
                        <div
                            key={req.id}
                            onClick={() => {
                                if (isApproved) return; // Don't allow editing approved
                                setAnsweringReq(req);
                            }}
                            className={`bg-white p-5 rounded-xl border shadow-sm transition-all group relative overflow-hidden ${isApproved
                                ? 'border-green-200 bg-green-50/30 opacity-90'
                                : isRejected
                                    ? 'border-red-300 hover:border-red-400 hover:shadow-md cursor-pointer'
                                    : 'border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer'
                                }`}
                        >
                            {/* Status Stripe */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isApproved ? 'bg-green-500' : isRejected ? 'bg-red-500' : isPending ? 'bg-orange-400' : 'bg-slate-300'}`}></div>

                            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center pl-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 tracking-tight">{req.code || '#'}</span>
                                        <h3 className={`font-bold text-lg ${isApproved ? 'text-green-800' : 'text-slate-800'}`}>{req.title}</h3>
                                        {/* Badges */}
                                        {req.type === 'FILE' && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 uppercase font-bold">Arquivo</span>}
                                        {req.type === 'TEXT' && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 uppercase font-bold">Texto</span>}
                                        {deadlineWarning}
                                    </div>
                                    <p className="text-slate-600 text-sm mb-2">{req.description}</p>

                                    {/* Score Info */}
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                        <Trophy className="w-3 h-3 text-yellow-500" />
                                        <span>Vale {req.points} Pontos</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <StatusBadge status={status} comments={response?.comments} />

                                    {/* Action Call */}
                                    {!isApproved && (
                                        <div className="mt-1">
                                            {isRejected ? (
                                                <button className="text-red-600 text-sm font-bold flex items-center hover:underline">
                                                    Corrigir <ChevronRight className="w-4 h-4 ml-1" />
                                                </button>
                                            ) : isPending ? (
                                                <button className="text-orange-600 text-sm font-bold flex items-center hover:underline">
                                                    Editar Envio <ChevronRight className="w-4 h-4 ml-1" />
                                                </button>
                                            ) : (
                                                <button className="text-blue-600 text-sm font-bold flex items-center group-hover:translate-x-1 transition-transform">
                                                    Responder <ChevronRight className="w-4 h-4 ml-1" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {requirements.length === 0 && <p className="text-slate-500 text-center py-8">Nenhum requisito listado.</p>}
            </div>

            {answeringReq && (
                <AnswerModal
                    requirement={answeringReq}
                    existingResponse={answeringReq.eventResponses?.[0]}
                    onClose={() => setAnsweringReq(null)}
                    eventId={eventId}
                />
            )}
        </div>
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
            toast.success('Inscrição confirmada! Agora você pode ver os requisitos.');
        },
        onError: (err: any) => {
            console.error("Subscribe Error:", err);
            toast.error(err.response?.data?.message || 'Erro ao realizar inscrição. Contate o suporte.');
        }
    });

    if (selectedEventId) {
        return <ClubEventDetails eventId={selectedEventId} onBack={() => setSelectedEventId(null)} />;
    }

    return (
        <div className="space-y-6 animate-fadeIn p-2 md:p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <MapPin className="text-blue-600" />
                    Painel do Clube - Eventos
                </h1>
                <p className="text-slate-500">Participe dos eventos e ganhe pontos para o ranking do seu clube.</p>
                {!user?.clubId && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-4">
                        ⚠️ Erro Crítico: Seu usuário não está vinculado a um Clube. Contate o suporte.
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => {
                        const isSubscribed = event.participatingClubs?.some(c => c.id === user?.clubId);

                        return (
                            <div
                                key={event.id}
                                className={`bg-white rounded-2xl shadow-sm border transition-all cursor-pointer group flex flex-col overflow-hidden ${isSubscribed ? 'border-blue-200 hover:border-blue-400 hover:shadow-lg' : 'border-slate-200 hover:border-slate-300'}`}
                                onClick={() => {
                                    if (isSubscribed) setSelectedEventId(event.id);
                                }}
                            >
                                <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(parseISO(event.startDate), 'dd/MM/yyyy')}
                                        </div>
                                        {isSubscribed ? (
                                            <div className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Inscrito
                                            </div>
                                        ) : (
                                            <div className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold">Necessário Inscrever</div>
                                        )}
                                    </div>

                                    <h3 className="font-bold text-xl text-slate-800 mb-2 group-hover:text-blue-700 transition-colors">{event.title}</h3>
                                    <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">{event.description}</p>

                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                                        <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                                            <Trophy className="w-4 h-4 text-yellow-500" />
                                            {event._count?.requirements || 0} Requisitos
                                        </span>

                                        {isSubscribed ? (
                                            <button className="bg-blue-50 text-blue-700 text-sm font-bold px-4 py-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center">
                                                Acessar <ChevronRight className="w-4 h-4 ml-1" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Deseja inscrever seu clube neste evento?')) subscribeMutation.mutate(event.id);
                                                }}
                                                className="bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-slate-800 shadow-md hover:shadow-lg transition-all"
                                                disabled={!user?.clubId}
                                            >
                                                Inscrever Clube
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {events.length === 0 && (
                        <div className="col-span-full text-center py-16 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                            <MapPin className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <p className="font-medium text-lg">Nenhum evento disponível.</p>
                            <p className="text-sm">Fique atento às novidades da sua região.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
