import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { Plus, BookOpen, Search, Trash2, Pencil, MapPin } from 'lucide-react';
import { Modal } from '../../components/Modal';

// Types
interface Requirement {
    id: string;
    description: string;
    title?: string;
    points?: number;
    startDate?: string;
    endDate?: string;
    code?: string;
    dbvClass?: string;
    area?: string;
    type?: 'TEXT' | 'FILE' | 'BOTH' | 'QUESTIONNAIRE';
    questions?: Question[];
    region?: string | null;
}

interface Question {
    questionText: string;
    options: string[];
    correctIndex: number;
}

const DBV_CLASSES = [
    'AMIGO', 'COMPANHEIRO', 'PESQUISADOR',
    'PIONEIRO', 'EXCURSIONISTA', 'GUIA'
];

const AREAS = [
    "I. GERAIS",
    "II. DESCOBERTA ESPIRITUAL",
    "III. SERVINDO A OUTROS",
    "IV. DESENVOLVENDO AMIZADE",
    "V. SAÚDE E APTIDÃO FÍSICA",
    "VI. ORGANIZAÇÃO E LIDERANÇA",
    "VII. ESTUDO DA NATUREZA",
    "VIII. ARTE DE ACAMPAR",
    "IX. ESTILO DE VIDA",
    "X. CLASSE AVANÇADA"
];

