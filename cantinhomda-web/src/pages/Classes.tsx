import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { AlertCircle, BookOpen, ChevronRight, Square, CheckSquare } from 'lucide-react';
import { Modal } from '../components/Modal';

const CLASSES = ['AMIGO', 'COMPANHEIRO', 'PESQUISADOR', 'PIONEIRO', 'EXCURSIONISTA', 'GUIA'];

export function Classes() {
    const queryClient = useQueryClient();
    const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    // Fetch Students
    const { data: students = [], isError: isStudentsError } = useQuery({
        queryKey: ['classes-students', selectedClass],
        queryFn: async () => {
            const response = await api.get(`/ classes / ${selectedClass}/students`);
            return response.data || [];
        }
    });

    // Fetch Class Requirements (Full List)
    const { data: requirements = [], isLoading: isLoadingReqs } = useQuery({
        queryKey: ['class-requirements-list', selectedClass],
        queryFn: async () => {
            // Fetch all requirements and filter by class client-side or assume endpoint supports filtering
            // Using generic endpoint derived from MasterRequirements logic
            const res = await api.get('/requirements', { params: { class: selectedClass } });
            // Filter locally just in case endpoint returns all
            return res.data.filter((r: any) => r.dbvClass === selectedClass) || [];
        }
    });

    const selectedStudent = students.find((s: any) => s.id === selectedStudentId);

    // 1. Approve Existing Request (Pending -> Approved)
    const approveMutation = useMutation({
        mutationFn: async (reqId: string) => {
            // reqId here is the UserRequirement ID (assignment ID)
            return api.patch(`/requirements/${reqId}/approve`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['classes-students'] });
        }
    });

    // 2. Direct Complete (No Assignment -> Approved OR Pending -> Approved)
    const completeMutation = useMutation({
        mutationFn: async ({ requirementId, userId }: { requirementId: string, userId: string }) => {
            return api.post(`/requirements/${requirementId}/complete`, { userId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['classes-students'] });
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gestão de Classes</h1>
                    <p className="text-slate-500">Acompanhe o progresso e realize apontamentos de requisitos.</p>
                </div>
            </div>

            {/* Class Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {CLASSES.map(cls => (
                    <button
                        key={cls}
                        onClick={() => setSelectedClass(cls)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors
                            ${selectedClass === cls ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                    >
                        {cls}
                    </button>
                ))}
            </div>

            {/* Students Grid */}
            {isStudentsError ? (
                <div className="bg-red-50 text-red-600 p-8 rounded-xl text-center border border-red-200">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="font-bold">Não foi possível carregar os desbravadores.</p>
                    <p className="text-sm opacity-75">Tente recarregar a página.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.isArray(students) && students.map((student: any) => (
                        <div key={student.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-blue-300 transition-all cursor-pointer group"
                            onClick={() => setSelectedStudentId(student.id)}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                                    {student.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{student.name}</h3>
                                    <p className="text-xs text-slate-500">{student.unit?.name || 'Sem Unidade'}</p>
                                </div>
                                <ChevronRight className="ml-auto w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                            </div>

                            {/* Progress Overview */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-slate-600">Concluídos</span>
                                    <span className="text-blue-600 font-bold">
                                        {student.requirements?.filter((r: any) => r.status === 'APPROVED').length || 0} / {requirements.length}
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-500"
                                        style={{ width: `${requirements.length > 0 ? ((student.requirements?.filter((r: any) => r.status === 'APPROVED').length || 0) / requirements.length) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {students.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                            Nenhum desbravador encontrado na classe {selectedClass}.
                        </div>
                    )}
                </div>
            )}

            {/* Detailed Requirement Modal */}
            <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudentId(null)} title={`Prontuário: ${selectedStudent?.name}`}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 mb-4 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Gerenciamento de requisitos da classe {selectedClass}.
                    </div>

                    {isLoadingReqs ? (
                        <div className="py-8 text-center text-slate-400 animate-pulse">Carregando cartão...</div>
                    ) : requirements.length === 0 ? (
                        <div className="py-8 text-center text-slate-400">Nenhum requisito cadastrado para esta classe.</div>
                    ) : (
                        requirements.map((req: any) => {
                            // Check status for this user
                            const userReq = selectedStudent?.requirements?.find((r: any) => r.requirementId === req.id);
                            const isApproved = userReq?.status === 'APPROVED';
                            const isPending = userReq?.status === 'PENDING';


                            return (
                                <div key={req.id} className={`p-3 border rounded-lg flex justify-between items-start gap-3 transition-colors ${isApproved ? 'bg-green-50/50 border-green-200' : 'bg-white border-slate-200'
                                    }`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${isApproved ? 'bg-green-200 text-green-800' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {req.code || 'REQ'}
                                            </span>
                                            <h4 className={`font-medium text-sm ${isApproved ? 'text-green-900' : 'text-slate-800'}`}>
                                                {req.description}
                                            </h4>
                                        </div>

                                        {/* Status Indicators */}
                                        {isPending && (
                                            <div className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                                <AlertCircle className="w-3 h-3" />
                                                Aguardando Aprovação
                                            </div>
                                        )}
                                        {userReq?.answerText && (
                                            <p className="text-xs text-slate-600 bg-white/50 p-2 rounded mt-1 italic border border-slate-100">
                                                "{userReq.answerText}"
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="shrink-0">
                                        {isApproved ? (
                                            <button
                                                disabled
                                                className="flex items-center gap-1 text-green-600 font-bold text-sm px-3 py-1.5 rounded-lg bg-green-100 cursor-default opacity-100"
                                            >
                                                <CheckSquare className="w-5 h-5" />
                                            </button>
                                        ) : isPending ? (
                                            <button
                                                onClick={() => approveMutation.mutate(userReq.id)}
                                                disabled={approveMutation.isPending}
                                                className="flex items-center gap-1 text-orange-600 hover:text-white border border-orange-200 hover:bg-orange-500 font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
                                            >
                                                {approveMutation.isPending ? '...' : 'Aprovar'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => completeMutation.mutate({ requirementId: req.id, userId: selectedStudent?.id })}
                                                disabled={completeMutation.isPending}
                                                className="flex items-center gap-1 text-slate-400 hover:text-green-600 hover:bg-green-50 font-medium text-sm px-3 py-1.5 rounded-lg transition-all group-hover:border-green-200"
                                                title="Marcar como Concluído"
                                            >
                                                {completeMutation.isPending ? (
                                                    <span className="animate-spin text-green-600">...</span>
                                                ) : (
                                                    <Square className="w-5 h-5" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </Modal>
        </div>
    );
}
