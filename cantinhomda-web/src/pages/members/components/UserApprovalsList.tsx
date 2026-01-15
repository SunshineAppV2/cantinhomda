
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/axios';
import { useAuth } from '../../../contexts/AuthContext';
import { UserCheck, Check, X, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_TRANSLATIONS } from '../types';

export function UserApprovalsList() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: pendingUsers = [], isLoading, error } = useQuery({
        queryKey: ['pending-user-approvals', user?.clubId],
        queryFn: async () => {
            const res = await api.get('/users');
            // Filter only PENDING members (not Owners, as only Master approves Owners)
            return res.data.filter((u: any) => u.status === 'PENDING' && u.role !== 'OWNER');
        },
        enabled: ['OWNER', 'ADMIN', 'DIRECTOR'].includes(user?.role || ''),
    });

    const approveMutation = useMutation({
        mutationFn: async (userId: string) => {
            await api.patch(`/users/${userId}`, { status: 'ACTIVE', isActive: true });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-user-approvals'] });
            queryClient.invalidateQueries({ queryKey: ['members'] });
            toast.success('Usuário aprovado e acesso liberado!');
        },
        onError: () => toast.error('Erro ao aprovar usuário.')
    });

    const rejectMutation = useMutation({
        mutationFn: async (userId: string) => {
            // rejection: block or delete? Standard is block or delete. 
            // We'll set status to BLOCKED.
            await api.patch(`/users/${userId}`, { status: 'BLOCKED', isActive: false });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-user-approvals'] });
            toast.success('Solicitação rejeitada.');
        },
        onError: () => toast.error('Erro ao rejeitar.')
    });

    if (isLoading || error || pendingUsers.length === 0) return null;

    return (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
                <UserCheck className="w-6 h-6" />
                Novos Membros Aguardando Aprovação ({pendingUsers.length})
            </h2>
            <div className="grid gap-3">
                {pendingUsers.map((u: any) => (
                    <div key={u.id} className="bg-white p-4 rounded-lg border border-blue-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                {u.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-slate-900">{u.name}</p>
                                <p className="text-sm text-slate-500">{u.email}</p>
                                <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-full uppercase font-bold">
                                    {ROLE_TRANSLATIONS[u.role] || u.role}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { if (confirm('Rejeitar este cadastro?')) rejectMutation.mutate(u.id) }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Rejeitar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => approveMutation.mutate(u.id)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-bold shadow-md shadow-blue-200"
                            >
                                <Check className="w-4 h-4" />
                                Liberar Acesso
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <p className="mt-4 text-xs text-blue-600 flex items-center gap-1 italic">
                <ShieldAlert className="w-3 h-3" />
                Apenas após a liberação o membro poderá acessar o sistema.
            </p>
        </div>
    );
}
