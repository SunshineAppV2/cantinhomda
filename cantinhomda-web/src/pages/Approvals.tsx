import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Check, X, User as UserIcon, ShieldAlert, Send } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_TRANSLATIONS } from './members/types';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'PENDING' | 'ACTIVE' | 'BLOCKED';
    photoUrl?: string;
    mobile?: string;
    club?: {
        name: string;
        settings?: {
            billingCycle?: string;
            memberLimit?: string;
        }
    };
}

export function Approvals() {
    const { user } = useAuth();
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPending = async () => {
        try {
            setLoading(true);
            const response = await api.get('/users');

            // Logic: 
            // - Master sees NEW CLUBS (Owners)
            // - Club Admins see NEW MEMBERS (Non-Owners)
            const isMaster = user?.email === 'master@cantinhomda.com';

            const pending = response.data.filter((u: any) => {
                if (u.status !== 'PENDING') return false;

                if (isMaster) {
                    return u.role === 'OWNER'; // Master validates new Clubs/Owners
                } else {
                    // Club admins/directors see everyone else
                    return u.role !== 'OWNER';
                }
            });

            setPendingUsers(pending);
        } catch (error) {
            console.error('Error fetching pending users:', error);
            toast.error('Erro ao buscar solicitações.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleApprove = async (userId: string, name: string) => {
        try {
            // Update status to ACTIVE
            await api.patch(`/users/${userId}`, { status: 'ACTIVE', isActive: true });
            toast.success(`${name} aprovado com sucesso!`);
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Error approving user:', error);
            toast.error('Erro ao aprovar usuário.');
        }
    };

    const handleReject = async (userId: string) => {
        if (!confirm('Tem certeza que deseja rejeitar e remover esta solicitação?')) return;

        try {
            // Delete the user record? Or block? Usually reject = delete for clean DB
            // Assuming we allow delete. If not, standard implies block.
            // Let's trying deleting since they are pending and have no data.
            // Check if backend supports delete.
            // If delete not exposed, we set to BLOCKED.
            // Start with BLOCKED for safety, or check if we have a delete endpoint. 
            // ClubsService has delete, UsersService?? Let's check keys.
            // Usually safest is to block or have a specific reject logic.
            // I'll set to BLOCKED for now, and maybe later ask.
            await api.patch(`/users/${userId}`, { status: 'BLOCKED', isActive: false });
            toast.success('Solicitação rejeitada.');
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Error rejecting user:', error);
            toast.error('Erro ao rejeitar solicitação.');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Carregando solicitações...</div>;
    }

    if (pendingUsers.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Tudo em dia!</h2>
                <p className="text-slate-500">Nenhuma solicitação pendente no momento.</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <ShieldAlert className="w-8 h-8 text-orange-500" />
                Aprovações Pendentes
            </h1>

            <div className="grid gap-4">
                {pendingUsers.map(user => (
                    <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                                {user.photoUrl ? (
                                    <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-6 h-6 text-slate-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{user.name}</h3>
                                <div className="flex flex-col text-sm text-slate-500">
                                    <span>{user.email}</span>
                                    {user.club?.settings?.billingCycle && user.role === 'OWNER' && (
                                        <span className="font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-md mt-1 w-fit">
                                            Ciclo: {user.club.settings.billingCycle}
                                        </span>
                                    )}
                                </div>
                                <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                                    {ROLE_TRANSLATIONS[user.role] || user.role}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {user.role === 'OWNER' && user.mobile && (
                                <button
                                    onClick={() => {
                                        const cleanPhone = user.mobile?.replace(/\D/g, '') || '';
                                        const cycle = user.club?.settings?.billingCycle || 'MENSAL';

                                        // Parse Limit
                                        const limitStr = user.club?.settings?.memberLimit || '0';
                                        const limit = parseInt(limitStr.replace(/\D/g, ''), 10) || 0;

                                        // Calculate Multiplier based on Cycle
                                        let multiplier = 1;
                                        if (cycle === 'TRIMESTRAL') multiplier = 3;
                                        if (cycle === 'ANUAL') multiplier = 12;

                                        const pricePerUser = 2.00;
                                        const total = limit * pricePerUser * multiplier;

                                        const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);

                                        const msg = encodeURIComponent(`Olá ${user.name}, tudo bem? Aqui é da Administração do CantinhoMDA.\n\nRecebemos seu cadastro! \n\n*Resumo do Plano:*\n- Ciclo: ${cycle}\n- Membros: ${limit}\n- Valor Total: *${formattedTotal}*\n\nSegue a chave PIX para pagamento:\n\n*68323280282* (Alex Oliveira Seabra)\n\nPor favor, envie o comprovante por aqui para liberarmos seu acesso.`);
                                        window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
                                    }}
                                    className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                                    title="Enviar Cobrança WhatsApp"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            )}

                            <button
                                onClick={() => handleReject(user.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Rejeitar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleApprove(user.id, user.name)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
                            >
                                <Check className="w-4 h-4" />
                                {user.role === 'OWNER' ? 'Confirmar Pagamento' : 'Aprovar'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div >
    );
}
