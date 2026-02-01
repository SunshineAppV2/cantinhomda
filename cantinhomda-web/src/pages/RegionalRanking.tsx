
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Star, TrendingUp, Users, MapPin, Calendar } from 'lucide-react';
import { api } from '../lib/axios';

interface RankingClub {
    id: string;
    name: string;
    logoUrl?: string;
    points: number;
    percentage: number;
    stars: number;
    memberCount: number;
}

import { useAuth } from '../contexts/AuthContext';

export const RegionalRanking: React.FC = () => {
    const { user } = useAuth();
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    // Actually simplicity: 'YEAR' | 'QUARTER' | 'MONTH'
    const [filterType, setFilterType] = useState<'YEAR' | 'QUARTER' | 'MONTH'>('YEAR');
    const [referenceDate, setReferenceDate] = useState<Date>(new Date());

    // Fetch Events for Filter
    const { data: events = [] } = useQuery({
        queryKey: ['regional-events-filter'],
        queryFn: async () => {
            const res = await api.get('/regional-events');
            return res.data;
        }
    });

    const { data: clubs, isLoading } = useQuery<RankingClub[]>({
        queryKey: ['regional-ranking', user?.region, user?.district, user?.association, selectedEventId, filterType, referenceDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (user?.role === 'COORDINATOR_REGIONAL' && user?.region) params.append('region', user.region);
            if (user?.role === 'COORDINATOR_DISTRICT' && user?.district) params.append('district', user.district);
            if (user?.role === 'COORDINATOR_AREA' && user?.association) params.append('association', user.association);

            if (selectedEventId) {
                params.append('eventId', selectedEventId);
            } else {
                // Only append period filters if no specific event is selected (General Ranking)
                params.append('period', filterType);
                params.append('date', referenceDate.toISOString());
            }

            const res = await api.get(`/ranking-regional?${params.toString()}`);
            return res.data;
        },
        enabled: !!user
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Trophy className="text-amber-500 w-8 h-8" />
                        Ranking Regional
                    </h1>
                    {['COORDINATOR_REGIONAL', 'COORDINATOR_DISTRICT'].includes(user?.role || '') && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            <div className="flex bg-slate-100 rounded-lg p-1">
                                {['YEAR', 'QUARTER', 'MONTH'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => { setFilterType(type as any); setSelectedEventId(''); }}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterType === type && !selectedEventId
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        {type === 'YEAR' ? 'ANUAL' : type === 'QUARTER' ? 'TRIMESTRE' : 'MÊS'}
                                    </button>
                                ))}
                            </div>

                            {!selectedEventId && filterType !== 'YEAR' && (
                                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 px-2">
                                    <button
                                        onClick={() => {
                                            const newDate = new Date(referenceDate);
                                            if (filterType === 'MONTH') newDate.setMonth(newDate.getMonth() - 1);
                                            if (filterType === 'QUARTER') newDate.setMonth(newDate.getMonth() - 3);
                                            setReferenceDate(newDate);
                                        }}
                                        className="p-1 hover:bg-white rounded-full text-slate-500"
                                    >
                                        &lt;
                                    </button>
                                    <span className="text-xs font-semibold text-slate-700 min-w-[80px] text-center">
                                        {filterType === 'MONTH'
                                            ? referenceDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()
                                            : `${Math.floor(referenceDate.getMonth() / 3) + 1}º TRIMESTRE/${referenceDate.getFullYear()}`
                                        }
                                    </span>
                                    <button
                                        onClick={() => {
                                            const newDate = new Date(referenceDate);
                                            if (filterType === 'MONTH') newDate.setMonth(newDate.getMonth() + 1);
                                            if (filterType === 'QUARTER') newDate.setMonth(newDate.getMonth() + 3);
                                            setReferenceDate(newDate);
                                        }}
                                        className="p-1 hover:bg-white rounded-full text-slate-500"
                                    >
                                        &gt;
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <Calendar className="text-slate-400 w-5 h-5" />
                    <select
                        value={selectedEventId}
                        onChange={(e) => {
                            setSelectedEventId(e.target.value);
                            // If clearing event, revert to filter view
                        }}
                        className="bg-transparent border-none outline-none text-slate-700 font-medium min-w-[200px]"
                    >
                        <option value="">Ranking Geral</option>
                        {events.map((evt: any) => (
                            <option key={evt.id} value={evt.id}>{evt.title}</option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Top 3 Summary Cards would go here if needed */}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        Classificação Geral
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Posição</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Clube</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Participação</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estrelas</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Pontos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {clubs?.map((club, index) => (
                                <tr key={club.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${index === 0 ? 'bg-amber-100 text-amber-600' :
                                            index === 1 ? 'bg-slate-200 text-slate-600' :
                                                index === 2 ? 'bg-orange-100 text-orange-600' :
                                                    'bg-slate-50 text-slate-400'
                                            }`}>
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {club.logoUrl ? (
                                                <img src={club.logoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                                                    <MapPin className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-semibold text-slate-800">{club.name}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {club.memberCount} membros
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full w-24 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${club.percentage >= 90 ? 'bg-green-500' :
                                                        club.percentage >= 50 ? 'bg-indigo-500' :
                                                            'bg-red-400'
                                                        }`}
                                                    style={{ width: `${club.percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium text-slate-600">{club.percentage}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`w-5 h-5 ${i < club.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-50'}`}
                                                />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-mono font-bold text-slate-900">{club.points.toLocaleString()}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
