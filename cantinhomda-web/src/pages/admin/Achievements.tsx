
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import type { Achievement } from '../../types/achievements';
import { Plus, Trophy } from 'lucide-react';
import { Modal } from '../../components/Modal';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';

export function AdminAchievements() {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

    // Form States
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('Trophy');
    const [points, setPoints] = useState(0);
    const [category, setCategory] = useState<'PARTICIPATION' | 'SKILL' | 'SPECIAL'>('PARTICIPATION');
    const [assignUserId, setAssignUserId] = useState('');

    // Queries
    const { data: achievements = [], isLoading } = useQuery<Achievement[]>({
        queryKey: ['achievements'],
        queryFn: async () => {
            const res = await api.get('/achievements');
            return res.data;
        }
    });

    const { data: users = [] } = useQuery<any[]>({
        queryKey: ['users-list'],
        queryFn: async () => {
            const res = await api.get('/users');
            return res.data;
        },
        enabled: isAssignModalOpen
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data: any) => api.post('/achievements', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['achievements'] });
            setIsCreateModalOpen(false);
            resetForm();
            toast.success('Conquista criada!');
        },
        onError: () => toast.error('Erro ao criar conquista')
    });

    const assignMutation = useMutation({
        mutationFn: async (data: any) => api.post('/achievements/assign', data),
        onSuccess: () => {
            setIsAssignModalOpen(false);
            setAssignUserId('');
            toast.success('Conquista concedida!');
        },
        onError: (err: any) => {
            console.error(err);
            toast.error(err.response?.data?.message || 'Erro ao conceder conquista');
        }
    });

    const resetForm = () => {
        setName('');
        setDescription('');
        setIcon('Trophy');
        setPoints(0);
        setCategory('PARTICIPATION');
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({ name, description, icon, points: Number(points), category });
    };

    const handleAssign = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAchievement || !assignUserId) return;
        assignMutation.mutate({ achievementId: selectedAchievement.id, userId: assignUserId });
    };

    const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
        const Icon = (LucideIcons as any)[name] || Trophy;
        return <Icon className={className} />;
    };

    const iconOptions = ['Trophy', 'Star', 'Shield', 'Award', 'Medal', 'Zap', 'Heart', 'Crown', 'Flame', 'Target'];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gerenciar Conquistas</h1>
                    <p className="text-slate-500">Crie e distribua medalhas e conquistas para os desbravadores.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                >
                    <Plus className="w-5 h-5" />
                    Nova Conquista
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading && <p>Carregando...</p>}
                {achievements.map((ach) => (
                    <div key={ach.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                            <DynamicIcon name={ach.icon} className="w-8 h-8" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-800">{ach.name}</h3>
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">{ach.category}</p>
                        <p className="text-slate-500 text-sm mb-4 line-clamp-2">{ach.description}</p>

                        <div className="mt-auto flex flex-col w-full gap-2">
                            <span className="text-xs text-slate-400 font-medium">+{ach.points} PONTOS</span>
                            <button
                                onClick={() => { setSelectedAchievement(ach); setIsAssignModalOpen(true); }}
                                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                            >
                                Conceder
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Nova Conquista">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="label">Nome</label>
                        <input className="input w-full border p-2 rounded" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div>
                        <label className="label">Descrição</label>
                        <textarea className="input w-full border p-2 rounded" value={description} onChange={e => setDescription(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Categoria</label>
                            <select className="input w-full border p-2 rounded" value={category} onChange={(e: any) => setCategory(e.target.value)}>
                                <option value="PARTICIPATION">Participação</option>
                                <option value="SKILL">Habilidade</option>
                                <option value="SPECIAL">Especial</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Pontos Extras</label>
                            <input type="number" className="input w-full border p-2 rounded" value={points} onChange={e => setPoints(Number(e.target.value))} />
                        </div>
                    </div>
                    <div>
                        <label className="label mb-2 block">Ícone</label>
                        <div className="flex gap-2 flex-wrap">
                            {iconOptions.map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setIcon(opt)}
                                    className={`p-2 rounded-lg border ${icon === opt ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    <DynamicIcon name={opt} className="w-5 h-5" />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Criar</button>
                    </div>
                </form>
            </Modal>

            {/* Assign Modal */}
            <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title={`Conceder: ${selectedAchievement?.name}`}>
                <form onSubmit={handleAssign} className="space-y-4">
                    <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-lg">
                        {selectedAchievement && (
                            <>
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 border border-slate-200">
                                    <DynamicIcon name={selectedAchievement.icon} className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold">{selectedAchievement.name}</p>
                                    <p className="text-xs text-slate-500">+{selectedAchievement.points} pts</p>
                                </div>
                            </>
                        )}
                    </div>
                    <div>
                        <label className="label">Selecionar Usuário</label>
                        <select
                            className="input w-full border p-2 rounded"
                            value={assignUserId}
                            onChange={e => setAssignUserId(e.target.value)}
                            required
                        >
                            <option value="">Selecione...</option>
                            {users.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.name} ({u.clubName || 'Sem Clube'})</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Confirmar Concessão</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
