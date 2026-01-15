import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
    Menu,
    AlertTriangle,
    RefreshCw,
    DollarSign,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_TRANSLATIONS } from '../pages/members/types';
import { NotificationBell } from '../components/NotificationBell';
import { HelpButton } from '../components/HelpButton';
import { ReferralBanner } from '../components/ReferralBanner';

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';

export function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Pull to Refresh Logic
    // Pull to Refresh Logic Removed
    const mainRef = useRef<HTMLDivElement>(null);

    const { user } = useAuth();

    // Fetch Club Settings for Permissions (Still needed for Overdue check?)
    const { data: clubData, isLoading: isClubLoading } = useQuery({
        queryKey: ['club-settings-layout', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return null;
            const res = await api.get(`/clubs/${user.clubId}`);
            return res.data;
        },
        enabled: !!user?.clubId,
        staleTime: 1000 * 60 * 5 // Cache for 5 mins
    });

    // Check Subscription Status
    const { isOverdue: isClubOverdue, isWarning: isClubWarning } = ((): { isOverdue: boolean, isWarning: boolean } => {
        if (!clubData) return { isOverdue: false, isWarning: false };

        const status = clubData.subscriptionStatus;
        if (status === 'OVERDUE' || status === 'CANCELED') return { isOverdue: true, isWarning: false };

        if (clubData.nextBillingDate) {
            const today = new Date();
            const billingDate = new Date(clubData.nextBillingDate);
            const gracePeriod = (clubData.gracePeriodDays && !isNaN(Number(clubData.gracePeriodDays))) ? Number(clubData.gracePeriodDays) : 0;

            const cutoffDate = new Date(billingDate);
            cutoffDate.setDate(cutoffDate.getDate() + gracePeriod);

            if (today > cutoffDate) return { isOverdue: true, isWarning: false };
            if (today > billingDate) return { isOverdue: false, isWarning: true };
        }

        return { isOverdue: false, isWarning: false };
    })();

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const isLeader = ['MASTER', 'OWNER', 'ADMIN', 'DIRECTOR'].includes(user?.role || '');
        if (!isClubLoading && isClubOverdue && isLeader && location.pathname !== '/dashboard/subscription' && !location.pathname.includes('/change-password')) {
            navigate('/dashboard/subscription', { replace: true });
        }
    }, [isClubOverdue, isClubLoading, location.pathname, navigate, user?.role]);

    if (isClubLoading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Block Outlet if overdue and not on allowed page
    const isAllowedPage = location.pathname === '/dashboard/subscription' || location.pathname.includes('/change-password');
    const shouldBlockContent = isClubOverdue && !isAllowedPage;

    return (
        <div className="min-h-screen bg-slate-100 flex relative">
            <Sidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />

            <div
                className="flex-1 flex flex-col min-h-screen transition-all duration-200 ease-out lg:pl-24"
            >
                {/* Subscription Banners */}
                {(isClubOverdue || isClubWarning) && (
                    <div className={`${isClubOverdue ? 'bg-red-600' : 'bg-amber-500'} text-white px-4 py-3 text-center font-bold flex flex-col md:flex-row items-center justify-center gap-2 z-50 shadow-lg`}>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 font-bold" />
                            <span>
                                {isClubOverdue
                                    ? 'Atenção: A assinatura do clube está VENCIDA. O acesso dos membros está suspenso.'
                                    : 'Atenção: A assinatura do clube venceu e está no período de carência. Regularize para evitar suspensão.'}
                            </span>
                        </div>
                        {['OWNER', 'ADMIN', 'DIRECTOR'].includes(user?.role || '') && (
                            <Link
                                to="/dashboard/subscription"
                                className="bg-white text-slate-900 px-4 py-1 rounded-full text-xs hover:bg-slate-100 transition-colors uppercase tracking-tight font-black flex items-center gap-2"
                            >
                                <DollarSign className="w-3.5 h-3.5" />
                                Resolver Agora
                            </Link>
                        )}
                    </div>
                )}

                {/* Top Header */}
                <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden text-slate-500 hover:text-slate-700"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-4 ml-auto">
                        <button
                            onClick={() => window.location.reload()}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Atualizar Página"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <NotificationBell />

                        <Link to="/dashboard/profile" className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs ring-2 ring-white shadow-sm">
                                {user?.name?.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'DBV'}
                            </div>
                            <div className="hidden sm:block text-left">
                                <p className="text-sm font-semibold text-slate-700 leading-none">{user?.name || 'Usuário'}</p>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5 capitalize">{ROLE_TRANSLATIONS[user?.role || '']?.toLowerCase() || (user?.role ? user.role.toLowerCase() : 'membro')}</p>
                            </div>
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <main ref={mainRef} className="flex-1 overflow-auto p-6 bg-slate-50 relative z-10">
                    {shouldBlockContent ? (
                        <div className="flex flex-col items-center justify-center h-[70vh] text-slate-500 text-center px-4">
                            <div className="bg-white p-8 rounded-2xl border border-red-100 flex flex-col items-center max-w-md shadow-lg">
                                <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Suspenso</h2>
                                <p className="text-slate-600 mb-8">
                                    O acesso a este clube está temporariamente suspenso devido à assinatura vencida ou pendência financeira.
                                </p>

                                {['MASTER', 'OWNER', 'ADMIN', 'DIRECTOR'].includes(user?.role || '') ? (
                                    <Link
                                        to="/dashboard/subscription"
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
                                    >
                                        <DollarSign className="w-5 h-5" />
                                        Regularizar Agora
                                    </Link>
                                ) : (
                                    <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-sm text-red-700 font-medium">
                                        Por favor, entre em contato com o diretor do seu clube para regularizar o acesso.
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <ReferralBanner />
                            <Outlet />
                        </>
                    )}
                </main>
            </div>
            <HelpButton />
        </div>
    );
}