export function RegionalRequirements() {
    const queryClient = useQueryClient();

    const [selectedClass, setSelectedClass] = useState<string>('AMIGO');
    const [search, setSearch] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reqTitle, setReqTitle] = useState('');
    const [reqDescription, setReqDescription] = useState('');
    const [reqCode, setReqCode] = useState('');
    const [reqArea, setReqArea] = useState('');
    const [reqPoints, setReqPoints] = useState(0);
    const [reqStart, setReqStart] = useState('');
    const [reqEnd, setReqEnd] = useState('');
    const [reqScope, setReqScope] = useState<'ALL' | 'SPECIFIC'>('ALL');
    const [selectedTargetClub, setSelectedTargetClub] = useState<string | null>(null);

    const [editingReqId, setEditingReqId] = useState<string | null>(null);
    const [reqType, setReqType] = useState<'TEXT' | 'FILE' | 'BOTH' | 'QUESTIONNAIRE' | 'NONE'>('NONE');
    const [questions, setQuestions] = useState<Question[]>([]);

    // Fetch Clubs for dropdown
    const { data: clubs = [], isLoading: clubsLoading } = useQuery<{ id: string, name: string }[]>({
        queryKey: ['regional-clubs'], // Add region dependency if needed? Usually user filtered
        queryFn: async () => {
            // Coordinator can list clubs. Endpoint might need adjustment?
            // Assuming /clubs endpoint returns clubs visible to user (Coordinators see their region's clubs)
            // Let's verify /clubs endpoint later. For now assume standard list.
            const res = await api.get('/clubs');
            return res.data;
        },
        enabled: isModalOpen // Fetch when modal opens
    });

    const addQuestion = () => {
        setQuestions([...questions, { questionText: '', options: ['', '', '', ''], correctIndex: 0 }]);
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    // Fetch Requirements - Backend filter logic will include Regional ones
    const { data: requirements = [], isLoading } = useQuery<Requirement[]>({
        queryKey: ['regional-requirements', selectedClass],
        queryFn: async () => {
            // Need to pass a dummy userClubId to force "club" logic in backend causing check for region?
            // Actually backend RequirementsController.findAll logic is:
            // "If userClubId is provided..."
            // Coordinators usually have clubId of their "Base" or it's implicitly handled?
            // Wait, Coordinators in this system might NOT have a clubId if they are pure coordinators?
            // Let's check `findAll` logic again.
            // If I am a coordinator, I might have a `clubId` (my home club) BUT I want to see Regional Requirements.
            // The updated logic checks `if (userClubId)`.
            // If I am a coordinator without a club, I might check logic filter.
            // Coordinator login -> usually has `clubId` if they belong to a club.
            // IF they don't, `findAll` logic needs update?
            // Update: We passed `region` in controller.

            const res = await api.get('/requirements', { params: { class: selectedClass } });
            // Filter to show ONLY Regional requirements created by me/region?
            // Or show Global + Regional? 
            // Probably show Global + Regional.
            return res.data;
        }
    });

    // Filter to show ONLY regional requirements in this management view?
    // Or at least visually distinguish them.
    // For "Managing", I only want to edit MY regional requirements.
    // So I should probably filter client side for `region !== null`.
    const myRegionalRequirements = requirements.filter(r => r.region);

    // Check Permissions
    // We can use a hook or check local storage user
    const userRole = JSON.parse(localStorage.getItem('user_dbv') || '{}').role;
    const isCoordinator = ['COORDINATOR_REGIONAL', 'COORDINATOR_DISTRICT', 'COORDINATOR_AREA', 'MASTER'].includes(userRole);

    const createMutation = useMutation({ // ... existing mutation code ...
        mutationFn: async (data: any) => await api.post('/requirements', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regional-requirements'] });
            closeModal();
            import('sonner').then(({ toast }) => toast.success('Requisito regional salvo!'));
        },
        onError: (err: any) => {
            console.error(err);
            const msg = err.response?.data?.message || 'Erro ao salvar.';
            import('sonner').then(({ toast }) => toast.error(msg));
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: { id: string, payload: any }) => await api.patch(`/requirements/${data.id}`, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regional-requirements'] });
            closeModal();
            import('sonner').then(({ toast }) => toast.success('Atualizado com sucesso!'));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/requirements/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regional-requirements'] });
            import('sonner').then(({ toast }) => toast.success('Excluído com sucesso!'));
        }
    });

    const closeModal = () => {
        setIsModalOpen(false);
        setReqDescription('');
        setReqCode('');
        setReqArea('');
        setReqTitle('');
        setReqPoints(0);
        setReqStart('');
        setReqEnd('');
        setReqScope('ALL');
        setSelectedTargetClub(null);

        setReqType('NONE');
        setQuestions([]);
        setEditingReqId(null);
    };

    const openCreateModal = () => {
        setEditingReqId(null);
        setReqDescription('');
        setReqCode('');
        setReqArea('');
        setReqTitle('');
        setReqPoints(0);
        setReqStart('');
        setReqEnd('');
        setReqScope('ALL');
        setSelectedTargetClub(null);

        setReqType('NONE');
        setQuestions([]);
        setIsModalOpen(true);
    };

    const openEditModal = (req: Requirement) => {
        setEditingReqId(req.id);
        setReqDescription(req.description);
        setReqCode(req.code || '');
        setReqTitle(req.title || '');
        setReqArea(req.area || '');
        setReqPoints(req.points || 0);
        setReqStart(req.startDate ? new Date(req.startDate).toISOString().split('T')[0] : '');
        setReqEnd(req.endDate ? new Date(req.endDate).toISOString().split('T')[0] : '');

        // Infer scope from clubId in req
        // Wait, Requirement interface doesn't have clubId in frontend def yet. Need to update interface.
        // Assuming we update it.
        const targetClubId = (req as any).clubId;
        if (targetClubId) {
            setReqScope('SPECIFIC');
            setSelectedTargetClub(targetClubId);
        } else {
            setReqScope('ALL');
            setSelectedTargetClub(null);
        }

        setReqType(req.type || 'NONE');
        setQuestions(req.questions || []);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza? Isso removerá o requisito para todos os clubes da região.')) {
            deleteMutation.mutate(id);
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = {
            description: reqDescription,
            code: reqCode,
            title: reqTitle,
            area: reqArea,
            points: reqPoints,
            startDate: reqStart ? new Date(reqStart).toISOString() : null,
            endDate: reqEnd ? new Date(reqEnd).toISOString() : null,

            type: reqType === 'NONE' ? undefined : reqType,
            questions: reqType === 'QUESTIONNAIRE' ? questions : undefined,
            dbvClass: selectedClass,

            clubId: reqScope === 'SPECIFIC' ? selectedTargetClub : null // Send null for 'ALL'
            // Region is handled by backend
        };

        if (editingReqId) {
            updateMutation.mutate({ id: editingReqId, payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    // Grouping
    const groupedRequirements = myRegionalRequirements.reduce((acc, req) => {
        const area = req.area || 'Sem Área';
        if (!acc[area]) acc[area] = [];
        acc[area].push(req);
        return acc;
    }, {} as Record<string, Requirement[]>);

    const sortedAreas = Object.keys(groupedRequirements).sort((a, b) => {
        const indexA = AREAS.findIndex(ar => a.includes(ar.split('. ')[1]) || a === ar);
        const indexB = AREAS.findIndex(ar => b.includes(ar.split('. ')[1]) || b === ar);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <MapPin className="text-blue-600" />
                        Requisitos Regionais
                    </h1>
                    <p className="text-slate-500">Cadastre requisitos extras para os clubes da sua região.</p>
                </div>
                <div className="flex gap-2">
                    {isCoordinator && (
                        <button
                            onClick={openCreateModal}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
                        >
                            <Plus className="w-5 h-5" /> Novo Requisito
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-slate-400" />
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                    >
                        {DBV_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="flex-1 relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Filtrar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
            </div>

            {/* List */}
            <div className="space-y-8">
                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : myRegionalRequirements.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300">
                        <p className="text-slate-500">Nenhum requisito regional cadastrado para esta classe.</p>
                    </div>
                ) : (
                    sortedAreas.map(area => (
                        <div key={area} className="space-y-3">
                            <h3 className="font-bold text-slate-700 text-lg border-b border-slate-200 pb-2 flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-sm">{groupedRequirements[area].length}</span>
                                {area}
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {groupedRequirements[area]
                                    .filter(req => !search || req.description.toLowerCase().includes(search.toLowerCase()) || (req.code && req.code.toLowerCase().includes(search.toLowerCase())))
                                    .map(req => (
                                        <div key={req.id} className="group bg-white p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex items-start gap-4">
                                            <div className="mt-1 shrink-0">
                                                {req.code ? (
                                                    <span className="font-mono font-bold text-xs bg-slate-800 text-white px-2 py-1 rounded">
                                                        {req.code}
                                                    </span>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-slate-800 font-medium leading-relaxed">{req.description}</p>
                                                <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                                                    Regional
                                                </span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {isCoordinator && (
                                                    <>
                                                        <button
                                                            onClick={() => openEditModal(req)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(req.id)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingReqId ? "Editar Requisito Regional" : "Novo Requisito Regional"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Título (Opcional)</label>
                            <input
                                type="text"
                                value={reqTitle}
                                onChange={e => setReqTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ex: Campanha do Agasalho"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Código (Opcional)</label>
                            <input
                                type="text"
                                value={reqCode}
                                onChange={e => setReqCode(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ex: R.1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Área</label>
                            <input
                                list="areas-list"
                                type="text"
                                value={reqArea}
                                onChange={e => setReqArea(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Selecione ou digite..."
                            />
                            <datalist id="areas-list">
                                {AREAS.map(a => <option key={a} value={a} />)}
                            </datalist>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Pontos</label>
                            <input
                                type="number"
                                value={reqPoints}
                                onChange={e => setReqPoints(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Início</label>
                            <input
                                type="date"
                                value={reqStart}
                                onChange={e => setReqStart(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fim</label>
                            <input
                                type="date"
                                value={reqEnd}
                                onChange={e => setReqEnd(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <textarea
                            required
                            value={reqDescription}
                            onChange={e => setReqDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            rows={3}
                            placeholder="Descreva o requisito..."
                        />
                    </div>

                    {/* Scope Selector */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Âmbito de Visibilidade</label>
                        <select
                            value={reqScope}
                            onChange={e => setReqScope(e.target.value as 'ALL' | 'SPECIFIC')}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                        >
                            <option value="ALL">Todos os Clubes da Região</option>
                            <option value="SPECIFIC">Clube Específico</option>
                        </select>
                    </div>

                    {reqScope === 'SPECIFIC' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Selecione o Clube</label>
                            <select
                                value={selectedTargetClub || ''}
                                onChange={e => setSelectedTargetClub(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                <option value="">Selecione...</option>
                                {clubs?.map(club => (
                                    <option key={club.id} value={club.id}>{club.name}</option>
                                ))}
                            </select>
                            {!clubsLoading && clubs?.length === 0 && (
                                <p className="text-xs text-red-500 mt-1">Nenhum clube encontrado na sua região.</p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Interação</label>
                        <select
                            value={reqType}
                            onChange={e => setReqType(e.target.value as any)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="NONE">Apenas Checkbox (Padrão)</option>
                            <option value="TEXT">Texto (Dissertativo)</option>
                            <option value="FILE">Arquivo/Foto (Comprovante)</option>
                            <option value="BOTH">Texto ou Arquivo</option>
                            <option value="QUESTIONNAIRE">Questionário (Quiz)</option>
                        </select>
                    </div>

                    {reqType === 'QUESTIONNAIRE' && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 text-sm">Perguntas do Quiz</h3>
                                <button type="button" onClick={addQuestion} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> ADICIONAR
                                </button>
                            </div>
                            {questions.map((q, qIndex) => (
                                <div key={qIndex} className="bg-white p-3 rounded shadow-sm border border-slate-200">
                                    <input
                                        type="text"
                                        placeholder="Digite a pergunta..."
                                        value={q.questionText}
                                        onChange={e => updateQuestion(qIndex, 'questionText', e.target.value)}
                                        className="w-full p-2 border-b border-slate-100 text-sm font-medium mb-2 outline-none"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        {q.options.map((opt, oIndex) => (
                                            <div key={oIndex} className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name={`q-${qIndex}`}
                                                    checked={q.correctIndex === oIndex}
                                                    onChange={() => updateQuestion(qIndex, 'correctIndex', oIndex)}
                                                    className="w-3 h-3 text-blue-600"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder={`Opção ${oIndex + 1}`}
                                                    value={opt}
                                                    onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                                                    className={`w-full px-2 py-1 text-xs border rounded ${q.correctIndex === oIndex ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200'}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" onClick={() => removeQuestion(qIndex)} className="text-xs text-red-400 hover:text-red-600 mt-2 w-full text-right">
                                        Remover Pergunta
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all transform hover:scale-105"
                        >
                            Salvar Requisito
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
