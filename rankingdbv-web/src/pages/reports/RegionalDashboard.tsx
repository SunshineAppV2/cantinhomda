import { useState, useEffect } from 'react';
import { api } from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Tent, UserCheck, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { toast } from 'sonner';

// Mock hierarchies for filter (simplified)
const HIERARCHY_DATA: any = {
    'União Central Brasileira (UCB)': ['Paulista Central', 'Paulista Do Vale', 'Paulista Leste', 'Paulista Oeste', 'Paulista Sudeste', 'Paulista Sudoeste', 'Paulista Sul', 'Paulistana'],
    'União Centro Oeste Brasileira (UCOB)': ['Brasil Central', 'Leste Mato-Grossense', 'Oeste Mato-Grossense', 'Planalto Central', 'Sul Mato-Grossense', 'Tocantins'],
    // ... Add more if needed or fetch dynamically
    'União Leste Brasileira (ULB)': ['Bahia', 'Bahia Central', 'Bahia Norte', 'Bahia Sul', 'Bahia Extremo Sul', 'Bahia Sudoeste', 'Sergipe'],
    'União Nordeste Brasileira (UNEB)': ['Cearense', 'Pernambucana', 'Pernambucana Central', 'Alagoas', 'Piauiense', 'Rio Grande do Norte-Paraíba'],
};

export function RegionalDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    if (loading) console.log("loading");

    // Filters
    const [period, setPeriod] = useState('ALL'); // ALL, MONTH, QUARTER
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [selectedAssociation, setSelectedAssociation] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('');

    const canSelectAssociation = ['MASTER', 'UNION'].includes(user?.role || '');

    useEffect(() => {
        // Pre-fill filter if user is Regional Coordinator
        if (user?.role === 'COORDINATOR_REGIONAL') {
            // Ideally user profile has these fields.
            // For now assume user might select or we auto-fetch based on profile.
            // Assuming User has 'association' and 'region' fields.
            // setSelectedRegion(user.region);
        }
    }, [user]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (selectedAssociation) params.association = selectedAssociation;
            if (selectedRegion) params.region = selectedRegion;

            if (period === 'MONTH') {
                const now = new Date();
                params.startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                params.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
            } else if (period === 'QUARTER') {
                const now = new Date();
                const q = Math.floor(now.getMonth() / 3);
                params.startDate = new Date(now.getFullYear(), q * 3, 1).toISOString();
                params.endDate = new Date(now.getFullYear(), (q + 1) * 3, 0).toISOString();
            } else if (period === 'CUSTOM' && customStart && customEnd) {
                params.startDate = new Date(customStart).toISOString();
                params.endDate = new Date(customEnd).toISOString();
            }

            const res = await api.get('/reports/regional-stats', { params });
            setStats(res.data);
        } catch (error) {
            toast.error('Erro ao carregar dados do painel.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [period, customStart, customEnd, selectedAssociation, selectedRegion]); // Auto refresh on filter change

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    const genderData = stats ? [
        { name: 'Masculino', value: stats.genderDistribution.male },
        { name: 'Feminino', value: stats.genderDistribution.female },
    ] : [];

    // Assuming we might want a chart for Pathfinder vs Staff
    const typeData = stats ? [
        { name: 'Desbravadores (10-15)', value: stats.pathfindersCount },
        { name: 'Diretoria (16+)', value: stats.staffCount },
    ] : [];


    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-8 h-8 text-indigo-600" />
                Painel Regional
            </h1>

            {/* FILTERS */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* Association Filter */}
                <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1 block">Associação</label>
                    {canSelectAssociation ? (
                        <select
                            value={selectedAssociation}
                            onChange={e => {
                                setSelectedAssociation(e.target.value);
                                setSelectedRegion(''); // Reset region
                            }}
                            className="w-full p-2 border rounded-lg outline-none"
                        >
                            <option value="">Todas</option>
                            {/* Simplify: extract unique assocs from hierarchy keys or flattened values if we had a list.
                                 For now, using keys of hierarchy map as Unions, and inner arrays as Assocs?
                                 Ah, HIERARCHY_DATA key is Union, value is Association/Mission List.
                                 So we need to flatter it or just pick one union for demo?
                                 Let's flatten all missions.
                             */}
                            {Object.values(HIERARCHY_DATA).flat().map((assoc: any) => (
                                <option key={assoc} value={assoc}>{assoc}</option>
                            ))}
                        </select>
                    ) : (
                        <input type="text" value={user?.association || 'Minha Associação'} disabled className="w-full p-2 border rounded-lg bg-slate-50" />
                    )}
                </div>

                <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1 block">Região</label>
                    <input
                        type="text"
                        placeholder="Ex: R1"
                        value={selectedRegion}
                        onChange={e => setSelectedRegion(e.target.value)}
                        className="w-full p-2 border rounded-lg outline-none"
                    />
                </div>

                <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1 block">Período</label>
                    <select
                        value={period}
                        onChange={e => setPeriod(e.target.value)}
                        className="w-full p-2 border rounded-lg outline-none"
                    >
                        <option value="ALL">Todo o Período</option>
                        <option value="MONTH">Este Mês</option>
                        <option value="QUARTER">Neste Trimestre</option>
                        <option value="CUSTOM">Personalizado</option>
                    </select>
                </div>

                {period === 'CUSTOM' && (
                    <div className="flex gap-2">
                        <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full p-2 border rounded-lg" />
                        <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full p-2 border rounded-lg" />
                    </div>
                )}
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard title="Total de Membros" value={stats?.totalMembers || 0} icon={<Users className="w-6 h-6 text-blue-600" />} color="bg-blue-50 text-blue-900" />
                <KPICard title="Unidades Ativas" value={stats?.totalUnits || 0} icon={<Tent className="w-6 h-6 text-green-600" />} color="bg-green-50 text-green-900" />
                <KPICard title="Desbravadores (10-15)" value={stats?.pathfindersCount || 0} icon={<UserCheck className="w-6 h-6 text-orange-600" />} color="bg-orange-50 text-orange-900" />
                <KPICard title="Diretoria (16+)" value={stats?.staffCount || 0} icon={<UserCheck className="w-6 h-6 text-purple-600" />} color="bg-purple-50 text-purple-900" />
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gender Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-700 mb-4">Gênero</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={genderData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {genderData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Requirements (Mocked for now as we only have total count in backend currently) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-700 mb-4">Membros por Categoria</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={typeData}>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#8884d8">
                                    {typeData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#ffc658' : '#8884d8'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-center">
                        <p className="text-sm text-slate-500">
                            Requisitos Completados (Período): <span className="font-bold text-slate-800">{stats?.requirementsCompleted || 0}</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, icon, color }: any) {
    return (
        <div className={`p-6 rounded-xl shadow-sm border border-slate-100 ${color} flex items-center justify-between`}>
            <div>
                <p className="text-sm opacity-80 font-medium mb-1">{title}</p>
                <p className="text-3xl font-bold">{value}</p>
            </div>
            <div className="bg-white/50 p-3 rounded-full">
                {icon}
            </div>
        </div>
    );
}
