import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { Plus, Calendar, MapPin, Trash2, Pencil, ChevronRight, ArrowLeft } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

// Types
interface RegionalEvent {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    region?: string;
    district?: string;
    _count?: {
        requirements: number;
    }
}

export function RegionalEventsManager() {
    // const { user } = useAuth(); // Not needed in parent anymore if only used in sub-component?
    // Actually, parent manages EVENTS (Add/Edit/Delete Event).
    // So parent DOES need permission check for Event buttons.
    const { user } = useAuth();
    const isCoordinator = user?.role === 'COORDINATOR_REGIONAL' || user?.role === 'COORDINATOR_DISTRICT' || user?.role === 'MASTER';
    // const canManageEvents = isCoordinator; // Removing unused variable warning if only used in conditional rendering below.
    // Wait, I need to USE it in the JSX.


    const canManageEvents = isCoordinator;

    // Redirect or Show simplified view if not coordinator? 
    // Actually, this component is likely protected by a Route Guard, but let's reinforce.

    const queryClient = useQueryClient();
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    // --- EVENTS VIEW STATE ---
    const { data: events = [] } = useQuery<RegionalEvent[]>({
        queryKey: ['regional-events'],
        queryFn: async () => {
            const res = await api.get('/regional-events');
            return res.data;
        }
    });

    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDesc, setEventDesc] = useState('');
    const [eventStart, setEventStart] = useState('');
    const [eventEnd, setEventEnd] = useState('');
    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    const createEventMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/regional-events', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regional-events'] });
            closeEventModal();
            import('sonner').then(({ toast }) => toast.success('Evento criado com sucesso!'));
        }
    });

    const updateEventMutation = useMutation({
        mutationFn: async (data: { id: string, payload: any }) => await api.patch(`/regional-events/${data.id}`, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regional-events'] });
            closeEventModal();
            import('sonner').then(({ toast }) => toast.success('Evento atualizado!'));
        }
    });

    const deleteEventMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/regional-events/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regional-events'] });
            import('sonner').then(({ toast }) => toast.success('Evento excluído!'));
        }
    });

    const closeEventModal = () => {
        setIsEventModalOpen(false);
        setEventTitle('');
        setEventDesc('');
        setEventStart('');
        setEventEnd('');
        setEditingEventId(null);
    }

    const handleSaveEvent = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            title: eventTitle,
            description: eventDesc,
            startDate: eventStart ? new Date(eventStart).toISOString() : new Date().toISOString(),
            endDate: eventEnd ? new Date(eventEnd).toISOString() : null
        };

        if (editingEventId) {
            updateEventMutation.mutate({ id: editingEventId, payload });
        } else {
            createEventMutation.mutate(payload);
        }
    }

    const openCreateEvent = () => {
        setEditingEventId(null);
        setEventTitle('');
        setEventDesc('');
        setEventStart('');
        setEventEnd('');
        setIsEventModalOpen(true);
    }

    const openEditEvent = (evt: RegionalEvent) => {
        setEditingEventId(evt.id);
        setEventTitle(evt.title);
        setEventDesc(evt.description || '');
        setEventStart(evt.startDate.split('T')[0]);
        setEventEnd(evt.endDate ? evt.endDate.split('T')[0] : '');
        setIsEventModalOpen(true);
    }

    // --- RENDER ---

    if (selectedEventId) {
        // Show Requirements Manager for THIS Event
        const event = events.find(e => e.id === selectedEventId);
        return (
            <div className="space-y-4 animate-fadeIn">
                <button onClick={() => setSelectedEventId(null)} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Eventos
                </button>
                <div className="border-b pb-4 mb-4">
                    <h1 className="text-2xl font-bold text-slate-800">{event?.title}</h1>
                    <p className="text-slate-500 text-sm">Gerenciando requisitos para este evento</p>
                </div>
                {/* Embed Requirement Manager passing the eventId */}
                <EventRequirementsManager eventId={selectedEventId} />
            </div>
        );
    }

    // LIST
    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <MapPin className="text-blue-600" />
                        Eventos Regionais / Distritais
                    </h1>
                    <p className="text-slate-500">Crie eventos e atribua requisitos aos clubes.</p>
                </div>
                {canManageEvents && (
                    <button
                        onClick={openCreateEvent}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <Plus className="w-5 h-5" /> Novo Evento
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map(event => (
                    <div key={event.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <div className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(event.startDate), 'dd/MM/yyyy')}
                            </div>
                            {canManageEvents && (
                                <div className="flex gap-1">
                                    <button onClick={() => openEditEvent(event)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => { if (confirm('Excluir evento?')) deleteEventMutation.mutate(event.id) }} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            )}
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 mb-1">{event.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">{event.description}</p>

                        <div className="flex items-center justify-between mt-auto pt-3 border-t">
                            <span className="text-xs text-slate-500 font-medium">
                                {event._count?.requirements || 0} Requisitos
                            </span>
                            <button
                                onClick={() => setSelectedEventId(event.id)}
                                className="text-blue-600 text-sm font-bold flex items-center hover:underline"
                            >
                                Gerenciar <ChevronRight className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                    </div>
                ))}
                {events.length === 0 && (
                    <div className="col-span-full text-center py-10 text-slate-400">
                        Nenhum evento criado. Clique em "Novo Evento" para começar.
                    </div>
                )}
            </div>

            <Modal isOpen={isEventModalOpen} onClose={closeEventModal} title={editingEventId ? "Editar Evento" : "Novo Evento"}>
                <form onSubmit={handleSaveEvent} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Título do Evento</label>
                        <input required type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)} className="w-full border rounded-lg p-2" placeholder="Ex: Campori 2026" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <textarea value={eventDesc} onChange={e => setEventDesc(e.target.value)} className="w-full border rounded-lg p-2" rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Início</label>
                            <input required type="date" value={eventStart} onChange={e => setEventStart(e.target.value)} className="w-full border rounded-lg p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fim (Opcional)</label>
                            <input type="date" value={eventEnd} onChange={e => setEventEnd(e.target.value)} className="w-full border rounded-lg p-2" />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700">Salvar Evento</button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

