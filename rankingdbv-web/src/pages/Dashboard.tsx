import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, Trophy, Calendar, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Skeleton } from '../components/Skeleton';
import { Modal } from '../components/Modal';
import { ProfileUpdateModal } from '../components/ProfileUpdateModal';
import { ReferralPopup } from '../components/ReferralPopup';

import { ROLE_TRANSLATIONS } from './members/types';

import { SubscriptionWidget } from '../components/SubscriptionWidget';
import { SignaturesWidget } from '../components/SignaturesWidget';

import { FamilyDashboard } from './FamilyDashboard';

// Firestore Imports
import { collection, query, where, getDocs, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Dashboard() {
    const { user, loading } = useAuth(); // Assuming 'loading' is available in AuthContext

    // 1. Loading State (Prevents Hook Mismatch during auth init)
    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
            </div>
        );
    }

    // 2. Safety Check (Should go to Login if not auth, but just in case)
    if (!user) return null;

    // 3. Routing based on Role
    // Parents get Family View
    if (user.role === 'PARENT') {
        return <FamilyDashboard />;
    }

    // Everyone else gets Director View
    return <DirectorDashboard />;
}

function DirectorDashboard() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [showBirthdaysModal, setShowBirthdaysModal] = useState(false);
    const [showProfileUpdate, setShowProfileUpdate] = useState(false);
    const [showReferralPopup, setShowReferralPopup] = useState(false);

    // 1. Stats Query from Firestore (Optimized)
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return null;
            const clubId = user.clubId;
            // console.log('[Dashboard] Fetching stats for club:', clubId); // Reduced logging

            try {
                // 1. Members and Birthdays
                // Still fetching all users for accurate counts/birthdays, but query is relatively light for <100 docs
                const usersQ = query(collection(db, 'users'), where('clubId', '==', clubId));
                const usersSnap = await getDocs(usersQ);
                const activeMembers = usersSnap.size;

                const currentMonth = new Date().getMonth();
                const birthdays = usersSnap.docs
                    .map(d => ({ id: d.id, ...d.data() } as any))
                    .filter(u => {
                        if (!u.birthDate) return false;
                        const bd = new Date(u.birthDate);
                        return bd.getMonth() === currentMonth;
                    })
                    .map(u => ({
                        id: u.id,
                        name: u.name,
                        role: u.role,
                        day: new Date(u.birthDate).getDate()
                    }))
                    .sort((a, b) => a.day - b.day);

                // 2. Next Event (Light Query: limit 1)
                let nextEvent: any = null;
                try {
                    const today = new Date().toISOString();
                    const eventsQ = query(
                        collection(db, 'meetings'),
                        where('clubId', '==', clubId),
                        where('date', '>=', today),
                        orderBy('date', 'asc'),
                        limit(1)
                    );
                    const eventsSnap = await getDocs(eventsQ);
                    nextEvent = eventsSnap.empty ? null : {
                        id: eventsSnap.docs[0].id,
                        ...eventsSnap.docs[0].data(),
                        startDate: eventsSnap.docs[0].data().date
                    };
                } catch (idxErr) {
                    console.warn('[Dashboard] Next Event Query Failed (Likely Missing Index):', idxErr);
                }

                // Removed: Attendance Stats (Heavy Query) - Optimization

                // 3. Financial
                let financial = { balance: 0 };
                try {
                    const clubSnap = await getDoc(doc(db, 'clubs', clubId));
                    financial = { balance: clubSnap.exists() ? ((clubSnap.data() as any).balance || 0) : 0 };
                } catch (finErr) {
                    console.warn('[Dashboard] Financial Stats Failed:', finErr);
                }

                return {
                    activeMembers,
                    birthdays,
                    nextEvent,
                    financial
                };
            } catch (error) {
                console.error('[Dashboard] CRITICAL ERROR loading stats:', error);
                // Return safe defaults to UNBLOCK UI
                return {
                    activeMembers: 0,
                    birthdays: [],
                    nextEvent: null,
                    financial: { balance: 0 }
                };
            }
        },
        enabled: !!user?.clubId,
        staleTime: 1000 * 60 * 5, // Cache for 5 mins to prevent aggressive refetching
        refetchOnWindowFocus: false // Further Reduce Load
    });

    // 2. Fetch API Club Status for Referral Code
    const { data: clubStatus } = useQuery({
        queryKey: ['club-status-api'],
        queryFn: async () => {
            const { api } = await import('../lib/axios');
            const res = await api.get('/clubs/status');
            return res.data;
        },
        enabled: ['OWNER', 'ADMIN', 'DIRECTOR'].includes(user?.role || ''),
        staleTime: 1000 * 60 * 30 // Cache for 30 mins
    });

    // 2b. Check Global System Config (Referral Toggle)
    const { data: systemConfig } = useQuery({
        queryKey: ['system-config'],
        queryFn: async () => {
            const snap = await getDoc(doc(db, 'system', 'config'));
            return snap.exists() ? snap.data() : { referralEnabled: false }; // Default false as per request
        },
        staleTime: 1000 * 60 * 5
    });

    // TEMPORARILY DISABLED - Profile update check
    // Check if profile needs updating (OWNER only)
    // useEffect(() => {
    //     if (user?.role === 'OWNER') {
    //         const needsUpdate = !(user as any).mobile || !clubStatus?.union || !clubStatus?.mission || !clubStatus?.region;
    //         if (needsUpdate) {
    //             setShowProfileUpdate(true);
    //         } else if (!localStorage.getItem('referralPopupDismissed')) {
    //             // Show referral popup after profile is complete
    //             setShowReferralPopup(true);
    //         }
    //     }
    // }, [user, clubStatus]);

    // 3. Early Loading Return
    if (statsLoading && user?.clubId) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-32 flex flex-col justify-between">
                            <Skeleton className="h-8 w-8 rounded-lg" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Copy Link Handler
    const handleCopyReferral = () => {
        if (clubStatus?.referralCode) {
            const link = `${window.location.origin}/register?ref=${clubStatus.referralCode}`;
            navigator.clipboard.writeText(link);
            import('sonner').then(({ toast }) => toast.success('Link de indicação copiado!'));
        }
    };

    return (

        <div className="space-y-6">

            {/* Subscription Status for Admins */}
            {['OWNER', 'ADMIN', 'DIRECTOR'].includes(user?.role || '') && <SubscriptionWidget />}

            {/* Referral Widget (Conditionally Rendered) */}
            {systemConfig?.referralEnabled && clubStatus?.referralCode && (
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Users className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold mb-1">Indique e Ganhe 20% OFF</h3>
                                <p className="text-indigo-100 text-sm max-w-md">
                                    Indique um diretor de outro clube e ganhe 20% de desconto na sua mensalidade!
                                    (Acumule até 3 descontos).
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="block text-2xl font-bold">{clubStatus.referralCredits?.length || 0}/3</span>
                                <span className="text-xs text-indigo-200">Descontos Acumulados</span>
                            </div>
                        </div>

                        <div className="flex gap-2 w-full mt-4">
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-sm font-mono flex-1 truncate border border-white/10 hidden md:block">
                                {`${window.location.origin}/register?ref=${clubStatus.referralCode}`}
                            </div>

                            <button
                                onClick={handleCopyReferral}
                                className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm"
                            >
                                <span>Copiar Link</span>
                            </button>

                            <button
                                onClick={() => {
                                    const link = `${window.location.origin}/register?ref=${clubStatus.referralCode}`;
                                    const msg = encodeURIComponent(`Olá! Quero te indicar o *Ranking DBV* para a gestão do seu Clube de Desbravadores.\n\nÉ um sistema completo que estou usando e recomendo. Crie sua conta pelo meu link:\n${link}`);
                                    window.open(`https://wa.me/?text=${msg}`, '_blank');
                                }}
                                className="bg-[#25D366] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#128C7E] transition-colors flex items-center gap-2 shadow-sm"
                            >
                                Enviar no WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Signatures Widget */}
            <SignaturesWidget />

            <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>

            {/* Widgets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Widget 1: Active Members */}
                <div
                    onClick={() => navigate('/dashboard/members')}
                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                >
                    <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                        <Users className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm">Membros Ativos</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats?.activeMembers || 0}</h3>
                    </div>
                </div>

                {/* Widget 2: Financial Balance */}
                {['OWNER', 'ADMIN', 'DIRECTOR', 'TREASURER'].includes(user?.role || '') && (
                    <div
                        onClick={() => navigate('/dashboard/financial')}
                        className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                    >
                        <div className={`p-3 rounded-lg ${(stats?.financial?.balance || 0) >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            <DollarSign className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm">Saldo do Mês</p>
                            <h3 className={`text-2xl font-bold ${(stats?.financial?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                R$ {stats?.financial?.balance?.toFixed(0) || '0'}
                            </h3>
                        </div>
                    </div>
                )}

                {/* Widget 3: Next Event */}
                <div
                    onClick={() => navigate('/dashboard/events')}
                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                >
                    <div className="bg-purple-100 p-3 rounded-lg text-purple-600">
                        <Calendar className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm">Próximo Evento</p>
                        <h3 className="text-lg font-bold text-slate-800 truncate max-w-[150px]" title={stats?.nextEvent?.title || 'Nenhum'}>
                            {stats?.nextEvent?.title || 'Nenhum'}
                        </h3>
                        {stats?.nextEvent && (
                            <p className="text-xs text-slate-500">
                                {new Date(stats?.nextEvent?.startDate).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>

                {/* Widget 4: Birthdays Count */}
                <div
                    onClick={() => setShowBirthdaysModal(true)}
                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                >
                    <div className="bg-pink-100 p-3 rounded-lg text-pink-600">
                        <Trophy className="w-8 h-8" /> {/* Using Trophy as placeholder icon for birthdays if Cake not available */}
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm">Aniversariantes</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats?.birthdays?.length || 0}</h3>
                        <p className="text-xs text-slate-500">Neste Mês</p>
                    </div>
                </div>
            </div>

            {/* REMOVED: Charts and Side List for Performance Simplification */}

            {/* Birthdays Modal */}
            <Modal
                isOpen={showBirthdaysModal}
                onClose={() => setShowBirthdaysModal(false)}
                title="🎈 Aniversariantes do Mês"
            >
                {stats?.birthdays?.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">Ninguém faz aniversário este mês.</p>
                ) : (
                    <ul className="space-y-4">
                        {stats?.birthdays?.map((b: any) => (
                            <li key={b.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/members?search=${b.name}`)}>
                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                    {b.day}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">{b.name}</p>
                                    <p className="text-sm text-slate-500 capitalize">{ROLE_TRANSLATIONS[b.role] || b.role}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Modal>

            {/* Profile Update Modal (Blocking for incomplete OWNER profiles) */}
            {showProfileUpdate && user?.role === 'OWNER' && (
                <ProfileUpdateModal
                    user={user}
                    club={clubStatus}
                    onUpdate={async () => {
                        await refreshUser();
                        setShowProfileUpdate(false);
                        // Show referral popup after profile update
                        if (!localStorage.getItem('referralPopupDismissed')) {
                            setShowReferralPopup(true);
                        }
                    }}
                />
            )}

            {/* Referral Popup (After login for OWNER) */}
            {showReferralPopup && clubStatus?.referralCode && (
                <ReferralPopup
                    referralCode={clubStatus.referralCode}
                    clubName={clubStatus.name || 'seu clube'}
                    onClose={() => setShowReferralPopup(false)}
                />
            )}
        </div >

    );
}
