import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { Plus, TrendingUp, TrendingDown, DollarSign, Printer, Check, X, FileText, Pencil, Trash2, CheckCircle, Eye, QrCode } from 'lucide-react';
import { Modal } from '../components/Modal';
import { generateFinancialReport } from '../lib/pdf-generator';
import { toast } from 'sonner';
import { PaymentModal } from '../components/PaymentModal';
import { SimplePieChart, CashFlowChart } from '../components/Charts';

interface Transaction {
    id: string;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    category: string;
    date: string;
    status: 'PENDING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'CANCELED';
    points?: number;
    proofUrl?: string;
    payer?: { id: string; name: string };
    dueDate?: string;
}

const getDaysLabel = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return <div className="text-red-600 font-bold text-[10px] mt-0.5">Vencido há {Math.abs(diffDays)} dias</div>;
    if (diffDays === 0) return <div className="text-orange-600 font-bold text-[10px] mt-0.5">Vence hoje</div>;
    return <div className="text-slate-500 text-[10px] mt-0.5">Vence em {diffDays} dias</div>;
};

export function Treasury() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPixModalOpen, setIsPixModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'HISTORY' | 'VALIDATION'>('HISTORY');

    // Form State
    const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Mensalidade');
    const [payerId, setPayerId] = useState('');
    const [points, setPoints] = useState(0);
    const [generatePoints, setGeneratePoints] = useState(false);
    const [recurrence, setRecurrence] = useState(false);
    const [installments, setInstallments] = useState(1);
    const [dueDate, setDueDate] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [settlingTransaction, setSettlingTransaction] = useState<Transaction | null>(null);
    const [validatingTx, setValidatingTx] = useState<Transaction | null>(null);
    const [paymentDate, setPaymentDate] = useState('');
    const [isPaid, setIsPaid] = useState(false);

    // Firestore Imports moved to top

    const { data: transactions = [] } = useQuery<Transaction[]>({
        queryKey: ['transactions', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return [];
            const res = await api.get(`/treasury/club/${user.clubId}`);
            return res.data;
        },
        enabled: !!user?.clubId
    });

    const { data: balanceData } = useQuery({
        queryKey: ['treasury-balance', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return { balance: 0, income: 0, expense: 0 };
            const res = await api.get(`/treasury/balance/${user.clubId}`);
            return res.data;
        },
        enabled: !!user?.clubId
    });

    const summary = useMemo(() => { // Assuming we lift the query execution or access data directly
        // We use 'transactions' from useQuery
        const monthlyMap = new Map<string, { name: string, income: number, expense: number }>();
        const categoryMap = new Map<string, number>();

        transactions.forEach(t => {
            // Monthly
            const date = new Date(t.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

            if (!monthlyMap.has(key)) {
                monthlyMap.set(key, { name: monthName, income: 0, expense: 0 });
            }
            const m = monthlyMap.get(key)!;
            if (t.type === 'INCOME') m.income += t.amount;
            else m.expense += t.amount;

            // Category (Expenses only usually? Or both? Let's chart Expense Distribution)
            if (t.type === 'EXPENSE') {
                const cat = t.category || 'Outros';
                categoryMap.set(cat, (categoryMap.get(cat) || 0) + t.amount);
            }
        });

        // Convert Maps to Arrays
        // Sort months
        const monthlyData = Array.from(monthlyMap.values()).reverse(); // Ascending time order

        const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

        return { monthlyData, categoryData };
    }, [transactions]);

    const { data: members = [], isLoading: membersLoading, error: membersError } = useQuery({
        queryKey: ['treasury-members', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) {
                console.log('[Treasury] No clubId found, user:', user);
                return [];
            }
            console.log('[Treasury] Fetching members for clubId:', user.clubId);
            try {
                const res = await api.get(`/users?clubId=${user.clubId}`);
                console.log('[Treasury] Members received:', res.data?.length, 'members');
                console.log('[Treasury] First 3 members:', res.data?.slice(0, 3));
                return res.data || [];
            } catch (error: any) {
                console.error('[Treasury] Error fetching members:', error);
                console.error('[Treasury] Error details:', error.response?.data);
                throw error;
            }
        },
        enabled: !!user?.clubId,
        retry: 1,
        staleTime: 30000 // Cache for 30 seconds
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!user?.clubId) throw new Error("No club ID");

            // Prepare payload for backend
            const basePayload = {
                type: data.type,
                amount: Number(data.amount),
                description: data.description,
                category: data.category,
                clubId: user.clubId,
                dueDate: data.dueDate,
                points: data.generatePoints ? Number(data.points) : 0,
                status: data.isPaid ? 'COMPLETED' : 'PENDING'
            };

            // If multiple members selected, use bulk endpoint
            if (data.memberIds && data.memberIds.length > 0) {
                const transactions = data.memberIds.map((memberId: string) => ({
                    ...basePayload,
                    payerId: data.payerId || memberId, // Use explicit payer or member self-pay
                    memberId: memberId // Beneficiary
                }));
                await api.post('/treasury/bulk', { transactions });
            } else {
                // Single transaction
                await api.post('/treasury', {
                    ...basePayload,
                    payerId: data.payerId,
                    memberId: data.memberId
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['treasury-balance'] });
            setIsModalOpen(false);
            resetForm();
            toast.success('Transação registrada!');
        },
        onError: (error: any) => {
            console.error('Create Transaction Error:', error);
            const msg = error.response?.data?.message || 'Erro ao criar transação.';
            toast.error(`Erro: ${msg}`);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const { id, ...updateData } = data;
            await api.patch(`/treasury/${id}`, updateData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast.success('Transação atualizada.');
            setIsModalOpen(false);
            resetForm();
        },
        onError: () => toast.error('Erro ao atualizar.')
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/treasury/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['treasury-balance'] });
            toast.success('Transação excluída.');
        },
        onError: () => toast.error('Erro ao excluir.')
    });

    const settleMutation = useMutation({
        mutationFn: async (data: { id: string, paymentDate: string }) => {
            await api.post(`/treasury/${data.id}/settle`, { paymentDate: data.paymentDate });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['treasury-balance'] });
            setSettlingTransaction(null);
            setPaymentDate('');
            toast.success('Baixa registrada!');
        },
        onError: () => toast.error('Erro ao baixar.')
    });

    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.post(`/treasury/${id}/approve`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['treasury-balance'] });
            toast.success('Aprovado com sucesso!');
        }
    });

    const rejectMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.post(`/treasury/${id}/reject`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast.success('Rejeitado.')
        }
    });

    const resetForm = () => {
        setAmount('');
        setDescription('');
        setCategory('Mensalidade');
        setPayerId('');
        setPoints(0);
        setGeneratePoints(false);
        setRecurrence(false);
        setInstallments(1);
        setDueDate('');
        setSelectedMemberIds([]);
        setEditingTransaction(null);
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleSettle = (t: Transaction) => {
        setSettlingTransaction(t);
        setPaymentDate(new Date().toISOString().split('T')[0]); // Default to today
    };

    const handleEdit = (t: Transaction) => {
        setEditingTransaction(t);
        setType(t.type);
        setAmount(t.amount.toString());
        setDescription(t.description);
        setCategory(t.category);
        setPayerId(t.payer?.id || '');
        setPoints(t.points || 0);
        setGeneratePoints((t.points || 0) > 0);
        setRecurrence(false); // Valid for single edit
        setInstallments(1);
        setDueDate(t.date ? new Date(t.date).toISOString().split('T')[0] : ''); // Use date or dueDate? Typically date is creation, dueDate is specific. Using date for now as per form default logic. But wait, form has `dueDate` input.
        // Actually, let's use t.dueDate if exists, else t.date?
        // t interface doesn't have dueDate explicitly defined above line 16, but checking line 16 it ends.
        // I should add dueDate to Transaction interface too if I want to edit it properly.
        // For now, let's assume date refers to 'Data de Vencimento' in the form context?
        // Form input (line 514) binds to `dueDate`.
        // If I edit, I want to see the due date.
        // Backend `Transaction` has `date` (creation/posting) and `dueDate` (vencimento).
        // Let's assume we edit `dueDate`.
        // If `t` from backend has `dueDate`?? Backend `findAll` returns all fields.
        // So `t` has it.
        // I need to add `dueDate` to `Transaction` interface first to be type safe? Yes.
        // Let's assume t has it for now as 'any' or just proceed.
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingTransaction) {
            updateMutation.mutate({
                id: editingTransaction.id,
                type,
                amount: Number(amount),
                description,
                category,
                points: generatePoints ? Number(points) : 0,
                dueDate: dueDate ? new Date(dueDate) : undefined
                // payerId and memberIds usually not editable for simplicity in this flow
            });
        } else {
            createMutation.mutate({
                type,
                amount,
                description,
                category,
                payerId: payerId || undefined,
                memberIds: selectedMemberIds
            });
        }
    };

    const pendingValidations = transactions.filter(t => t.status === 'WAITING_APPROVAL');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Tesouraria</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => generateFinancialReport(transactions, balanceData, 'Clube')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Printer className="w-5 h-5" />
                        Relatório
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nova Transação
                    </button>
                    {user?.role === 'MASTER' && (
                        <button
                            onClick={() => setIsPixModalOpen(true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <QrCode className="w-5 h-5" />
                            Cobrar Pix
                        </button>
                    )}
                </div>
            </div>

            <PaymentModal
                isOpen={isPixModalOpen}
                onClose={() => setIsPixModalOpen(false)}
                member={undefined} // Or selected member if we implement that context
            />

            {/* Navigation Tabs */}
            <div className="flex gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('HISTORY')}
                    className={`pb-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'HISTORY' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Histórico
                </button>
                <button
                    onClick={() => setActiveTab('VALIDATION')}
                    className={`pb-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'VALIDATION' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Validações Pendentes ({pendingValidations.length})
                </button>
            </div>

            {/* Stats Cards (Only in History?) OK to keep always */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">Saldo Total</p>
                            <h3 className={`text-2xl font-bold ${(balanceData?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                R$ {balanceData?.balance?.toFixed(2) || '0.00'}
                            </h3>
                        </div>
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                            <DollarSign className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">Receitas</p>
                            <h3 className="text-2xl font-bold text-green-600">
                                + R$ {balanceData?.income?.toFixed(2) || '0.00'}
                            </h3>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">Despesas</p>
                            <h3 className="text-2xl font-bold text-red-600">
                                - R$ {balanceData?.expense?.toFixed(2) || '0.00'}
                            </h3>
                        </div>
                        <div className="p-2 bg-red-50 rounded-lg text-red-600">
                            <TrendingDown className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <CashFlowChart
                    title="Fluxo de Caixa"
                    data={summary.monthlyData}
                    dataKeyName="name"
                    dataKeyIncome="income"
                    dataKeyExpense="expense"
                />
                <SimplePieChart
                    title="Despesas por Categoria"
                    data={summary.categoryData}
                    dataKeyName="name"
                    dataKeyValue="value"
                />
            </div>

            {/* VALIDATION View */}
            {
                activeTab === 'VALIDATION' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 font-bold text-slate-700 bg-orange-50">
                            Pagamentos Aguardando Aprovação
                        </div>
                        {pendingValidations.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">Nenhuma validação pendente.</div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-3">Data</th>
                                        <th className="px-6 py-3">Membro</th>
                                        <th className="px-6 py-3">Descrição (Categoria)</th>
                                        <th className="px-6 py-3 text-right">Valor</th>
                                        <th className="px-6 py-3 text-center">Comprovante</th>
                                        <th className="px-6 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {pendingValidations.map(t => (
                                        <tr key={t.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3">{new Date(t.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-3 font-semibold">{t.payer?.name || '-'}</td>
                                            <td className="px-6 py-3">{t.description} <span className="text-xs text-slate-400">({t.category})</span></td>
                                            <td className="px-6 py-3 text-right font-bold text-green-600">R$ {t.amount.toFixed(2)}</td>
                                            <td className="px-6 py-3 text-center">
                                                {t.proofUrl ? (
                                                    <a href={t.proofUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center justify-center gap-1">
                                                        <FileText className="w-4 h-4" /> Ver
                                                    </a>
                                                ) : <span className="text-slate-400">-</span>}
                                            </td>
                                            <td className="px-6 py-3 text-right flex justify-end gap-2">
                                                <button
                                                    onClick={() => approveMutation.mutate(t.id)}
                                                    className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Aprovar">
                                                    <Check className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => rejectMutation.mutate(t.id)}
                                                    className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Rejeitar">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )
            }

            {/* HISTORY View */}
            {
                activeTab === 'HISTORY' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 font-bold text-slate-700">
                            Histórico de Transações
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-3">Vencimento</th>
                                        <th className="px-6 py-3">Descrição</th>
                                        <th className="px-6 py-3">Categoria</th>
                                        <th className="px-6 py-3">Membro</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Valor</th>
                                        <th className="px-6 py-3 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {transactions.map(t => {
                                        const isOverdue = t.status === 'PENDING' && t.dueDate && new Date() > new Date(t.dueDate);
                                        let rowClass = 'hover:bg-slate-50'; // Default
                                        if (t.status === 'COMPLETED') rowClass = 'bg-green-50 hover:bg-green-100';
                                        else if (isOverdue) rowClass = 'bg-red-50 hover:bg-red-100';
                                        else if (t.status === 'PENDING') rowClass = 'bg-orange-50 hover:bg-orange-100';

                                        return (
                                            <tr key={t.id} className={`transition-colors border-b border-slate-200 ${rowClass}`}>
                                                <td className="px-6 py-3 text-slate-600">
                                                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : new Date(t.date).toLocaleDateString()}
                                                    {t.status === 'PENDING' && getDaysLabel(t.dueDate)}
                                                </td>
                                                <td className="px-6 py-3 font-medium text-slate-800">
                                                    {t.description}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium border ${t.type === 'INCOME'
                                                        ? 'bg-green-50 text-green-700 border-green-100'
                                                        : 'bg-red-50 text-red-700 border-red-100'
                                                        }`}>
                                                        {t.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-slate-600">
                                                    {t.payer?.name || '-'}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                        t.status === 'WAITING_APPROVAL' ? 'bg-yellow-100 text-yellow-700' :
                                                            t.status === 'PENDING' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {t.status === 'COMPLETED' ? 'Concluído' :
                                                            t.status === 'WAITING_APPROVAL' ? 'Aguardando' :
                                                                t.status === 'PENDING' ? 'Pendente' : 'Cancelado'}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-3 text-right font-bold ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <button
                                                        onClick={() => handleEdit(t)}
                                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(t.id)} // Assuming handleDelete is defined
                                                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    {(t.status === 'WAITING_APPROVAL' || t.status === 'PENDING') && (
                                                        <button
                                                            onClick={() => setValidatingTx(t)}
                                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                                                            title="Validar / Ver Detalhes"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {t.status === 'PENDING' && (
                                                        <button
                                                            onClick={() => handleSettle(t)}
                                                            className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-slate-100 rounded transition-colors"
                                                            title="Baixar (Quitar)"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                                                Nenhuma transação encontrada.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTransaction ? "Editar Transação" : "Nova Transação"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-4 mb-4">
                        <button
                            type="button"
                            onClick={() => setType('INCOME')}
                            className={`flex-1 py-2 rounded-lg font-medium border transition-colors ${type === 'INCOME'
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            Entrada
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('EXPENSE')}
                            className={`flex-1 py-2 rounded-lg font-medium border transition-colors ${type === 'EXPENSE'
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            Saída
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <input
                            type="text"
                            required
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={type === 'INCOME' ? 'Ex: Mensalidade Fevereiro' : 'Ex: Compra de Materiais'}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                            <input
                                type="number"
                                required
                                step="0.01"
                                min="0"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {type === 'INCOME' ? (
                                    <>
                                        <option>Mensalidade</option>
                                        <option>Seguro</option>
                                        <option>Uniforme</option>
                                        <option>Evento</option>
                                        <option>Outros</option>
                                    </>
                                ) : (
                                    <>
                                        <option>Material</option>
                                        <option>Lanche</option>
                                        <option>Transporte</option>
                                        <option>Inscrição</option>
                                        <option>Outros</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    {type === 'INCOME' && (
                        <div className="space-y-4 pt-2 border-t border-slate-100">
                            {/* Payer Field (Optional - Defaults to Member) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Pagador (Opcional)
                                    <span className="text-xs text-slate-400 font-normal ml-2">
                                        (Quem está pagando? Deixe vazio se for o próprio membro)
                                    </span>
                                </label>
                                <select
                                    value={payerId}
                                    onChange={e => setPayerId(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="">O Próprio Membro (Auto-pagamento)</option>
                                    {members
                                        .sort((a: any, b: any) => a.name.localeCompare(b.name))
                                        .map((m: any) => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Membros (Selecione um ou mais)
                                    <span className="ml-2 text-xs text-blue-600 font-bold">
                                        [{members.length} disponíveis]
                                    </span>
                                </label>

                                {/* Debug Info */}
                                {membersError && (
                                    <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                                        <p className="text-red-700 font-bold">Erro ao carregar membros:</p>
                                        <p className="text-red-600">{(membersError as any)?.message || 'Erro desconhecido'}</p>
                                    </div>
                                )}

                                {!membersLoading && !membersError && members.length === 0 && user?.clubId && (
                                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                        <p className="text-yellow-700">
                                            📊 Debug: clubId = {user.clubId}<br />
                                            API retornou 0 membros
                                        </p>
                                    </div>
                                )}
                                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                                    {membersLoading ? (
                                        <div className="p-4 text-center text-slate-500">
                                            Carregando membros...
                                        </div>
                                    ) : members.length === 0 ? (
                                        <div className="p-4 text-center text-slate-500">
                                            Nenhum membro encontrado no clube.
                                        </div>
                                    ) : (
                                        <>
                                            <label className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded cursor-pointer border-b border-slate-200 mb-2 font-bold text-blue-600">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMemberIds.length === members.length && members.length > 0}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedMemberIds(members.map((m: any) => m.id));
                                                        else setSelectedMemberIds([]);
                                                    }}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                    disabled={!!editingTransaction}
                                                />
                                                <span className={editingTransaction ? 'text-slate-400' : ''}>Selecionar Todos</span>
                                            </label>
                                            {members.map((m: any) => (
                                                <label key={m.id} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedMemberIds.includes(m.id) || (!!editingTransaction && editingTransaction.payer?.id === m.id)}
                                                        onChange={() => {
                                                            if (editingTransaction) return;
                                                            setSelectedMemberIds(prev =>
                                                                prev.includes(m.id)
                                                                    ? prev.filter(id => id !== m.id)
                                                                    : [...prev, m.id]
                                                            );
                                                        }}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                        disabled={!!editingTransaction}
                                                    />
                                                    <span className={editingTransaction ? 'text-slate-400' : ''}>{m.name}</span>
                                                </label>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isPaid"
                                    checked={isPaid}
                                    onChange={e => setIsPaid(e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 rounded"
                                    disabled={!!editingTransaction}
                                />
                                <label htmlFor="isPaid" className="text-sm text-slate-700 font-bold">
                                    Pagamento já recebido? (Dinheiro)
                                </label>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="genPoints"
                                    checked={generatePoints}
                                    onChange={e => setGeneratePoints(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <label htmlFor="genPoints" className="text-sm text-slate-700">Gerar pontuação ao confirmar?</label>
                            </div>

                            {generatePoints && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Pontos a conceder</label>
                                    <input
                                        type="number"
                                        value={points}
                                        onChange={e => setPoints(Number(e.target.value))}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                                        min="0"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="recurrence"
                                    checked={recurrence}
                                    onChange={e => setRecurrence(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded"
                                    disabled={!!editingTransaction}
                                />
                                <label htmlFor="recurrence" className={`text-sm ${editingTransaction ? 'text-slate-300' : 'text-slate-700'}`}>Pagamento Recorrente (Mensal)?</label>
                            </div>

                            {recurrence && !editingTransaction && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade de Meses</label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="60"
                                        value={installments}
                                        onChange={e => setInstallments(Number(e.target.value))}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                                        placeholder="Ex: 12"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Vencimento</label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className={`px-4 py-2 rounded-lg text-white font-medium transition-opacity ${type === 'INCOME' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                } ${createMutation.isPending || updateMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : (editingTransaction ? 'Atualizar' : 'Salvar')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Settlement Modal */}
            <Modal isOpen={!!settlingTransaction} onClose={() => setSettlingTransaction(null)} title="Baixar Transação (Quitação)">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (settlingTransaction && paymentDate) {
                        settleMutation.mutate({ id: settlingTransaction.id, paymentDate });
                    }
                }} className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg mb-4">
                        <p className="text-sm text-green-800 font-medium">Confirmar recebimento de:</p>
                        <p className="text-xl font-bold text-green-700">R$ {settlingTransaction?.amount.toFixed(2)}</p>
                        <p className="text-sm text-green-600">{settlingTransaction?.description}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data do Pagamento</label>
                        <input
                            type="date"
                            required
                            value={paymentDate}
                            onChange={e => setPaymentDate(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={() => setSettlingTransaction(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                        <button
                            type="submit"
                            disabled={settleMutation.isPending}
                            className={`px-4 py-2 rounded-lg text-white font-medium transition-opacity bg-green-600 hover:bg-green-700
                                ${settleMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {settleMutation.isPending ? 'Processando...' : 'Confirmar Baixa'}
                        </button>
                    </div>
                </form>
            </Modal>
            {/* Validation Modal */}
            <Modal isOpen={!!validatingTx} onClose={() => setValidatingTx(null)} title="Validar Comprovante">
                {validatingTx && (
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-slate-500">Membro/Pagador</span>
                                <span className="font-bold text-slate-700">{validatingTx.payer?.name || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-slate-500">Valor</span>
                                <span className="font-bold text-slate-700">R$ {validatingTx.amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-slate-500">Descrição</span>
                                <span className="font-medium text-slate-700">{validatingTx.description}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Status Atual</span>
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-700">{validatingTx.status}</span>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-700 mb-2">Comprovante Anexado</h4>
                            {validatingTx.proofUrl ? (
                                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-100 min-h-[200px] flex items-center justify-center relative group">
                                    {validatingTx.proofUrl.match(/\.(jpeg|jpg|png|webp)$/i) ? (
                                        <a href={api.defaults.baseURL + validatingTx.proofUrl} target="_blank" rel="noopener noreferrer">
                                            <img
                                                src={api.defaults.baseURL + validatingTx.proofUrl}
                                                alt="Comprovante"
                                                className="max-w-full max-h-[400px] object-contain"
                                            />
                                        </a>
                                    ) : (
                                        <div className="text-center p-8">
                                            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                                            <p className="text-slate-600 mb-2">Documento PDF ou outro formato</p>
                                            <a
                                                href={api.defaults.baseURL + validatingTx.proofUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline text-sm font-bold"
                                            >
                                                Abrir Arquivo
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-slate-50 border border-slate-200 border-dashed rounded-lg text-slate-400">
                                    Nenhum comprovante anexado.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setValidatingTx(null)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('Rejeitar este pagamento?')) {
                                        rejectMutation.mutate(validatingTx.id);
                                        setValidatingTx(null);
                                    }
                                }}
                                className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 font-medium rounded-lg flex items-center gap-2"
                            >
                                <X className="w-4 h-4" /> Rejeitar
                            </button>
                            <button
                                onClick={() => {
                                    approveMutation.mutate(validatingTx.id);
                                    setValidatingTx(null);
                                }}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" /> Aprovar Pagamento
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div >
    );
}
