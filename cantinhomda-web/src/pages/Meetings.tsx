import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Plus, Users, CheckCircle, ArrowLeft, FileSpreadsheet, FileText, Save, ClipboardList, Pencil, Trash2, Settings } from 'lucide-react';
import { Modal } from '../components/Modal';
import { format, startOfQuarter, endOfQuarter, eachDayOfInterval, isSaturday, isSameDay, getQuarter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// Firestore removed - using API instead
import { toast } from 'sonner';
import { ROLE_TRANSLATIONS } from './members/types';

interface Meeting {
    id: string;
    title: string;
    date: string;
    type: string;
    points: number;
    details?: string;
    _count?: {
        attendances: number;
    };
}

interface Member {
    id: string;
    name: string;
    role: string;
    unit?: { name: string };
}

export function Meetings() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [selectedQuarter, setSelectedQuarter] = useState<number>(getQuarter(new Date()));
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Details State (ATA)
    const [details, setDetails] = useState('');

    // Update local details state when meeting selected
    useEffect(() => {
        if (selectedMeeting) {
            setDetails(selectedMeeting.details || '');
        }
    }, [selectedMeeting]);

    // Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [type, setType] = useState('REGULAR');
    const [points, setPoints] = useState(10);
    const [isScoring, setIsScoring] = useState(false);

    // Attendance State
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    // attendanceDate removed as it was unused

    // Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // --- Queries ---

    const { data: meetings = [] } = useQuery({
        queryKey: ['meetings', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const res = await api.get(`/meetings/club/${user.clubId}`);
            return res.data.sort((a: Meeting, b: Meeting) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },
        enabled: !!user?.clubId && !selectedMeeting
    });

    const { data: members = [] } = useQuery<Member[]>({
        queryKey: ['members', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const res = await api.get(`/users?clubId=${user.clubId}`);
            return res.data;
        },
        enabled: !!selectedMeeting
    });

    // --- Helpers ---

    // --- Helpers ---

    // Removed translateRole in favor of ROLE_TRANSLATIONS import

    const filteredMembers = useMemo(() => {
        if (!selectedMeeting) return [];
        return members.filter(member => {
            if (selectedMeeting.type === 'PARENTS') {
                // Parents Meeting: Show everyone (Parents, Directors, etc) EXCEPT Pathfinders
                return member.role !== 'PATHFINDER';
            }
            // Regular/Other Meetings: Show everyone (Pathfinders, Directors, etc) EXCEPT Parents
            return member.role !== 'PARENT';
        });
    }, [members, selectedMeeting]);

    // --- Quarter Logic ---
    const saturdaysInfo = useMemo(() => {
        // Criar data base para o trimestre selecionado
        const baseDate = new Date(selectedYear, (selectedQuarter - 1) * 3, 1);
        const start = startOfQuarter(baseDate);
        const end = endOfQuarter(baseDate);

        const allDays = eachDayOfInterval({ start, end });
        const saturdays = allDays.filter(day => isSaturday(day));

        return saturdays.map((date, index) => ({
            date,
            label: `${index + 1}º Sábado`,
            month: format(date, 'MMMM', { locale: ptBR }),
            formattedDate: format(date, "dd 'de' MMMM", { locale: ptBR })
        }));
    }, [selectedQuarter, selectedYear]);

    const handleQuickCreate = (date: Date) => {
        setDate(format(date, 'yyyy-MM-dd'));
        setTitle('Reunião Regular');
        setType('REGULAR');
        setPoints(10);
        setIsScoring(true);
        setIsCreateModalOpen(true);
    };

    // --- Mutations ---

    // --- Mutations ---

    const updateMeetingMutation = useMutation({
        mutationFn: async (data: { id: string, details: string }) => {
            await api.patch(`/meetings/${data.id}`, { details: data.details });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
            toast.success('Detalhes da reunião salvos!');
            if (selectedMeeting) {
                setSelectedMeeting({ ...selectedMeeting, details });
            }
        },
        onError: (error: any) => {
            console.error('Update Error:', error);
            toast.error('Erro ao salvar detalhes.');
        }
    });

    const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);

    // ...

    const updateMeetingInfoMutation = useMutation({
        mutationFn: async (data: { id: string, payload: any }) => {
            await api.patch(`/meetings/${data.id}`, data.payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
            closeCreateModal();
            toast.success('Reunião atualizada com sucesso!');
        },
        onError: (error: any) => {
            console.error(error);
            toast.error('Erro ao atualizar reunião.');
        }
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingMeetingId) {
            updateMeetingInfoMutation.mutate({
                id: editingMeetingId,
                payload: { title, date, type, points: Number(points), isScoring }
            });
            return;
        }

        if (!user?.clubId) {
            toast.error('Erro: ID do clube não encontrado.');
            return;
        }
        createMeetingMutation.mutate({
            title,
            date,
            type,
            points: Number(points),
            isScoring,
            clubId: user.clubId
        });
    };

    const handleEditClick = (meeting: Meeting) => {
        setEditingMeetingId(meeting.id);
        setTitle(meeting.title);
        // Format date simply for input type=date (YYYY-MM-DD)
        const d = new Date(meeting.date);
        setDate(d.toISOString().split('T')[0]);
        setType(meeting.type);
        setPoints(meeting.points);
        setIsScoring(meeting.points > 0);
        setIsCreateModalOpen(true);
    };

    const closeCreateModal = () => {
        setIsCreateModalOpen(false);
        setEditingMeetingId(null);
        setTitle('');
        setDate('');
        setPoints(10);
        setIsScoring(false);
    };

    // Keep Import mutations on API for now or disable if backend is gone. 
    // Assuming backend might still be used for file processing or user can accept it might break if backend is offline.
    // For now I will leave Import as API calls but add toast error handling.

    const importMeetingsMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!user?.clubId) throw new Error('Club ID não encontrado.');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('clubId', user.clubId);

            return api.post('/meetings/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
            setIsImportModalOpen(false);
            toast.success('Reuniões importadas com sucesso!');
        },
        onError: (error: any) => {
            console.error('Import Error:', error);
            toast.error(error.response?.data?.message || 'Erro ao importar reuniões.');
        }
    });

    const [isAttendanceImportOpen, setIsAttendanceImportOpen] = useState(false);
    const importAttendanceMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return api.post(`/meetings/${selectedMeeting?.id}/import-attendance`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
            setIsAttendanceImportOpen(false);
            const results = (data as any).data;
            alert(`Presença importada!\nSucedidos: ${results.success}\nPulados: ${results.skipped}`);
            setSelectedMeeting(null);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Erro importação.');
        }
    });

    const createMeetingMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.post('/meetings', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
            closeCreateModal();
            toast.success('Reunião agendada com sucesso!');
        },
        onError: (error: any) => {
            console.error(error);
            toast.error('Erro ao agendar reunião.');
        }
    });

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta reunião? Todos os registros de presença serão apagados.')) {
            api.delete(`/meetings/${id}`)
                .then(() => {
                    toast.success('Reunião excluída!');
                    queryClient.invalidateQueries({ queryKey: ['meetings'] });
                })
                .catch(err => {
                    console.error(err);
                    toast.error('Erro ao excluir reunião.');
                });
        }
    };

    const registerAttendanceMutation = useMutation({
        mutationFn: async (data: { meetingId: string, userIds: string[] }) => {
            await api.post(`/meetings/${data.meetingId}/attendance`, {
                attendees: data.userIds
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
            toast.success('Presença registrada e pontos lançados!');
            setSelectedMeeting(null);
            setSelectedMemberIds([]);
        },
        onError: (error: any) => {
            console.error('Attendance Error:', error);
            toast.error('Erro ao registrar presença.');
        }
    });



    const handleAttendanceSubmit = () => {
        if (!selectedMeeting || selectedMemberIds.length === 0) return;

        if (window.confirm(`Confirmar presença para ${selectedMemberIds.length} membros?`)) {
            registerAttendanceMutation.mutate({
                meetingId: selectedMeeting.id,
                userIds: selectedMemberIds
            });
        }
    };

    const toggleMember = (id: string) => {
        setSelectedMemberIds(prev =>
            prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedMemberIds.length === filteredMembers.length) {
            setSelectedMemberIds([]);
        } else {
            setSelectedMemberIds(filteredMembers.map(m => m.id));
        }
    };



    // --- Render: Attendance View ---
    if (selectedMeeting) {
        return (
            <div>
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <button
                            onClick={() => setSelectedMeeting(null)}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEditClick(selectedMeeting)}
                                className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors border border-transparent hover:border-blue-100"
                            >
                                <Pencil className="w-4 h-4" />
                                Editar
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('Tem certeza que deseja excluir esta reunião?')) {
                                        handleDelete(selectedMeeting.id);
                                        setSelectedMeeting(null);
                                    }
                                }}
                                className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors border border-transparent hover:border-red-100"
                            >
                                <Trash2 className="w-4 h-4" />
                                Excluir
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">{selectedMeeting.title}</h1>
                                <p className="text-slate-500">
                                    {new Date(selectedMeeting.date).toLocaleDateString()} • {selectedMeeting.points} Pontos
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsAttendanceImportOpen(true)}
                                    className="flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm border border-emerald-200"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Importar Presença
                                </button>
                                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                                    {selectedMeeting.type === 'PARENTS' ? 'Reunião de Pais' : selectedMeeting.type}
                                </div>
                            </div>
                        </div>

                        {/* DETAILS / ATA SECTION */}
                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Ata / Detalhes da Reunião
                            </label>
                            <textarea
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] text-sm"
                                placeholder="Descreva o que aconteceu na reunião (Ata, decisões, atividades...)"
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={() => updateMeetingMutation.mutate({ id: selectedMeeting.id, details })}
                                    disabled={updateMeetingMutation.isPending || details === (selectedMeeting.details || '')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {updateMeetingMutation.isPending ? 'Salvando...' : 'Salvar Detalhes'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedMemberIds.length === filteredMembers.length && filteredMembers.length > 0}
                                    onChange={toggleAll}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                />
                                <span className="font-medium text-slate-700">Selecionar Todos</span>
                            </div>
                            <span className="text-sm text-slate-500">
                                {selectedMemberIds.length} selecionados
                            </span>
                        </div>

                        <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
                            {filteredMembers.map(member => (
                                <label key={member.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedMemberIds.includes(member.id)}
                                        onChange={() => toggleMember(member.id)}
                                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                    />
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-800">{member.name}</p>
                                        <p className="text-xs text-slate-500">{ROLE_TRANSLATIONS[member.role] || member.role} • {member.unit?.name || 'Sem Unidade'}</p>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                            <button
                                onClick={handleAttendanceSubmit}
                                disabled={selectedMemberIds.length === 0 || registerAttendanceMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                {registerAttendanceMutation.isPending ? 'Salvando...' : 'Confirmar Presença'}
                            </button>
                        </div>

                        {/* Attendance Import Modal */}
                        <Modal
                            isOpen={isAttendanceImportOpen}
                            onClose={() => setIsAttendanceImportOpen(false)}
                            title={`Importar Presença: ${selectedMeeting.title}`}
                        >
                            <div className="space-y-4">
                                <p className="text-sm text-slate-500">
                                    O arquivo deve conter uma coluna <strong>Email</strong> ou <strong>Nome</strong>.
                                </p>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            if (window.confirm('Confirmar importação de presença para esta reunião?')) {
                                                importAttendanceMutation.mutate(e.target.files[0]);
                                            }
                                        }
                                    }}
                                    className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-emerald-50 file:text-emerald-700
                                hover:file:bg-emerald-100"
                                />
                                {importAttendanceMutation.isPending && (
                                    <p className="text-center text-emerald-600 font-medium">Processando planilha...</p>
                                )}
                            </div>
                        </Modal>
                    </div>
                </div>
            </div>
        );
    }

    // --- Render: List View (Quarter Grid) ---
    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ClipboardList className="w-8 h-8 text-blue-600" />
                        Controle de Chamada
                    </h1>
                    <p className="text-slate-500">Marque a presença e atividades semanais.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Chamada Avulsa
                    </button>
                    <button
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all"
                    >
                        <Settings className="w-5 h-5" />
                        Configurar Pontuação
                    </button>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="text-emerald-600 hover:bg-emerald-50 px-3 py-2 rounded-lg font-medium transition-colors"
                        title="Importar Excel"
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Quarter & Year Navigation */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/50 p-4 rounded-[2rem] border border-slate-200/50 backdrop-blur-sm shadow-xl shadow-slate-200/20 mb-8">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                    {[1, 2, 3, 4].map(q => (
                        <button
                            key={q}
                            onClick={() => setSelectedQuarter(q)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedQuarter === q
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {q}º Trim
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-6 bg-slate-900 text-white px-6 py-2.5 rounded-2xl shadow-xl shadow-slate-900/20">
                    <button
                        onClick={() => setSelectedYear(prev => prev - 1)}
                        className="p-1 hover:text-blue-400 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-black tracking-tighter w-12 text-center">
                        {selectedYear}
                    </span>
                    <button
                        onClick={() => setSelectedYear(prev => prev + 1)}
                        className="p-1 hover:text-blue-400 transition-colors rotate-180"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {saturdaysInfo.map((sat) => {
                    const meeting = meetings.find((m: Meeting) => isSameDay(new Date(m.date), sat.date));
                    // isFuture logic removed as requested by lint

                    if (meeting) {
                        // Card de Reunião Existente
                        return (
                            <div
                                key={sat.date.toISOString()}
                                onClick={() => setSelectedMeeting(meeting)}
                                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-[4rem] -mr-8 -mt-8 z-0 opacity-50 group-hover:bg-blue-100 transition-colors" />

                                <div className="relative z-10 flex items-start gap-4">
                                    <div className="bg-blue-100 text-blue-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{sat.label}</div>
                                        <div className="font-bold text-slate-800 text-lg capitalize">{sat.formattedDate}</div>
                                        <div className="flex items-center gap-1 mt-2 text-xs font-medium text-slate-500">
                                            <Users className="w-3 h-3" />
                                            {meeting._count?.attendances || 0} presentes
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${meeting.type === 'PARENTS' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                                        {meeting.type === 'PARENTS' ? 'Pais' : meeting.type}
                                    </span>
                                    {meeting.points > 0 && (
                                        <span className="text-xs text-slate-400 font-medium">
                                            {meeting.points} pts
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    } else {
                        // Card Vazio (Criar)
                        return (
                            <button
                                key={sat.date.toISOString()}
                                onClick={() => handleQuickCreate(sat.date)}
                                className="bg-slate-50 p-5 rounded-2xl border border-slate-200 border-dashed hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all flex flex-col items-center justify-center text-center h-full min-h-[140px] group"
                            >
                                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-3 group-hover:border-blue-300 group-hover:text-blue-500 transition-colors">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{sat.label}</div>
                                <div className="font-bold text-slate-600 capitalize">{sat.formattedDate}</div>
                            </button>
                        );
                    }
                })}
            </div>



            <Modal
                isOpen={isCreateModalOpen}
                onClose={closeCreateModal}
                title={editingMeetingId ? "Editar Reunião" : "Agendar Reunião"}
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    {/* ... Inputs ... */}
                    {/* Simplified for replacement context */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: Reunião Regular"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                            <select
                                value={type}
                                onChange={e => setType(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="REGULAR">Regular</option>
                                <option value="SPECIAL">Especial</option>
                                <option value="CAMP">Acampamento</option>
                                <option value="PARENTS">Reunião de Pais</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="isScoring"
                                checked={isScoring}
                                onChange={e => setIsScoring(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isScoring" className="text-sm font-medium text-slate-700">
                                Valer Pontos (Atividade)
                            </label>
                        </div>

                        {isScoring && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Pontos (Presença)</label>
                                <input
                                    type="number"
                                    required={isScoring}
                                    min="0"
                                    value={points}
                                    onChange={e => setPoints(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={closeCreateModal}
                            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={createMeetingMutation.isPending || updateMeetingInfoMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {updateMeetingInfoMutation.isPending || createMeetingMutation.isPending
                                ? 'Salvando...'
                                : (editingMeetingId ? 'Salvar Alterações' : 'Agendar')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Import Modal */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Importar Reuniões (Excel)"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        O arquivo deve conter as colunas: <strong>Titulo</strong>, <strong>Data</strong> (DD/MM/AAAA), <strong>Tipo</strong>, <strong>Pontos</strong>.
                    </p>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => {
                            if (e.target.files?.[0]) {
                                if (window.confirm('Confirmar importação deste arquivo?')) {
                                    importMeetingsMutation.mutate(e.target.files[0]);
                                }
                            }
                        }}
                        className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-emerald-50 file:text-emerald-700
                            hover:file:bg-emerald-100"
                    />
                    {importMeetingsMutation.isPending && (
                        <p className="text-center text-emerald-600 font-medium">Processando planilha...</p>
                    )}
                </div>
            </Modal>

        </div >
    );
}
