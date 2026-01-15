import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { Plus, BookOpen, Search, Trash2, Pencil, FileJson } from 'lucide-react';
import { Modal } from '../../components/Modal';

// Types
interface Requirement {
    id: string;
    description: string;
    code?: string;
    dbvClass?: string;
    area?: string;
    type?: 'TEXT' | 'FILE' | 'BOTH' | 'QUESTIONNAIRE';
    questions?: Question[];
    clubId?: string | null;
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

export function MasterRequirements() {
    const queryClient = useQueryClient();

    const [selectedClass, setSelectedClass] = useState<string>('AMIGO');
    const [search, setSearch] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reqDescription, setReqDescription] = useState('');
    const [reqCode, setReqCode] = useState('');
    const [reqArea, setReqArea] = useState('');
    const [editingReqId, setEditingReqId] = useState<string | null>(null);
    const [reqType, setReqType] = useState<'TEXT' | 'FILE' | 'BOTH' | 'QUESTIONNAIRE' | 'NONE'>('NONE');
    const [questions, setQuestions] = useState<Question[]>([]);

    // Import Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importUrl, setImportUrl] = useState('');
    const [importPreview, setImportPreview] = useState<any[]>([]);
    const [selectedImportIndices, setSelectedImportIndices] = useState<number[]>([]);

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

