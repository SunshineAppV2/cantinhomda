import { useState } from 'react';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { ChevronRight, ChevronDown, Building2, MapPin, Globe, Pencil, Trash2, Plus, Settings, AlertTriangle, Search, LayoutGrid, List, DollarSign, Send, UserCog, Calendar, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { ClubSubscriptionModal } from '../components/ClubSubscriptionModal';
import { EditClubModal } from '../components/EditClubModal';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, format } from 'date-fns';

interface HierarchyNode {
    id: string;
    name: string;
}

interface TreeData {
    [union: string]: {
        [mission: string]: {
            [region: string]: HierarchyNode[];
        };
    };
}

export function Hierarchy() {
    console.log("Hierarchy Component Loaded - v2 (Grace Period)");
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'SOON' | 'EXPIRED' | 'NO_DATE'>('ALL');

    // New Hierarchy Filters
    const [filterUnion, setFilterUnion] = useState('');
    const [filterMission, setFilterMission] = useState('');
    const [filterRegion, setFilterRegion] = useState('');
    const [filterDistrict, setFilterDistrict] = useState('');

    // --- QUERY: TREE DATA ---
    const { data: tree = {}, refetch: refetchTree } = useQuery({
        queryKey: ['hierarchy-tree'],
        queryFn: async () => (await api.get('/clubs/hierarchy-tree')).data
    });

    // --- QUERY: DETAILED CLUBS DATA (DASHBOARD) ---
    const { data: allClubs = [], isLoading: loadingClubs, refetch: refetchClubs } = useQuery({
        queryKey: ['clubs-dashboard'],
        queryFn: async () => (await api.get('/clubs/dashboard')).data
    });

    // State for Modals
    const [editingSubscription, setEditingSubscription] = useState<any | null>(null);
    const [editingClubData, setEditingClubData] = useState<any | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newClub, setNewClub] = useState({ name: '', union: '', mission: '', region: '', district: '', association: '' });
    const [createLoading, setCreateLoading] = useState(false);
    const [editingNode, setEditingNode] = useState<{ level: 'union' | 'mission' | 'region', oldName: string, newName: string } | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedClubForPayment, setSelectedClubForPayment] = useState<any | null>(null);
    const [paymentMessage, setPaymentMessage] = useState('');
    const [sendingPayment, setSendingPayment] = useState(false);

    // Bulk Selection State
    const [selectedClubIds, setSelectedClubIds] = useState<Set<string>>(new Set());
    const [bulkDateModalOpen, setBulkDateModalOpen] = useState(false);
    const [bulkNewDate, setBulkNewDate] = useState('');
    const [bulkGracePeriod, setBulkGracePeriod] = useState(5);
    const [bulkUpdating, setBulkUpdating] = useState(false);

    const DEFAULT_PAYMENT_MSG = `Olá! Sua assinatura do Cantinho DBV está vencendo. Para renovar, faça um PIX para a chave: 68323280282 (Alex Oliveira Seabra) e envie o comprovante.`;

    const openPaymentModal = (club: any) => {
        setSelectedClubForPayment(club);
        setPaymentMessage(DEFAULT_PAYMENT_MSG);
        setPaymentModalOpen(true);
    };

    const handleSendPayment = async () => {
        if (!selectedClubForPayment) return;
        setSendingPayment(true);
        try {
            await api.post(`/clubs/${selectedClubForPayment.id}/send-payment-info`, { message: paymentMessage });
            toast.success('Cobrança enviada com sucesso!');
            setPaymentModalOpen(false);
        } catch (error) {
            toast.error('Erro ao enviar cobrança.');
        } finally {
            setSendingPayment(false);
        }
    };

    // Filter Logic for Table
    const filteredClubs = allClubs.filter((club: any) => {
        // 1. Text Search
        const matchesSearch = club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            club.union?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            club.mission?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            club.region?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            club.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            club.association?.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        // 2. Status Filter
        const daysTo = club.nextBillingDate ? differenceInDays(new Date(club.nextBillingDate), new Date()) : 999;
        const isExpired = club.subscriptionStatus === 'EXPIRED' || (club.nextBillingDate && daysTo < 0);
        const isWarning = !isExpired && daysTo <= 30 && club.nextBillingDate;





        if (filterStatus === 'ALL') {
            // Pass through unless filtered by hierarchy below
        }

        // 3. Hierarchy Filters
        if (filterUnion && club.union !== filterUnion) return false;
        if (filterMission && (club.mission !== filterMission && club.association !== filterMission)) return false;
        if (filterRegion && club.region !== filterRegion) return false;
        if (filterDistrict && club.district !== filterDistrict) return false;

        if (filterStatus === 'ALL') return true;


        // User requested: VENCE EM BREVE / ATIVO / SEM DATA / ETC.
        // Let's be strict:
        if (filterStatus === 'ACTIVE') return !isExpired && club.nextBillingDate;
        if (filterStatus === 'SOON') return isWarning;
        if (filterStatus === 'EXPIRED') return isExpired;
        if (filterStatus === 'NO_DATE') return !club.nextBillingDate;

        return true;
    }).sort((a: any, b: any) => {
        // Sort by expiration date (closest to today first)
        // Null dates go last
        if (!a.nextBillingDate) return 1;
        if (!b.nextBillingDate) return -1;
        return new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime();
    });

    // Stats
    const totalClubs = allClubs.length;

    // --- UNIQUE VALUES FOR FILTERS ---
    const unions = Array.from(new Set(allClubs.map((c: any) => c.union).filter(Boolean))).sort();
    const missions = Array.from(new Set(allClubs.map((c: any) => c.mission || c.association).filter(Boolean))).sort();
    const regions = Array.from(new Set(allClubs.map((c: any) => c.region).filter(Boolean))).sort();
    const districts = Array.from(new Set(allClubs.map((c: any) => c.district).filter(Boolean))).sort();
    const activeLicenses = allClubs.filter((c: any) => c.subscriptionStatus === 'ACTIVE' || c.subscriptionStatus === 'TRIAL').length;
    const expiringSoon = allClubs.filter((c: any) => {
        if (!c.nextBillingDate) return false;
        const days = differenceInDays(new Date(c.nextBillingDate), new Date());
        return days <= 30 && days >= 0;
    }).length;


    // --- ACTIONS ---
    const toggle = (key: string) => {
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleCreateClub = async () => {
        if (!newClub.name || !newClub.union || !newClub.mission || !newClub.region) return toast.error('Preencha tudo!');
        setCreateLoading(true);
        try {
            await api.post('/clubs', newClub);
            toast.success('Criado!');
            setIsCreateOpen(false);
            setNewClub({ name: '', union: '', mission: '', region: '', district: '', association: '' });
            refetchTree();
            refetchClubs();
        } catch (e) { toast.error('Erro ao criar.'); }
        finally { setCreateLoading(false); }
    };

    const handleRename = async () => {
        if (!editingNode) return;
        try {
            await api.patch('/clubs/hierarchy/rename', editingNode);
            toast.success('Renomeado!');
            setEditingNode(null);
            refetchTree();
        } catch (e) { toast.error('Erro ao renomear.'); }
    };

    const handleDeleteNode = async (level: string, name: string) => {
        if (!confirm('Tem certeza? Isso oculpará os clubes deste nível no filtro de árvore, mas não deletará os clubes.')) return;
        try {
            await api.delete('/clubs/hierarchy', { params: { level, name } });
            toast.success('Removido!');
            refetchTree();
        } catch (e) { toast.error('Erro ao remover.'); }
    };

    const handleDeleteClub = async (id: string, name: string) => {
        if (!confirm(`TEM CERTEZA? Isso deletará PERMANENTEMENTE o clube "${name}" e TODOS os seus membros, atividades e dados financeira. Esta ação não pode ser desfeita.`)) return;
        try {
            await api.delete(`/clubs/${id}`);
            toast.success('Clube removido definitivamente!');
            refetchTree();
            refetchClubs();
        } catch (e: any) {
            toast.error('Erro ao remover clube. Verifique se existem membros vinculados que impedem a exclusão.');
        }
    };

    // --- BULK SELECTION HANDLERS ---
    const handleSelectClub = (clubId: string) => {
        setSelectedClubIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(clubId)) {
                newSet.delete(clubId);
            } else {
                newSet.add(clubId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedClubIds.size === filteredClubs.length) {
            setSelectedClubIds(new Set());
        } else {
            setSelectedClubIds(new Set(filteredClubs.map((c: any) => c.id)));
        }
    };

    const clearSelection = () => {
        setSelectedClubIds(new Set());
    };

    const handleBulkUpdateDate = async () => {
        if (!bulkNewDate || selectedClubIds.size === 0) {
            toast.error('Selecione uma data válida.');
            return;
        }

        setBulkUpdating(true);
        try {
            await api.patch('/clubs/bulk-update-billing-date', {
                clubIds: Array.from(selectedClubIds),
                nextBillingDate: bulkNewDate,
                gracePeriodDays: bulkGracePeriod
            });
            toast.success(`${selectedClubIds.size} clube(s) atualizado(s) com sucesso!`);
            setBulkDateModalOpen(false);
            setBulkNewDate('');
            setBulkGracePeriod(5);
            clearSelection();
            refetchClubs();
        } catch (error) {
            toast.error('Erro ao atualizar datas em massa.');
        } finally {
            setBulkUpdating(false);
        }
    };


    if (user?.email !== 'master@cantinhodbv.com' && user?.role !== 'MASTER') {
        return <div className="p-8 text-center text-red-500">Acesso restrito ao Master.</div>;
    }

    return (
        <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">

            {/* --- HEADER & STATS --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-8 h-8 text-blue-600" />
                        Gestão de Clubes & Licenças
                    </h1>
                    <p className="text-slate-500">Administre hierarquias, clubes e assinaturas.</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-sm self-start md:self-auto"
                >
                    <Plus className="w-5 h-5" /> Novo Clube
                </button>
            </div>

            {/* --- DASHBOARD CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl bordered border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                        <Building2 className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total de Clubes</p>
                        <h3 className="text-2xl font-bold text-slate-800">{totalClubs}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl bordered border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                        <Settings className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Licenças Ativas</p>
                        <h3 className="text-2xl font-bold text-slate-800">{activeLicenses}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl bordered border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-yellow-500">
                    <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Vencendo em 30 dias</p>
                        <h3 className="text-2xl font-bold text-slate-800">{expiringSoon}</h3>
                    </div>
                </div>
            </div>

            {/* --- CONTROLS --- */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Search */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar clube, união ou missão..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                    </div>

                    {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List className="w-4 h-4" /> Lista Detalhada
                        </button>
                        <button
                            onClick={() => setViewMode('tree')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'tree' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutGrid className="w-4 h-4" /> Estrutura
                        </button>
                    </div>
                </div>

                {/* --- HIERARCHY FILTERS (DROPDOWNS) --- */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                    <select value={filterUnion} onChange={e => setFilterUnion(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Todas Uniões</option>
                        {unions.map((u: any) => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <select value={filterMission} onChange={e => setFilterMission(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Todas Associações</option>
                        {missions.map((m: any) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Todas Regiões</option>
                        {regions.map((r: any) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Todos Distritos</option>
                        {districts.map((d: any) => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                {/* Status Filters (Pills) */}
                {viewMode === 'table' && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                            onClick={() => setFilterStatus('ALL')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${filterStatus === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilterStatus('SOON')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${filterStatus === 'SOON' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white text-slate-600 border-slate-200 hover:border-yellow-200'}`}
                        >
                            Vence em Breve
                        </button>
                        <button
                            onClick={() => setFilterStatus('ACTIVE')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${filterStatus === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-slate-600 border-slate-200 hover:border-green-200'}`}
                        >
                            Ativos
                        </button>
                        <button
                            onClick={() => setFilterStatus('EXPIRED')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${filterStatus === 'EXPIRED' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-slate-600 border-slate-200 hover:border-red-200'}`}
                        >
                            Vencidos
                        </button>
                        <button
                            onClick={() => setFilterStatus('NO_DATE')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${filterStatus === 'NO_DATE' ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                        >
                            Sem Data/Vitalício
                        </button>
                    </div>
                )}
            </div>

            {/* --- BULK ACTIONS TOOLBAR --- */}
            {selectedClubIds.size > 0 && (
                <div className="bg-blue-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 px-3 py-1.5 rounded-lg font-bold">
                            {selectedClubIds.size} selecionado{selectedClubIds.size > 1 ? 's' : ''}
                        </div>
                        <button
                            onClick={clearSelection}
                            className="text-white/80 hover:text-white flex items-center gap-1 text-sm"
                        >
                            <X className="w-4 h-4" /> Limpar
                        </button>
                    </div>
                    <button
                        onClick={() => setBulkDateModalOpen(true)}
                        className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors flex items-center gap-2"
                    >
                        <Calendar className="w-4 h-4" /> Atualizar Data de Vencimento
                    </button>
                </div>
            )}

            {/* --- CONTENT --- */}
            {viewMode === 'table' ? (
                <>
                    {/* DESKTOP TABLE */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                                        <th className="p-4 w-12">
                                            <input
                                                type="checkbox"
                                                checked={selectedClubIds.size === filteredClubs.length && filteredClubs.length > 0}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </th>
                                        <th className="p-4 font-bold">Clube / Localização</th>
                                        <th className="p-4 font-bold">Status</th>
                                        <th className="p-4 font-bold">Plano</th>
                                        <th className="p-4 font-bold">Vencimento</th>
                                        <th className="p-4 font-bold text-center">Membros</th>
                                        <th className="p-4 font-bold text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                    {loadingClubs ? (
                                        <tr><td colSpan={7} className="p-8 text-center text-slate-500">Carregando dados...</td></tr>
                                    ) : filteredClubs.length === 0 ? (
                                        <tr><td colSpan={7} className="p-8 text-center text-slate-500">Nenhum clube encontrado.</td></tr>
                                    ) : (
                                        filteredClubs.map((club: any) => {
                                            // Calc status color logic duplicated? Better extract if complex.
                                            // Reusing logic inline for now as it's simple.
                                            const daysTo = club.nextBillingDate ? differenceInDays(new Date(club.nextBillingDate), new Date()) : 999;
                                            const isExpired = club.subscriptionStatus === 'EXPIRED' || (club.nextBillingDate && daysTo < 0);
                                            const isWarning = !isExpired && daysTo <= 30 && club.nextBillingDate;

                                            const statusColorClass = isExpired ? 'bg-red-100 text-red-700 border-red-200'
                                                : isWarning ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                    : 'bg-green-100 text-green-700 border-green-200';
                                            const statusText = isExpired ? 'VENCIDO' : isWarning ? 'VENCE EM BREVE' : 'ATIVO';

                                            const isSelected = selectedClubIds.has(club.id);

                                            return (
                                                <tr key={club.id} className={`hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-blue-50' : ''}`}>
                                                    <td className="p-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleSelectClub(club.id)}
                                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-bold text-slate-800">{club.name}</div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                            <Globe className="w-3 h-3" /> {club.union}
                                                            <span className="text-slate-300">•</span>
                                                            <MapPin className="w-3 h-3" /> {club.mission} / {club.region} {club.district ? `/ ${club.district}` : ''}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusColorClass}`}>
                                                            {statusText}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-1">
                                                            {club.planTier === 'FREE' && <span className="bg-slate-100 text-slate-600 px-2 rounded text-xs font-bold">GRÁTIS</span>}
                                                            {club.planTier === 'PREMIUM' && <span className="bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 px-2 rounded text-xs font-bold">PREMIUM</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 font-medium">
                                                        {club.nextBillingDate ? format(new Date(club.nextBillingDate), 'dd/MM/yyyy') : '-'}
                                                        {isWarning && <span className="ml-2 text-xs text-yellow-600 font-bold">({daysTo} dias)</span>}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="bg-slate-100 px-2 py-1 rounded-full text-xs font-bold text-slate-600 mb-1" title="Membros Pagantes (Ativos)">
                                                                {club.activeMembers || 0} / {club.memberLimit || '∞'}
                                                            </span>
                                                            {club.freeMembers > 0 && (
                                                                <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-100" title="Pais / Isentos">
                                                                    + {club.freeMembers} Pais
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => openPaymentModal(club)} className="text-green-600 border border-green-200 bg-green-50 px-2 py-1 rounded hover:bg-green-100" title="Cobrar"><DollarSign className="w-4 h-4" /></button>
                                                            <button onClick={() => setEditingSubscription(club)} className="text-blue-600 border border-blue-200 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100" title="Assinatura"><Settings className="w-4 h-4" /></button>
                                                            <button onClick={() => setEditingClubData(club)} className="text-slate-400 hover:text-amber-600 p-1.5" title="Editar"><Pencil className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDeleteClub(club.id, club.name)} className="text-slate-400 hover:text-red-600 p-1.5" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* MOBILE CARDS */}
                    <div className="md:hidden space-y-3">
                        {loadingClubs ? (
                            <p className="text-center text-slate-500 py-4">Carregando...</p>
                        ) : filteredClubs.length === 0 ? (
                            <p className="text-center text-slate-500 py-4">Nenhum clube encontrado.</p>
                        ) : (
                            filteredClubs.map((club: any) => {
                                const daysTo = club.nextBillingDate ? differenceInDays(new Date(club.nextBillingDate), new Date()) : 999;
                                const isExpired = club.subscriptionStatus === 'EXPIRED' || (club.nextBillingDate && daysTo < 0);
                                const isWarning = !isExpired && daysTo <= 30 && club.nextBillingDate;
                                const statusColorClass = isExpired ? 'bg-red-100 text-red-700 border-red-200'
                                    : isWarning ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                        : 'bg-green-100 text-green-700 border-green-200';
                                const statusText = isExpired ? 'VENCIDO' : isWarning ? 'VENCE EM BREVE' : 'ATIVO';

                                const isSelected = selectedClubIds.has(club.id);

                                return (
                                    <div key={club.id} className={`bg-white p-4 rounded-xl border transition-all shadow-sm space-y-3 relative ${isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30' : 'border-slate-200'}`}>
                                        {/* Selection Checkbox Mobile */}
                                        <div className="absolute top-2 left-2 z-10">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleSelectClub(club.id)}
                                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
                                            />
                                        </div>
                                        {/* Header: Name + Badge */}
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-base">{club.name}</h3>
                                                <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-2">
                                                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {club.union}</span>
                                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {club.mission}</span>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusColorClass} shrink-0`}>
                                                {statusText}
                                            </span>
                                        </div>

                                        {/* Stats Row */}
                                        <div className="flex items-center justify-between text-sm py-2 border-t border-b border-slate-50">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 uppercase font-bold">Vencimento</span>
                                                <span className={`font-medium ${isWarning ? 'text-yellow-600' : 'text-slate-700'}`}>
                                                    {club.nextBillingDate ? format(new Date(club.nextBillingDate), 'dd/MM/yyyy') : 'Vitalício'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-[10px] text-slate-400 uppercase font-bold">Membros</span>
                                                <span className="font-medium text-slate-700">{club.activeMembers || 0} / {club.memberLimit || '∞'}</span>
                                            </div>
                                        </div>

                                        {/* Actions Row (Big Buttons) */}
                                        <div className="grid grid-cols-4 gap-2 pt-1">
                                            <button onClick={() => openPaymentModal(club)} className="col-span-2 flex items-center justify-center gap-1 bg-green-50 text-green-700 border border-green-200 p-2 rounded-lg font-bold text-xs hover:bg-green-100">
                                                <DollarSign className="w-4 h-4" /> Cobrar
                                            </button>
                                            <button onClick={() => setEditingSubscription(club)} className="col-span-2 flex items-center justify-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 p-2 rounded-lg font-bold text-xs hover:bg-blue-100">
                                                <Settings className="w-4 h-4" /> Assinatura
                                            </button>
                                            <button onClick={() => setEditingClubData(club)} className="col-span-2 flex items-center justify-center gap-1 bg-slate-50 text-slate-600 border border-slate-200 p-2 rounded-lg font-bold text-xs hover:bg-slate-100">
                                                <Pencil className="w-4 h-4" /> Editar
                                            </button>
                                            <button onClick={() => handleDeleteClub(club.id, club.name)} className="col-span-2 flex items-center justify-center gap-1 bg-red-50 text-red-600 border border-red-200 p-2 rounded-lg font-bold text-xs hover:bg-red-100">
                                                <Trash2 className="w-4 h-4" /> Excluir
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            ) : (
                /* TREE VIEW (Existing Logic) */
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                    {/* Reuse exact same tree rendering logic... */}
                    {Object.entries(tree as TreeData).map(([union, missions]) => (
                        <div key={union} className="border-l-2 border-blue-200 pl-4 group/union">
                            <div className="flex items-center justify-between hover:bg-slate-50 p-2 rounded">
                                <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggle(union)}>
                                    {expanded[union] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                    <Globe className="w-5 h-5 text-blue-600" />
                                    <span className="font-bold text-lg text-slate-800">{union}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover/union:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingNode({ level: 'union', oldName: union, newName: union })} className="p-1 text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteNode('union', union)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>

                            {expanded[union] && (
                                <div className="mt-2 ml-4 space-y-2">
                                    {Object.entries(missions).map(([mission, regions]) => (
                                        <div key={mission} className="border-l-2 border-green-200 pl-4 group/mission">
                                            <div className="flex items-center justify-between hover:bg-slate-50 p-2 rounded">
                                                <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggle(`${union}-${mission}`)}>
                                                    {expanded[`${union}-${mission}`] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                    <MapPin className="w-5 h-5 text-green-600" />
                                                    <span className="font-semibold text-slate-700">{mission}</span>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover/mission:opacity-100 transition-opacity">
                                                    <button onClick={() => setEditingNode({ level: 'mission', oldName: mission, newName: mission })} className="p-1 text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDeleteNode('mission', mission)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>

                                            {expanded[`${union}-${mission}`] && (
                                                <div className="mt-2 ml-4 space-y-2">
                                                    {Object.entries(regions).map(([region, clubs]) => (
                                                        <div key={region} className="border-l-2 border-orange-200 pl-4 group/region">
                                                            <div className="flex items-center justify-between hover:bg-slate-50 p-2 rounded">
                                                                <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggle(`${union}-${mission}-${region}`)}>
                                                                    {expanded[`${union}-${mission}-${region}`] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                                    <div className="w-4 h-4 rounded-full border-2 border-orange-400"></div>
                                                                    <span className="font-medium text-slate-600">{region}</span>
                                                                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">{clubs.length} clubes</span>
                                                                </div>
                                                                <div className="flex gap-1 opacity-0 group-hover/region:opacity-100 transition-opacity">
                                                                    <button onClick={() => setEditingNode({ level: 'region', oldName: region, newName: region })} className="p-1 text-slate-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                                                    <button onClick={() => handleDeleteNode('region', region)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                                                </div>
                                                            </div>
                                                            {expanded[`${union}-${mission}-${region}`] && (
                                                                <div className="mt-2 ml-8 grid gap-2">
                                                                    {clubs.map(club => (
                                                                        <div key={club.id} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded border border-slate-100 group">
                                                                            <div className="flex items-center gap-2">
                                                                                <Building2 className="w-4 h-4 text-slate-400" />
                                                                                <span className="text-sm text-slate-700">{club.name}</span>
                                                                            </div>
                                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button onClick={() => setEditingSubscription(club as any)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="Assinatura"><Settings className="w-4 h-4" /></button>
                                                                                <button onClick={() => setEditingClubData(club as any)} className="p-1 text-slate-400 hover:text-amber-600 transition-colors" title="Trocar Diretor"><UserCog className="w-4 h-4" /></button>
                                                                                <button onClick={() => setEditingClubData(club as any)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="Editar Clube"><Pencil className="w-4 h-4" /></button>
                                                                                <button onClick={() => handleDeleteClub(club.id, club.name)} className="p-1 text-slate-400 hover:text-red-600 transition-colors" title="Excluir Clube"><Trash2 className="w-4 h-4" /></button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {Object.keys(tree).length === 0 && <p className="text-slate-500 italic">Nenhum clube encontrado.</p>}
                </div>
            )}

            {/* MODALS RZUSE */}
            {isCreateOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5" /> Novo Clube</h3>
                        <div className="space-y-4">
                            <input value={newClub.union} onChange={e => setNewClub({ ...newClub, union: e.target.value })} placeholder="União" className="w-full px-3 py-2 border rounded" />
                            <input value={newClub.association} onChange={e => setNewClub({ ...newClub, association: e.target.value })} placeholder="Associação (Geral)" className="w-full px-3 py-2 border rounded" />
                            <input value={newClub.mission} onChange={e => setNewClub({ ...newClub, mission: e.target.value })} placeholder="Missão/Assoc. Local" className="w-full px-3 py-2 border rounded" />
                            <input value={newClub.region} onChange={e => setNewClub({ ...newClub, region: e.target.value })} placeholder="Região" className="w-full px-3 py-2 border rounded" />
                            <input value={newClub.district} onChange={e => setNewClub({ ...newClub, district: e.target.value })} placeholder="Distrito" className="w-full px-3 py-2 border rounded" />
                            <input value={newClub.name} onChange={e => setNewClub({ ...newClub, name: e.target.value })} placeholder="Nome do Clube" className="w-full px-3 py-2 border rounded" />
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-slate-600">Cancelar</button>
                            <button onClick={handleCreateClub} disabled={createLoading} className="px-4 py-2 bg-blue-600 text-white rounded">{createLoading ? '...' : 'Criar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {editingNode && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Renomear</h3>
                        <input value={editingNode.newName} onChange={e => setEditingNode({ ...editingNode, newName: e.target.value })} className="w-full px-4 py-2 border rounded mb-4" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingNode(null)} className="px-4 py-2 text-slate-600">Cancelar</button>
                            <button onClick={handleRename} className="px-4 py-2 bg-blue-600 text-white rounded">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {editingSubscription && (
                <ClubSubscriptionModal
                    club={editingSubscription}
                    onClose={() => setEditingSubscription(null)}
                    onSave={() => {
                        setEditingSubscription(null);
                        refetchClubs();
                        toast.success('Assinatura atualizada.');
                    }}
                />
            )}

            {editingClubData && (
                <EditClubModal
                    club={editingClubData}
                    onClose={() => setEditingClubData(null)}
                    onSave={() => {
                        setEditingClubData(null);
                        refetchClubs();
                        refetchTree();
                    }}
                />
            )}
            {/* Payment Modal */}
            {paymentModalOpen && selectedClubForPayment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            Enviar Cobrança: {selectedClubForPayment.name}
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">Esta ação enviará uma notificação para os donos e diretores do clube.</p>

                        <textarea
                            value={paymentMessage}
                            onChange={e => setPaymentMessage(e.target.value)}
                            className="w-full h-32 p-3 border rounded-lg text-sm mb-4 bg-slate-50"
                        />

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setPaymentModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                            <button
                                onClick={handleSendPayment}
                                disabled={sendingPayment}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {sendingPayment ? 'Enviando...' : <><Send className="w-4 h-4" /> Enviar Cobrança</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Bulk Update Date Modal */}
            {bulkDateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4 text-blue-600">
                            <Calendar className="w-6 h-6" />
                            <h3 className="text-xl font-bold">Atualizar em Massa (v1.0.7)</h3>
                        </div>

                        <p className="text-sm text-slate-500 mb-6">
                            Você está atualizando a data de vencimento de <strong>{selectedClubIds.size} clubes</strong> selecionados.
                        </p>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Nova Data de Vencimento</label>
                                <input
                                    type="date"
                                    value={bulkNewDate}
                                    onChange={e => setBulkNewDate(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Dias de Carência (Após o vencimento)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={bulkGracePeriod}
                                    onChange={e => setBulkGracePeriod(Number(e.target.value))}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-slate-700"
                                    placeholder="Ex: 5"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">O clube continuará ativo por este número de dias após o vencimento.</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={handleBulkUpdateDate}
                                disabled={bulkUpdating || !bulkNewDate}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {bulkUpdating ? 'Atualizando...' : <><Check className="w-5 h-5" /> Confirmar Alteração</>}
                            </button>
                            <button
                                onClick={() => setBulkDateModalOpen(false)}
                                className="w-full py-3 text-slate-500 font-medium hover:bg-slate-100 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
