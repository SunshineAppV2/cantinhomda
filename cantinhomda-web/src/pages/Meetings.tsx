import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Plus, Users, CheckCircle, FileSpreadsheet, FileText, Save, ClipboardList, Pencil, Trash2, Settings, X, Check, ArrowLeft } from 'lucide-react';
import { Modal } from '../components/Modal';
import { format, startOfQuarter, endOfQuarter, getQuarter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

interface AttendanceRequirement {
    id: string;
    name: string;
    points: number;
    order: number;
}

// Default requirements if none configured
const DEFAULT_REQUIREMENTS: AttendanceRequirement[] = [
    { id: 'presence', name: 'PRESENÇA', points: 10, order: 0 },
    { id: 'punctuality', name: 'PONTUALIDADE', points: 10, order: 1 },
    { id: 'uniform', name: 'UNIFORME COMPLETO', points: 10, order: 2 },
    { id: 'bible', name: 'TROUXE BÍBLIA', points: 10, order: 3 },
    { id: 'small_group', name: 'PARTICIPOU DO PG', points: 10, order: 4 },
];

export function Meetings() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [selectedQuarter, setSelectedQuarter] = useState<number>(getQuarter(new Date()));
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Attendance Modal State
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

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

    // Scoring Config Modal
    const [isScoringConfigOpen, setIsScoringConfigOpen] = useState(false);
    const [attendanceRequirements, setAttendanceRequirements] = useState<AttendanceRequirement[]>(DEFAULT_REQUIREMENTS);
    const [newRequirementName, setNewRequirementName] = useState('');
    const [newRequirementPoints, setNewRequirementPoints] = useState(10);

    // Attendance Grid State - tracks which requirements each member completed
    const [attendanceGrid, setAttendanceGrid] = useState<Record<string, Record<string, boolean>>>({});

    // Wizard Section State - for step-by-step attendance
    const [currentAttendanceSection, setCurrentAttendanceSection] = useState(0);

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
        enabled: !!user?.clubId
    });

    const { data: members = [] } = useQuery<Member[]>({
        queryKey: ['members', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const res = await api.get(`/users?clubId=${user.clubId}`);
            return res.data;
        },
        enabled: !!user?.clubId && isAttendanceModalOpen
    });

    // Load saved requirements from localStorage (or API in future)
    useEffect(() => {
        const saved = localStorage.getItem(`attendance-requirements-${user?.clubId}`);
        if (saved) {
            try {
                setAttendanceRequirements(JSON.parse(saved));
            } catch {
                setAttendanceRequirements(DEFAULT_REQUIREMENTS);
            }
        }
    }, [user?.clubId]);

    // --- Helpers ---

    const filteredMembers = useMemo(() => {
        if (!selectedMeeting) return members;
        return members.filter(member => {
            if (selectedMeeting.type === 'PARENTS') {
                return member.role !== 'PATHFINDER';
            }
            return member.role !== 'PARENT';
        });
    }, [members, selectedMeeting]);

    // saturdaysInfo removed - not needed with new logic

    // handleQuickCreate removed - not needed with new logic

    const openAttendanceModal = (meeting: Meeting) => {
        setSelectedMeeting(meeting);
        setIsAttendanceModalOpen(true);
        // Initialize attendance grid with all false
        const initialGrid: Record<string, Record<string, boolean>> = {};
        filteredMembers.forEach(member => {
            initialGrid[member.id] = {};
            attendanceRequirements.forEach(req => {
                initialGrid[member.id][req.id] = false;
            });
        });
        setAttendanceGrid(initialGrid);
        setCurrentAttendanceSection(0); // Reset wizard to first section
    };

    const closeAttendanceModal = () => {
        setIsAttendanceModalOpen(false);
        setSelectedMeeting(null);
        setAttendanceGrid({});
        setCurrentAttendanceSection(0); // Reset wizard
    };

    const toggleAttendanceItem = (memberId: string, requirementId: string) => {
        setAttendanceGrid(prev => ({
            ...prev,
            [memberId]: {
                ...prev[memberId],
                [requirementId]: !prev[memberId]?.[requirementId]
            }
        }));
    };

    // toggleMemberAllRequirements removed - not used in wizard mode

    const toggleAllForRequirement = (requirementId: string) => {
        const allChecked = filteredMembers.every(member => attendanceGrid[member.id]?.[requirementId]);

        setAttendanceGrid(prev => {
            const newGrid = { ...prev };
            filteredMembers.forEach(member => {
                if (!newGrid[member.id]) newGrid[member.id] = {};
                newGrid[member.id][requirementId] = !allChecked;
            });
            return newGrid;
        });
    };

    // --- Scoring Config Functions ---
    const saveRequirements = () => {
        localStorage.setItem(`attendance-requirements-${user?.clubId}`, JSON.stringify(attendanceRequirements));
        toast.success('Configuração de pontuação salva!');
        setIsScoringConfigOpen(false);
    };

    const addRequirement = () => {
        if (!newRequirementName.trim()) return;
        const newReq: AttendanceRequirement = {
            id: `custom-${Date.now()}`,
            name: newRequirementName.toUpperCase(),
            points: newRequirementPoints,
            order: attendanceRequirements.length
        };
        setAttendanceRequirements([...attendanceRequirements, newReq]);
        setNewRequirementName('');
        setNewRequirementPoints(10);
    };

    const removeRequirement = (id: string) => {
        setAttendanceRequirements(prev => prev.filter(r => r.id !== id));
    };

    const updateRequirementPoints = (id: string, points: number) => {
        setAttendanceRequirements(prev => prev.map(r =>
            r.id === id ? { ...r, points } : r
        ));
    };

    // --- Mutations ---

    const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);

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
        mutationFn: async (data: { meetingId: string, records: any[] }) => {
            await api.post(`/meetings/${data.meetingId}/attendance`, {
                records: data.records
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['ranking'] });
            toast.success('Presença registrada e pontos calculados!');
            closeAttendanceModal();
        },
        onError: (error: any) => {
            console.error('Attendance Error:', error);
            toast.error('Erro ao registrar presença.');
        }
    });

    const handleAttendanceSubmit = () => {
        if (!selectedMeeting) return;

        // Calculate points and build records
        const records: any[] = [];

        filteredMembers.forEach(member => {
            const memberReqs = attendanceGrid[member.id] || {};

            // Only include members marked as present
            if (memberReqs['presence']) {
                let totalPoints = 0;
                const earnedReqs: string[] = [];

                attendanceRequirements.forEach(req => {
                    if (memberReqs[req.id]) {
                        totalPoints += req.points;
                        earnedReqs.push(req.name);
                    }
                });

                records.push({
                    userId: member.id,
                    points: totalPoints,
                    requirements: earnedReqs
                });
            }
        });

        if (records.length === 0) {
            toast.error('Marque pelo menos a presença de um membro.');
            return;
        }

        if (window.confirm(`Confirmar presença para ${records.length} membros com pontuação calculada?`)) {
            registerAttendanceMutation.mutate({
                meetingId: selectedMeeting.id,
                records: records
            });
        }
    };

    // --- Render ---
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
                        onClick={() => setIsScoringConfigOpen(true)}
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

            {/* Grid - Show all registered meetings in the quarter */}
            {(() => {
                // Filter meetings that fall within the selected quarter
                const quarterStart = startOfQuarter(new Date(selectedYear, (selectedQuarter - 1) * 3, 1));
                const quarterEnd = endOfQuarter(new Date(selectedYear, (selectedQuarter - 1) * 3, 1));

                const quarterMeetings = meetings.filter((m: Meeting) => {
                    const meetingDate = new Date(m.date);
                    return meetingDate >= quarterStart && meetingDate <= quarterEnd;
                }).sort((a: Meeting, b: Meeting) => new Date(a.date).getTime() - new Date(b.date).getTime());

                if (quarterMeetings.length === 0) {
                    return (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhuma chamada neste trimestre</h3>
                            <p className="text-slate-500 mb-6">Clique no botão abaixo para cadastrar uma nova chamada.</p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto transition-all hover:scale-105"
                            >
                                <Plus className="w-5 h-5" />
                                Nova Chamada
                            </button>
                        </div>
                    );
                }

                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {quarterMeetings.map((meeting: Meeting) => {
                            const meetingDate = new Date(meeting.date);
                            const formattedDate = format(meetingDate, "dd 'de' MMMM", { locale: ptBR });
                            const dayOfWeek = format(meetingDate, 'EEEE', { locale: ptBR });

                            return (
                                <div
                                    key={meeting.id}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-[4rem] -mr-8 -mt-8 z-0 opacity-50 group-hover:bg-blue-100 transition-colors" />

                                    {/* Action Buttons - Edit/Delete */}
                                    <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditClick(meeting);
                                            }}
                                            className="p-1.5 bg-white/90 hover:bg-blue-100 text-slate-500 hover:text-blue-600 rounded-lg transition-colors shadow-sm border border-slate-200"
                                            title="Editar Data"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(meeting.id);
                                            }}
                                            className="p-1.5 bg-white/90 hover:bg-red-100 text-slate-500 hover:text-red-600 rounded-lg transition-colors shadow-sm border border-slate-200"
                                            title="Excluir Data"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div
                                        onClick={() => openAttendanceModal(meeting)}
                                        className="cursor-pointer"
                                    >
                                        <div className="relative z-10 flex items-start gap-4">
                                            <div className="bg-blue-100 text-blue-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                                                <Calendar className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 capitalize">{dayOfWeek}</div>
                                                <div className="font-bold text-slate-800 text-lg capitalize">{formattedDate}</div>
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
                                </div>
                            );
                        })}
                    </div>
                );
            })()}

            {/* ========== ATTENDANCE MODAL (WIZARD) ========== */}
            <Modal
                isOpen={isAttendanceModalOpen}
                onClose={closeAttendanceModal}
                title={selectedMeeting ? `Chamada: ${format(new Date(selectedMeeting.date), "dd 'de' MMMM", { locale: ptBR })}` : 'Chamada'}
                maxWidth="max-w-3xl"
            >
                {(() => {
                    // Split requirements into sections of 3
                    const REQS_PER_SECTION = 3;
                    const sections: AttendanceRequirement[][] = [];
                    for (let i = 0; i < attendanceRequirements.length; i += REQS_PER_SECTION) {
                        sections.push(attendanceRequirements.slice(i, i + REQS_PER_SECTION));
                    }
                    // Add a final "Ata/Finalizar" section
                    const totalSections = sections.length + 1; // +1 for final section
                    const isLastSection = currentAttendanceSection >= sections.length;
                    const currentRequirements = sections[currentAttendanceSection] || [];

                    return (
                        <div className="space-y-4">
                            {/* Meeting Info */}
                            {selectedMeeting && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-800">{selectedMeeting.title}</h3>
                                            <p className="text-sm text-slate-500">{format(new Date(selectedMeeting.date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${selectedMeeting.type === 'PARENTS' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                                            {selectedMeeting.type === 'PARENTS' ? 'Reunião de Pais' : selectedMeeting.type}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Progress Indicator */}
                            <div className="flex items-center gap-2">
                                {Array.from({ length: totalSections }).map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex-1 h-2 rounded-full transition-colors ${idx < currentAttendanceSection ? 'bg-green-500' :
                                            idx === currentAttendanceSection ? 'bg-blue-500' :
                                                'bg-slate-200'
                                            }`}
                                    />
                                ))}
                            </div>
                            <div className="text-center text-xs text-slate-500 font-medium">
                                {isLastSection
                                    ? 'Finalizar Chamada'
                                    : `Seção ${currentAttendanceSection + 1} de ${sections.length} - Requisitos`}
                            </div>

                            {/* Quick Actions */}
                            {!isLastSection && (
                                <div className="flex gap-2">
                                    {currentAttendanceSection === 0 && (
                                        <button
                                            onClick={() => setIsScoringConfigOpen(true)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
                                        >
                                            <Settings className="w-4 h-4" />
                                            Configurar Requisitos
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            // Mark all current section requirements for all members
                                            setAttendanceGrid(prev => {
                                                const newGrid = { ...prev };
                                                filteredMembers.forEach(member => {
                                                    if (!newGrid[member.id]) newGrid[member.id] = {};
                                                    currentRequirements.forEach(req => {
                                                        newGrid[member.id][req.id] = true;
                                                    });
                                                });
                                                return newGrid;
                                            });
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium text-sm transition-colors"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Marcar Todos
                                    </button>
                                </div>
                            )}

                            {/* Requirements Section */}
                            {!isLastSection && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <th className="text-left px-4 py-3 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 min-w-[180px]">
                                                        MEMBRO
                                                    </th>
                                                    {currentRequirements.map(req => (
                                                        <th key={req.id} className="text-center px-3 py-3 font-bold text-slate-600 min-w-[100px]">
                                                            <button
                                                                onClick={() => toggleAllForRequirement(req.id)}
                                                                className="hover:text-blue-600 transition-colors"
                                                                title="Marcar/desmarcar todos"
                                                            >
                                                                <div className="text-[10px] uppercase tracking-wider">{req.name}</div>
                                                                <div className="text-[10px] text-slate-400 font-normal">{req.points} PTS</div>
                                                            </button>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredMembers.map(member => {
                                                    const memberGrid = attendanceGrid[member.id] || {};
                                                    const isPresent = memberGrid['presence'];

                                                    return (
                                                        <tr key={member.id} className={`hover:bg-slate-50 transition-colors ${isPresent ? 'bg-green-50/50' : ''}`}>
                                                            <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-slate-100">
                                                                <div className="flex items-center gap-2 text-left">
                                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold flex-shrink-0">
                                                                        {member.name.charAt(0)}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="font-medium text-slate-800 truncate">{member.name}</div>
                                                                        <div className="text-xs text-slate-400">{ROLE_TRANSLATIONS[member.role] || member.role}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {currentRequirements.map(req => (
                                                                <td key={req.id} className="text-center px-3 py-3">
                                                                    <button
                                                                        onClick={() => toggleAttendanceItem(member.id, req.id)}
                                                                        className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all mx-auto ${memberGrid[req.id]
                                                                            ? 'bg-green-500 border-green-500 text-white'
                                                                            : 'bg-white border-slate-300 hover:border-blue-400'
                                                                            }`}
                                                                    >
                                                                        {memberGrid[req.id] && <Check className="w-5 h-5" />}
                                                                    </button>
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Final Section - Summary & ATA */}
                            {isLastSection && (
                                <>
                                    {/* Summary */}
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                        <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5" />
                                            Resumo da Chamada
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-center p-3 bg-white rounded-lg">
                                                <div className="text-2xl font-bold text-green-600">
                                                    {Object.values(attendanceGrid).filter(g => g['presence']).length}
                                                </div>
                                                <div className="text-xs text-slate-500">Presentes</div>
                                            </div>
                                            <div className="text-center p-3 bg-white rounded-lg">
                                                <div className="text-2xl font-bold text-slate-600">
                                                    {filteredMembers.length}
                                                </div>
                                                <div className="text-xs text-slate-500">Total de Membros</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 text-sm text-green-700 text-center">
                                            Total possível: <strong>{attendanceRequirements.reduce((sum, r) => sum + r.points, 0)} pts</strong> por membro
                                        </div>
                                    </div>

                                    {/* Requirements Summary */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <h4 className="font-bold text-slate-700 mb-3">Requisitos Marcados</h4>
                                        <div className="space-y-2">
                                            {attendanceRequirements.map(req => {
                                                const count = Object.values(attendanceGrid).filter(g => g[req.id]).length;
                                                return (
                                                    <div key={req.id} className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-600">{req.name}</span>
                                                        <span className="font-bold text-slate-800">{count}/{filteredMembers.length}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* ATA / Details */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Ata / Observações (opcional)
                                        </label>
                                        <textarea
                                            value={details}
                                            onChange={(e) => setDetails(e.target.value)}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] text-sm"
                                            placeholder="Descreva o que aconteceu na reunião..."
                                        />
                                    </div>
                                </>
                            )}

                            {/* Navigation Actions */}
                            <div className="flex justify-between gap-3 pt-4 border-t border-slate-200">
                                <button
                                    onClick={() => {
                                        if (currentAttendanceSection === 0) {
                                            closeAttendanceModal();
                                        } else {
                                            setCurrentAttendanceSection(prev => prev - 1);
                                        }
                                    }}
                                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {currentAttendanceSection === 0 ? 'Cancelar' : 'Anterior'}
                                </button>

                                <div className="flex gap-2">
                                    {isLastSection ? (
                                        <>
                                            <button
                                                onClick={() => {
                                                    if (selectedMeeting && details !== selectedMeeting.details) {
                                                        updateMeetingMutation.mutate({ id: selectedMeeting.id, details });
                                                    }
                                                }}
                                                disabled={!selectedMeeting || details === (selectedMeeting?.details || '')}
                                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                            >
                                                <Save className="w-4 h-4" />
                                                Salvar Ata
                                            </button>
                                            <button
                                                onClick={handleAttendanceSubmit}
                                                disabled={registerAttendanceMutation.isPending}
                                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                                {registerAttendanceMutation.isPending ? 'Salvando...' : 'Confirmar Chamada'}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setCurrentAttendanceSection(prev => prev + 1)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                                        >
                                            Próximo
                                            <ArrowLeft className="w-4 h-4 rotate-180" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* ========== SCORING CONFIG MODAL ========== */}
            <Modal
                isOpen={isScoringConfigOpen}
                onClose={() => setIsScoringConfigOpen(false)}
                title="Configurar Pontuação"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Configure os requisitos que serão avaliados em cada chamada e a pontuação de cada um.
                    </p>

                    {/* Current Requirements */}
                    <div className="space-y-2">
                        {attendanceRequirements.map((req, index) => (
                            <div key={req.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <span className="text-slate-400 text-sm w-6">{index + 1}.</span>
                                <span className="flex-1 font-medium text-slate-700">{req.name}</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={req.points}
                                        onChange={(e) => updateRequirementPoints(req.id, Number(e.target.value))}
                                        className="w-16 px-2 py-1 border border-slate-300 rounded text-center text-sm"
                                        min="0"
                                    />
                                    <span className="text-xs text-slate-500">pts</span>
                                </div>
                                <button
                                    onClick={() => removeRequirement(req.id)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                    title="Remover"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add New Requirement */}
                    <div className="flex gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <input
                            type="text"
                            value={newRequirementName}
                            onChange={(e) => setNewRequirementName(e.target.value)}
                            placeholder="Nome do requisito"
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                        <input
                            type="number"
                            value={newRequirementPoints}
                            onChange={(e) => setNewRequirementPoints(Number(e.target.value))}
                            className="w-20 px-2 py-2 border border-slate-300 rounded-lg text-center text-sm"
                            min="0"
                        />
                        <button
                            onClick={addRequirement}
                            disabled={!newRequirementName.trim()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar
                        </button>
                    </div>

                    {/* Total Points Info */}
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                        <div className="text-sm text-green-600">
                            Total por membro com tudo marcado:
                        </div>
                        <div className="text-2xl font-bold text-green-700">
                            {attendanceRequirements.reduce((sum, r) => sum + r.points, 0)} pontos
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                            onClick={() => {
                                setAttendanceRequirements(DEFAULT_REQUIREMENTS);
                            }}
                            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-sm"
                        >
                            Restaurar Padrão
                        </button>
                        <button
                            onClick={saveRequirements}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Salvar Configuração
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ========== CREATE/EDIT MEETING MODAL ========== */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={closeCreateModal}
                title={editingMeetingId ? "Editar Reunião" : "Agendar Reunião"}
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4">
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

            {/* ========== IMPORT MODAL ========== */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Importar Reuniões (Excel)"
            >
                <div className="space-y-4">
                    <div className="border border-blue-100 bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                        <p className="font-bold mb-1">Instruções:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>O arquivo deve conter as colunas: <strong>Titulo</strong>, <strong>Data</strong>, <strong>Tipo</strong>, <strong>Pontos</strong>.</li>
                            <li>Formatos aceitos: <strong>.xlsx, .xls</strong></li>
                            <li>Tamanho máx: <strong>2MB</strong></li>
                        </ul>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Arquivo Excel</label>
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
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        />
                    </div>
                    {importMeetingsMutation.isPending && (
                        <p className="text-center text-emerald-600 font-medium">Processando planilha...</p>
                    )}
                </div>
            </Modal>
        </div>
    );
}