    // Fetch Requirements (Only Global/Class ones usually, but backend returns what matches query)
    const { data: requirements = [], isLoading } = useQuery<Requirement[]>({
        queryKey: ['master-requirements', selectedClass],
        queryFn: async () => {
            const res = await api.get('/requirements', { params: { class: selectedClass } });
            // Filter client-side to be sure we only show what we want?
            // Backend `findAll` might return club specifics if user has clubId.
            // But Master usually doesn't have clubId or has special viewing rights.
            // For this page, we probably want to see *Universal* requirements primarily.
            // Let's rely on filter by class.
            return res.data;
        }
    });

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/requirements', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['master-requirements'] });
            closeModal();
            alert('Requisito salvo com sucesso!');
        },
        onError: (err: any) => {
            console.error(err);
            alert('Erro ao salvar requisito.');
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: { id: string, payload: any }) => await api.patch(`/requirements/${data.id}`, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['master-requirements'] });
            closeModal();
            alert('Requisito atualizado com sucesso!');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/requirements/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['master-requirements'] });
        }
    });

    // Import Mutation
    const importMutation = useMutation({
        mutationFn: async (items: any[]) => api.post('/requirements/import', items),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['master-requirements'] });
            alert(`Importado com sucesso: ${res.data.count} requisitos.`);
            setIsImportModalOpen(false);
            setImportUrl('');
            setImportPreview([]);
            setSelectedImportIndices([]);
        },
        onError: () => alert('Erro ao importar.')
    });


    const handleFetchImport = async () => {
        if (!importUrl) return;
        try {
            const res = await api.get('/requirements/scrape', { params: { url: importUrl } });
            const json = res.data;
            if (Array.isArray(json)) {
                setImportPreview(json);
                setSelectedImportIndices(json.map((_, i) => i));
            } else {
                alert('O retorno não é uma lista de requisitos.');
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao buscar URL.');
        }
    };

    const handleConfirmImport = () => {
        const items = selectedImportIndices.map(i => importPreview[i]);
        importMutation.mutate(items);
    };


    const closeModal = () => {
        setIsModalOpen(false);
        setReqDescription('');
        setReqCode('');
        setReqArea('');
        setReqType('NONE');
        setQuestions([]);
        setEditingReqId(null);
    };

    const openCreateModal = () => {
        setEditingReqId(null);
        setReqDescription('');
        setReqCode('');
        setReqArea('');
        setReqType('NONE');
        setQuestions([]);
        setIsModalOpen(true);
    };

    const openEditModal = (req: Requirement) => {
        setEditingReqId(req.id);
        setReqDescription(req.description);
        setReqCode(req.code || '');
        setReqArea(req.area || '');
        setReqType(req.type || 'NONE');
        // If we had logic to fetch questions details, we'd need it here.
        // Assuming req.questions comes populated or we fetch individual.
        // For simplicity, editing generic fields now. detailed editing might need `getQuiz`.
        // Let's reset questions for now to avoid complexity or need extra fetch.
        setQuestions([]);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir permanentemente este requisito?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = {
            description: reqDescription,
            code: reqCode,
            area: reqArea,
            type: reqType === 'NONE' ? undefined : reqType,
            questions: reqType === 'QUESTIONNAIRE' ? questions : undefined,
            dbvClass: selectedClass,
            clubId: null // Force Universal
        };

        if (editingReqId) {
            delete payload.clubId; // Don't overwrite on edit usually, but okay.
            updateMutation.mutate({ id: editingReqId, payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    // Logic to Group by Area
    const groupedRequirements = requirements.reduce((acc, req) => {
        const area = req.area || 'Sem Área';
        if (!acc[area]) acc[area] = [];
        acc[area].push(req);
        return acc;
    }, {} as Record<string, Requirement[]>);

    // Sort Areas by known list index for predefined order
    const sortedAreas = Object.keys(groupedRequirements).sort((a, b) => {
        const indexA = AREAS.findIndex(ar => a.includes(ar.split('. ')[1]) || a === ar);
        const indexB = AREAS.findIndex(ar => b.includes(ar.split('. ')[1]) || b === ar);
        // Simple string compare if not found
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });


    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gerenciar Requisitos (Master)</h1>
                    <p className="text-slate-500">Cadastre requisitos universais para todas as classes.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <FileJson className="w-5 h-5" /> Importar
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <Plus className="w-5 h-5" /> Novo Requisito
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-slate-400" />
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 font-medium text-slate-700"
                    >
                        {DBV_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="flex-1 relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Filtrar requisitos..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    />
                </div>
            </div>

            {/* List */}
            <div className="space-y-8">
                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                ) : requirements.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300">
                        <p className="text-slate-500">Nenhum requisito cadastrado para esta classe.</p>
                    </div>
                ) : (
                    sortedAreas.map(area => (
                        <div key={area} className="space-y-3">
                            <h3 className="font-bold text-slate-700 text-lg border-b border-slate-200 pb-2 flex items-center gap-2">
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-sm">{groupedRequirements[area].length}</span>
                                {area}
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {groupedRequirements[area]
                                    .filter(req => !search || req.description.toLowerCase().includes(search.toLowerCase()) || (req.code && req.code.toLowerCase().includes(search.toLowerCase())))
                                    .map(req => (
                                        <div key={req.id} className="group bg-white p-4 rounded-lg border border-slate-200 hover:border-green-300 hover:shadow-md transition-all flex items-start gap-4">
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
                                                {req.clubId === null && (
                                                    <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                                        Universal
                                                    </span>
                                                )}
                                                {req.clubId && (
                                                    <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                        Clube Específico
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                title={editingReqId ? "Editar Requisito" : "Novo Requisito Universal"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
                            <input
                                type="text"
                                value={reqCode}
                                onChange={e => setReqCode(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="Ex: I.1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Área</label>
                            <input
                                list="areas-list"
                                type="text"
                                value={reqArea}
                                onChange={e => setReqArea(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="Selecione ou digite..."
                            />
                            <datalist id="areas-list">
                                {AREAS.map(a => <option key={a} value={a} />)}
                            </datalist>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <textarea
                            required
                            value={reqDescription}
                            onChange={e => setReqDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            rows={4}
                            placeholder="Descreva o requisito..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Interação</label>
                        <select
                            value={reqType}
                            onChange={e => setReqType(e.target.value as any)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
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
                                <button type="button" onClick={addQuestion} className="text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1">
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
                                                    className="w-3 h-3 text-green-600"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder={`Opção ${oIndex + 1}`}
                                                    value={opt}
                                                    onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                                                    className={`w-full px-2 py-1 text-xs border rounded ${q.correctIndex === oIndex ? 'border-green-200 bg-green-50 text-green-800' : 'border-slate-200'}`}
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
                            className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow-md shadow-green-200 transition-all transform hover:scale-105"
                        >
                            Salvar Requisito
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Import Modal */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Importar Requisitos (JSON/URL)"
            >
                <div className="space-y-4 max-h-[70vh] flex flex-col">
                    <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-2">
                        Cole a URL de uma página pública (Wiki/Site) para tentar extrair os requisitos automaticamente.
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={importUrl}
                            onChange={e => setImportUrl(e.target.value)}
                            placeholder="https://mda.wiki.br/Classe_de_Amigo"
                            className="flex-1 p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={handleFetchImport} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700">
                            Buscar
                        </button>
                    </div>

                    {importPreview.length > 0 && (
                        <div className="flex-1 overflow-auto border rounded-xl p-2 bg-slate-50 space-y-2">
                            <p className="text-sm font-bold text-slate-700 mb-2 px-2">
                                {selectedImportIndices.length} itens encontrados
                            </p>
                            {importPreview.map((item, i) => (
                                <div key={i} className="flex gap-3 items-start p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                                    <input
                                        type="checkbox"
                                        checked={selectedImportIndices.includes(i)}
                                        onChange={e => {
                                            if (e.target.checked) setSelectedImportIndices([...selectedImportIndices, i]);
                                            else setSelectedImportIndices(selectedImportIndices.filter(idx => idx !== i));
                                        }}
                                        className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                    />
                                    <div className="text-sm">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold bg-slate-100 px-1.5 rounded text-xs">{item.code}</span>
                                            <span className="text-slate-500 text-xs uppercase font-bold">{item.area}</span>
                                        </div>
                                        <p className="text-slate-700 leading-snug">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {importPreview.length > 0 && (
                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button
                                onClick={handleConfirmImport}
                                className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-100"
                            >
                                Confirmar Importação
                            </button>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
