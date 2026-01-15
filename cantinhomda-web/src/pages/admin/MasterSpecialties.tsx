import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { Plus, Search, Trash2, Pencil, Image as ImageIcon, Link } from 'lucide-react';
import { Modal } from '../../components/Modal';

// Types
interface Specialty {
    id: string;
    name: string;
    area: string;
    imageUrl?: string;
    requirements?: any[];
}

const AREAS = [
    "ADRA", "Artes e Habilidade Manual", "Atividades Agrícolas e Afins",
    "Atividades Missionárias e Comunitárias", "Atividades Profissionais",
    "Atividades Recreativas", "Ciência e Saúde", "Estudo da Natureza",
    "Habilidades Domésticas", "Mestrados"
];

export function MasterSpecialties() {
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [area, setArea] = useState(AREAS[0]);
    const [imageUrl, setImageUrl] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [requirements, setRequirements] = useState<{ description: string }[]>([]);

    // Import URL State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importUrl, setImportUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    // Fetch Specialties
    const { data: specialties = [], isLoading } = useQuery<Specialty[]>({
        queryKey: ['master-specialties'],
        queryFn: async () => (await api.get('/specialties')).data
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/specialties', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['master-specialties'] });
            closeModal();
            alert('Especialidade salva com sucesso!');
        },
        onError: (err: any) => alert(err.response?.data?.message || 'Erro ao salvar.')
    });

    const updateMutation = useMutation({
        mutationFn: async (data: { id: string, payload: any }) => await api.patch(`/specialties/${data.id}`, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['master-specialties'] });
            closeModal();
            alert('Especialidade atualizada com sucesso!');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/specialties/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['master-specialties'] });
        }
    });

    const importUrlMutation = useMutation({
        mutationFn: async (url: string) => await api.post('/specialties/import-url', { url }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['master-specialties'] });
            setIsImportModalOpen(false);
            setImportUrl('');
            alert('Especialidade importada com sucesso!');
        },
        onError: (err: any) => alert(err.response?.data?.message || 'Erro ao importar.')
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { name, area, imageUrl, requirements };
        if (editingId) {
            updateMutation.mutate({ id: editingId, payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta especialidade?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleImportUrl = (e: React.FormEvent) => {
        e.preventDefault();
        if (!importUrl) return;
        setIsImporting(true);
        importUrlMutation.mutate(importUrl, {
            onSettled: () => setIsImporting(false)
        });
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setName('');
        setArea(AREAS[0]);
        setImageUrl('');
        setEditingId(null);
        setRequirements([]);
    };

    const openCreateModal = () => {
        setEditingId(null);
        setName('');
        setArea(AREAS[0]);
        setArea(AREAS[0]);
        setImageUrl('');
        setRequirements([]);
        setIsModalOpen(true);
    };

    const openEditModal = (spec: Specialty) => {
        setEditingId(spec.id);
        setName(spec.name);
        setArea(spec.area);
        setImageUrl(spec.imageUrl || '');
        setRequirements(spec.requirements?.map(r => ({ description: r.description })) || []);
        setIsModalOpen(true);
    };

    // Grouping for UI? Or just clean list with cards? Cards look better.
    const filteredSpecialties = specialties.filter(s =>
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.area.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gerenciar Especialidades (Master)</h1>
                    <p className="text-slate-500">Cadastre e edite as especialidades globais do sistema.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <Link className="w-5 h-5" /> Importar Wiki
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <Plus className="w-5 h-5" /> Nova Especialidade
                    </button>
                </div>
            </div>

            {/* Sticky Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Pesquisar especialidade por nome ou área..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-green-500 text-base"
                    />
                </div>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
            ) : filteredSpecialties.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500">Nenhuma especialidade encontrada.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredSpecialties.sort((a, b) => a.name.localeCompare(b.name)).map(spec => (
                        <div key={spec.id} className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-green-300 transition-all">
                            <div className="h-32 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                {spec.imageUrl ? (
                                    <img src={spec.imageUrl} alt={spec.name} className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="w-12 h-12 text-slate-300" />
                                )}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                    <button
                                        onClick={() => openEditModal(spec)}
                                        className="bg-white text-slate-700 p-2 rounded-full hover:bg-blue-50 hover:text-blue-600"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(spec.id)}
                                        className="bg-white text-slate-700 p-2 rounded-full hover:bg-red-50 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{spec.area}</div>
                                <h3 className="font-bold text-slate-800 leading-tight">{spec.name}</h3>
                                {spec.requirements && (
                                    <p className="text-xs text-slate-500 mt-2">{spec.requirements.length} requisitos</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingId ? "Editar Especialidade" : "Nova Especialidade"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                        <input
                            required
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Ex: Cães, Primeiros Socorros"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Área</label>
                        <select
                            value={area}
                            onChange={e => setArea(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        >
                            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">URL da Imagem / Insígnia</label>
                        <input
                            type="url"
                            value={imageUrl}
                            onChange={e => setImageUrl(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="https://..."
                        />
                        {imageUrl && (
                            <div className="mt-2 w-20 h-20 rounded border bg-slate-50 flex items-center justify-center overflow-hidden">
                                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>

                    {/* Requirements Editor */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-slate-700">Requisitos</label>
                            <button
                                type="button"
                                onClick={() => setRequirements([...requirements, { description: '' }])}
                                className="text-xs text-green-600 font-bold hover:text-green-700 flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> Adicionar
                            </button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {requirements.map((req, index) => (
                                <div key={index} className="flex gap-2">
                                    <span className="text-slate-400 text-xs py-3 w-4">{index + 1}.</span>
                                    <textarea
                                        rows={2}
                                        value={req.description}
                                        onChange={(e) => {
                                            const newReqs = [...requirements];
                                            newReqs[index].description = e.target.value;
                                            setRequirements(newReqs);
                                        }}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-green-500 resize-none"
                                        placeholder="Descrição do requisito..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setRequirements(requirements.filter((_, i) => i !== index))}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded self-start"
                                        title="Remover"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {requirements.length === 0 && (
                                <p className="text-xs text-slate-400 italic text-center py-2">Nenhum requisito cadastrado.</p>
                            )}
                        </div>
                    </div>
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
                            className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow-md transition-all"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Import URL Modal */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Importar da MDA Wiki"
            >
                <form onSubmit={handleImportUrl} className="space-y-4">
                    <div className="bg-purple-50 text-purple-800 p-3 rounded-lg text-sm mb-2">
                        Cole o link da especialidade na MDA Wiki (mda.wiki.br) para importar automaticamente o Nome, Área, Imagem e Requisitos.
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">URL da Especialidade</label>
                        <input
                            required
                            type="url"
                            value={importUrl}
                            onChange={e => setImportUrl(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="https://mda.wiki.br/Especialidade_de_Cães"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsImportModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isImporting}
                            className={`bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 shadow-md transition-all ${isImporting ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {isImporting ? 'Importando...' : 'Importar'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