// --- SUB-COMPONENT: REQUIREMENT MANAGER FOR EVENT ---
function EventRequirementsManager({ eventId }: { eventId: string }) {
    const { user } = useAuth();
    const isCoordinator = user?.role === 'COORDINATOR_REGIONAL' || user?.role === 'COORDINATOR_DISTRICT' || user?.role === 'MASTER';
    const canManageEvents = isCoordinator;

    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReqId, setEditingReqId] = useState<string | null>(null);

    // Create/Edit States
    const [reqDescription, setReqDescription] = useState('');
    const [reqCode, setReqCode] = useState('');
    const [reqTitle, setReqTitle] = useState('');
    const [reqPoints, setReqPoints] = useState(0);
    const [reqType, setReqType] = useState<'TEXT' | 'FILE' | 'BOTH' | 'QUESTIONNAIRE' | 'NONE'>('NONE');
    const [reqStart, setReqStart] = useState('');
    const [reqEnd, setReqEnd] = useState('');

    // Scope States
    const [reqScope, setReqScope] = useState<'ALL' | 'SPECIFIC'>('ALL');
    const [selectedTargetClub, setSelectedTargetClub] = useState<string | null>(null);

    // Fetch Clubs for dropdown
    const { data: clubs = [], isLoading: clubsLoading } = useQuery<{ id: string, name: string }[]>({
        queryKey: ['regional-clubs'],
        queryFn: async () => {
            const res = await api.get('/clubs');
            return res.data;
        },
        enabled: isModalOpen // Fetch when modal opens
    });

    // Fetch Requirements for this Event
    const { data: requirements = [] } = useQuery({
        queryKey: ['event-requirements', eventId],
        queryFn: async () => {
            const res = await api.get('/requirements');
            // Filter locally for now
            return (res.data as any[]).filter((r: any) => r.regionalEventId === eventId);
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/requirements', { ...data, regionalEventId: eventId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-requirements', eventId] });
            queryClient.invalidateQueries({ queryKey: ['regional-events'] });
            closeModal();
            import('sonner').then(({ toast }) => toast.success('Requisito adicionado ao evento!'));
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: { id: string, payload: any }) => await api.patch(`/requirements/${data.id}`, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-requirements', eventId] });
            closeModal();
            import('sonner').then(({ toast }) => toast.success('Requisito atualizado!'));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/requirements/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-requirements', eventId] });
            import('sonner').then(({ toast }) => toast.success('Requisito removido!'));
        }
    });

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingReqId(null);
        setReqCode('');
        setReqTitle('');
        setReqDescription('');
        setReqPoints(0);
        setReqType('NONE');
        setReqStart('');
        setReqEnd('');
        setReqScope('ALL');
        setSelectedTargetClub(null);
    }

    const openCreate = () => {
        closeModal(); // Reset fields
        setIsModalOpen(true);
    }

    const openEdit = (req: any) => {
        setEditingReqId(req.id);
        setReqCode(req.code || '');
        setReqTitle(req.title || '');
        setReqDescription(req.description || '');
        setReqPoints(req.points || 0);
        setReqType(req.type || 'NONE');
        setReqStart(req.startDate ? req.startDate.split('T')[0] : '');
        setReqEnd(req.endDate ? req.endDate.split('T')[0] : '');

        if (req.clubId) {
            setReqScope('SPECIFIC');
            setSelectedTargetClub(req.clubId);
        } else {
            setReqScope('ALL');
            setSelectedTargetClub(null);
        }

        setIsModalOpen(true);
    }

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            description: reqDescription,
            code: reqCode,
            title: reqTitle,
            points: reqPoints,
            type: reqType === 'NONE' ? undefined : reqType,
            startDate: reqStart ? new Date(reqStart).toISOString() : null,
            endDate: reqEnd ? new Date(reqEnd).toISOString() : null,
            clubId: reqScope === 'SPECIFIC' ? selectedTargetClub : null
        };

        if (editingReqId) {
            updateMutation.mutate({ id: editingReqId, payload });
        } else {
            createMutation.mutate(payload);
        }
    }

    return (
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-700">Requisitos do Evento</h2>
                {canManageEvents && (
                    <button onClick={openCreate} className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center hover:bg-slate-50"><Plus className="w-4 h-4 mr-1" /> Adicionar Requisito</button>
                )}
            </div>

            <div className="space-y-3">
                {requirements.map((req: any) => (
                    <div key={req.id} className="bg-white p-3 rounded border border-slate-200 flex justify-between items-center">
                        <div>
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                                {req.code} {req.title}
                                {req.clubId && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 rounded border border-purple-200">Exclusivo</span>}
                            </div>
                            <div className="text-sm text-slate-500">{req.description}</div>
                            <div className="flex gap-2 text-xs mt-1">
                                <span className="font-bold text-blue-600">{req.points} Pontos</span>
                                {(req.startDate || req.endDate) && (
                                    <span className="text-slate-400">
                                        {req.startDate && format(new Date(req.startDate), 'dd/MM')}
                                        {req.endDate && ` - ${format(new Date(req.endDate), 'dd/MM')}`}
                                    </span>
                                )}
                            </div>
                        </div>
                        {canManageEvents && (
                            <div className="flex items-center gap-1">
                                <button onClick={() => openEdit(req)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors" title="Editar">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => { if (confirm('Remover?')) deleteMutation.mutate(req.id) }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {requirements.length === 0 && <p className="text-center text-slate-400 text-sm">Nenhum requisito neste evento.</p>}
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingReqId ? "Editar Requisito" : "Adicionar Requisito"}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Código (Opcional)</label>
                            <input type="text" value={reqCode} onChange={e => setReqCode(e.target.value)} className="w-full border rounded p-2" placeholder="Ex: I.1" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                            <input type="text" value={reqTitle} onChange={e => setReqTitle(e.target.value)} className="w-full border rounded p-2" placeholder="Ex: Inscrição" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <textarea required value={reqDescription} onChange={e => setReqDescription(e.target.value)} className="w-full border rounded p-2" rows={3} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Pontos</label>
                            <input type="number" value={reqPoints} onChange={e => setReqPoints(Number(e.target.value))} className="w-full border rounded p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Início (Opcional)</label>
                            <input type="date" value={reqStart} onChange={e => setReqStart(e.target.value)} className="w-full border rounded p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fim (Opcional)</label>
                            <input type="date" value={reqEnd} onChange={e => setReqEnd(e.target.value)} className="w-full border rounded p-2" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Resposta</label>
                        <select value={reqType} onChange={(e: any) => setReqType(e.target.value)} className="w-full border rounded p-2">
                            <option value="NONE">Apenas Texto (Informativo)</option>
                            <option value="TEXT">Texto</option>
                            <option value="FILE">Arquivo / Foto</option>
                            <option value="BOTH">Texto + Arquivo</option>
                        </select>
                    </div>

                    {/* Scope Selector */}
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Para quem é este requisito?</label>
                        <div className="flex gap-4 mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" checked={reqScope === 'ALL'} onChange={() => setReqScope('ALL')} className="text-blue-600" />
                                <span className="text-sm">Todos os Clubes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" checked={reqScope === 'SPECIFIC'} onChange={() => setReqScope('SPECIFIC')} className="text-blue-600" />
                                <span className="text-sm">Clube Específico</span>
                            </label>
                        </div>

                        {reqScope === 'SPECIFIC' && (
                            <div>
                                <select
                                    required
                                    value={selectedTargetClub || ''}
                                    onChange={e => setSelectedTargetClub(e.target.value)}
                                    className="w-full border rounded p-2 text-sm"
                                >
                                    <option value="">Selecione o Clube...</option>
                                    {clubs.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                {clubs.length === 0 && !clubsLoading && <p className="text-xs text-red-500 mt-1">Carregando clubes...</p>}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold">Salvar Requisito</button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
