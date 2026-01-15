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

    // Filters
    const [period, setPeriod] = useState('ALL');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [selectedAssociation, setSelectedAssociation] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState(''); // Added District support
    const [selectedClub, setSelectedClub] = useState(''); // Added Club support
    const [clubs, setClubs] = useState<any[]>([]); // List of clubs for dropdown

    const canSelectAssociation = ['MASTER', 'UNION'].includes(user?.role || '');
    const canSelectRegion = ['MASTER', 'UNION', 'COORDINATOR_AREA'].includes(user?.role || '');
    // District/Club selection logic driven by hierarchy

    useEffect(() => {
        if (!user) return;

        // Auto-fill and Lock filters based on Role
        if (user.role === 'COORDINATOR_REGIONAL') {
            setSelectedAssociation(user.association || '');
            setSelectedRegion(user.region || '');
        } else if (user.role === 'COORDINATOR_DISTRICT') {
            setSelectedAssociation(user.association || '');
            setSelectedRegion(user.region || '');
            setSelectedDistrict(user.district || '');
        } else if (user.role === 'COORDINATOR_AREA') {
            setSelectedAssociation(user.association || '');
        }
    }, [user]);

    // Fetch Clubs based on filters
    useEffect(() => {
        const fetchClubs = async () => {
            // Only fetch if we have at least association/region scope or if Global
            let params: any = {};
            if (selectedAssociation) params.association = selectedAssociation;
            if (selectedRegion) params.region = selectedRegion;
            if (selectedDistrict) params.district = selectedDistrict;

            if (Object.keys(params).length === 0 && user?.role !== 'MASTER') return;

            try {
                // Assuming we have an endpoint for this. Using a generic 'list' endpoint or reusing one.
                // If not, we might need to add one. For now trying '/clubs' with filters if endpoints support.
                // Checking previous code: Backend `ClubsController` `findAll` supports query? 
                // Creating a specific 'combo' endpoint for now or assuming `/clubs` works with filters.
                // Let's rely on standard `/clubs` if it accepts query params.
                const res = await api.get('/clubs', { params });
                setClubs(res.data);
            } catch (err) {
                console.log("Error fetching clubs for filter", err);
            }
        };

        fetchClubs();
    }, [selectedAssociation, selectedRegion, selectedDistrict]);

    const fetchStats = async () => {
        try {
            const params: any = {};
            if (selectedAssociation) params.association = selectedAssociation;
            if (selectedRegion) params.region = selectedRegion;
            if (selectedDistrict) params.district = selectedDistrict;
            if (selectedClub) params.clubId = selectedClub;

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
        }
    };

    useEffect(() => {
        fetchStats();
    }, [period, customStart, customEnd, selectedAssociation, selectedRegion, selectedDistrict, selectedClub]);

    const genderData = stats ? [
        { name: 'Masculino', value: stats.genderDistribution.male },
        { name: 'Feminino', value: stats.genderDistribution.female },
    ] : [];

    const unitTypeData = stats?.unitStats ? [
        { name: 'Masc.', value: stats.unitStats.masculine || 0 },
        { name: 'Fem.', value: stats.unitStats.feminine || 0 },
        { name: 'Mista', value: stats.unitStats.mixed || 0 },
    ] : [];

    // Assuming we might want a chart for Pathfinder vs Staff
    const typeData = stats ? [
        { name: 'Desbravadores (10-15)', value: stats.pathfindersCount },
        { name: 'Diretoria (16+)', value: stats.staffCount },
    ] : [];


    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-8 h-8 text-indigo-600" />
                Painel Regional
            </h1>

            {/* FILTERS */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                {/* Association Filter */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Associação</label>
                    {canSelectAssociation ? (
                        <select
                            value={selectedAssociation}
                            onChange={e => {
                                setSelectedAssociation(e.target.value);
                                setSelectedRegion('');
                                setSelectedDistrict('');
                                setSelectedClub('');
                            }}
                            className="w-full p-2 border border-slate-300 rounded-lg outline-none text-sm focus:border-indigo-500"
                        >
                            <option value="">Todas</option>
                            {/* Simplified Hierarchy Usage */}
                            {Object.values(HIERARCHY_DATA).flat().map((assoc: any) => (
                                <option key={assoc} value={assoc}>{assoc}</option>
                            ))}
                        </select>
                    ) : (
                        <input type="text" value={user?.association || 'Minha Associação'} disabled className="w-full p-2 border rounded-lg bg-slate-50 text-sm" />
                    )}
                </div>

                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Região</label>
                    <input
                        type="text"
                        placeholder="Todas / Filtrar"
                        value={selectedRegion}
                        onChange={e => setSelectedRegion(e.target.value)}
                        disabled={!canSelectRegion}
                        className={`w-full p-2 border border-slate-300 rounded-lg outline-none text-sm ${!canSelectRegion ? 'bg-slate-50 text-slate-500' : ''}`}
                    />
                </div>

                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Clube</label>
                    <select
                        value={selectedClub}
                        onChange={e => setSelectedClub(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg outline-none text-sm focus:border-indigo-500"
                    >
                        <option value="">Todos da Região</option>
                        {clubs.map((club: any) => (
                            <option key={club.id} value={club.id}>{club.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Período</label>
                    <select
                        value={period}
                        onChange={e => setPeriod(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg outline-none text-sm focus:border-indigo-500"
                    >
                        <option value="ALL">Todo o Período</option>
                        <option value="MONTH">Este Mês</option>
                        <option value="QUARTER">Neste Trimestre</option>
                        <option value="CUSTOM">Personalizado</option>
                    </select>
                </div>

                {period === 'CUSTOM' ? (
                    <div className="flex gap-1">
                        <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full p-2 border text-xs rounded-lg" />
                        <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full p-2 border text-xs rounded-lg" />
                    </div>
                ) : <div></div>}
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard title="Total de Membros" value={stats?.totalMembers || 0} icon={<Users className="w-6 h-6 text-blue-600" />} color="bg-blue-50 text-blue-900" />
                <KPICard title="Unidades Ativas" value={stats?.totalUnits || 0} icon={<Tent className="w-6 h-6 text-green-600" />} color="bg-green-50 text-green-900" />
                <KPICard title="Desbravadores" value={stats?.pathfindersCount || 0} icon={<UserCheck className="w-6 h-6 text-orange-600" />} color="bg-orange-50 text-orange-900" />
                <KPICard title="Diretoria" value={stats?.staffCount || 0} icon={<UserCheck className="w-6 h-6 text-purple-600" />} color="bg-purple-50 text-purple-900" />
                <KPICard title="Requisitos" value={stats?.requirementsCompleted || 0} icon={<Calendar className="w-6 h-6 text-emerald-600" />} color="bg-emerald-50 text-emerald-900" />
            </div>

            {/* UNIT BREAKDOWN (Separation "A CIMA") */}
            {/* We place this prominently */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Tent className="w-5 h-5 text-slate-500" />
                        Unidades por Gênero
                    </h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={unitTypeData} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={50} />
                                <Tooltip />
                                <Bar dataKey="value" name="Unidades" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20}>
                                    {unitTypeData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : index === 1 ? '#ec4899' : '#8b5cf6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-2 px-2">
                        <span>Masc: <b>{stats?.unitStats?.masculine || 0}</b></span>
                        <span>Fem: <b>{stats?.unitStats?.feminine || 0}</b></span>
                        <span>Mista: <b>{stats?.unitStats?.mixed || 0}</b></span>
                    </div>
                </div>

                {/* Gender Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-700 mb-4">Gênero dos Membros</h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={genderData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {genderData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#ec4899'} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 text-xs">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Masc</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-pink-500"></div> Fem</div>
                    </div>
                </div>

                {/* Requirements Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-700 mb-4">Categoria (Idade/Cargo)</h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={typeData}>
                                <XAxis dataKey="name" hide />
                                <Tooltip />
                                <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                                    {typeData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#8b5cf6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 text-xs mt-2">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> DBVs</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Diretoria</div>
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
