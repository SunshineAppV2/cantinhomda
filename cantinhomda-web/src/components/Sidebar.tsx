import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    UserCircle,
    Users,
    Calendar,
    Award,
    DollarSign,
    ShoppingBag,
    Settings,
    Shield,
    FileText,
    LogOut,
    ListChecks,
    Building2,
    AlertTriangle,
    Globe,
    BarChart,
    BookOpen,
    CreditCard,
    ChevronRight,
    UserPlus,
    UserCog,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/axios';
import { useQuery } from '@tanstack/react-query';

// --- Types ---
type MenuItem = {
    id: string;
    label: string;
    icon: React.ElementType;
    path?: string;
    subItems?: MenuItem[];
    badge?: number; // For alerts/counts
};



export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean, setMobileOpen: (o: boolean) => void }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const getActiveIdFromPath = (path: string) => {
        if (path === '/dashboard') return 'dashboard';
        if (path.includes('/profile') || path.includes('/family') || path.includes('/requirements') || path.includes('/activities')) return 'access';
        if (path.includes('/members') || path.includes('/classes') || path.includes('/events') || path.includes('/meetings') || path.includes('/secretary') || path.includes('/approvals') || path.includes('/assignments')) return 'management';
        if (path.includes('/financial') || path.includes('/treasury') || path.includes('/master-treasury')) return 'financial';
        if (path.includes('/reports') || path.includes('/ranking') || path.includes('/signatures')) return 'reports';
        if (path.includes('/regional-ranking') || path.includes('/coordinator-approvals') || path.includes('/hierarchy') || path.includes('/clubs-directory')) return 'coordinator';
        if (path.includes('/store')) return 'store';
        if (path.includes('/settings') || path.includes('/admin')) return 'config';
        return null;
    };

    // Permissions Query (reused logic)
    const { data: clubData, isLoading: clubLoading } = useQuery({
        queryKey: ['club-settings-sidebar', user?.clubId],
        queryFn: async () => {
            if (!user?.clubId) return null;
            const res = await api.get(`/clubs/${user.clubId}`);
            return res.data;
        },
        enabled: !!user?.clubId,
        staleTime: 1000 * 60 * 5
    });

    const hasAccess = (moduleKey: string) => {
        if (!user) return false;
        if (['OWNER', 'ADMIN', 'MASTER', 'DIRECTOR'].includes(user.role)) return true;

        const defaultPermissions = {
            SECRETARY: ['SECRETARY', 'MEMBERS', 'ATTENDANCE', 'EVENTS'],
            TREASURER: ['TREASURY'],
            COUNSELOR: ['MEMBERS', 'ATTENDANCE', 'EVENTS'],
            INSTRUCTOR: ['CLASSES', 'MEMBERS', 'EVENTS', 'ATTENDANCE'],
        };

        const perms = (clubData?.settings?.permissions && Object.keys(clubData.settings.permissions).length > 0)
            ? clubData.settings.permissions
            : defaultPermissions;

        return perms[user.role]?.includes(moduleKey);
    };

    const getMenuItems = (): MenuItem[] => {
        const items: MenuItem[] = [];
        if (clubLoading) return [];

        const subscriptionStatus = clubData?.subscriptionStatus;
        const clubStatus = clubData?.status;
        const isCritical = subscriptionStatus === 'OVERDUE' || clubStatus === 'SUSPENDED' || clubStatus === 'INACTIVE';

        if (isCritical) {
            items.push({
                id: 'subscription',
                label: 'ASSINATURA',
                icon: CreditCard,
                path: '/dashboard/subscription'
            });
            return items;
        }

        const isMaster = user?.role === 'MASTER' || user?.email === 'master@cantinhomda.com';
        const isPureCoordinator = ['COORDINATOR_REGIONAL', 'COORDINATOR_DISTRICT', 'COORDINATOR_AREA'].includes(user?.role || '');
        const isCoordinator = isMaster || isPureCoordinator;

        items.push({
            id: 'dashboard',
            label: 'INÍCIO',
            icon: LayoutDashboard,
            path: '/dashboard'
        });

        const accessSubItems: MenuItem[] = [
            { id: 'profile', label: 'Meu Perfil', icon: UserCircle, path: '/dashboard/profile' },
        ];

        if (!isPureCoordinator) {
            accessSubItems.push({ id: 'requirements', label: 'Meus Requisitos', icon: ListChecks, path: '/dashboard/requirements' });
            accessSubItems.push({ id: 'my-activities', label: 'Minhas Atividades', icon: Award, path: '/dashboard/activities' });
        }

        if (['PARENT', 'OWNER', 'ADMIN', 'MASTER'].includes(user?.role || '')) {
            accessSubItems.push({ id: 'family', label: 'Minha Família', icon: Users, path: '/dashboard/family' });
        }

        items.push({
            id: 'access',
            label: 'MEU ACESSO',
            icon: UserCircle,
            subItems: accessSubItems
        });

        if (user?.role === 'PARENT') {
            items.push({
                id: 'alerts',
                label: 'ALERTAS',
                icon: AlertTriangle,
                path: '/dashboard/alerts'
            })
        }

        if (!isPureCoordinator) {
            const managementSubItems: MenuItem[] = [];
            if (hasAccess('MEMBERS')) managementSubItems.push({ id: 'members', label: user?.role === 'COUNSELOR' ? 'Minha Unidade' : 'Membros', icon: Users, path: '/dashboard/members' });
            if (hasAccess('CLASSES')) managementSubItems.push({ id: 'classes', label: 'Classes', icon: BookOpen, path: '/dashboard/classes' });
            if (hasAccess('EVENTS')) managementSubItems.push({ id: 'events', label: 'Eventos', icon: Calendar, path: '/dashboard/events' });
            if (hasAccess('ATTENDANCE')) managementSubItems.push({ id: 'meetings', label: 'Chamada', icon: ListChecks, path: '/dashboard/meetings' });
            if (hasAccess('SECRETARY')) managementSubItems.push({ id: 'secretary', label: 'Secretaria', icon: FileText, path: '/dashboard/secretary' });
            if (hasAccess('APPROVALS')) managementSubItems.push({ id: 'approvals', label: 'Aprovações', icon: ListChecks, path: '/dashboard/approvals' });
            if (['OWNER', 'ADMIN', 'MASTER', 'DIRECTOR', 'INSTRUCTOR', 'COUNSELOR'].includes(user?.role || '')) {
                managementSubItems.push({ id: 'assignments', label: 'Atribuições', icon: UserPlus, path: '/dashboard/assignments' });
            }
            if (['OWNER', 'ADMIN', 'DIRECTOR'].includes(user?.role || '')) {
                managementSubItems.push({ id: 'units', label: 'Unidades', icon: Shield, path: '/dashboard/units' });
                managementSubItems.push({ id: 'club-regional-events', label: 'Meus Eventos (Regionais)', icon: Calendar, path: '/dashboard/club/regional-events' });
            }

            if (managementSubItems.length > 0) {
                items.push({
                    id: 'management',
                    label: 'GESTÃO',
                    icon: Building2,
                    subItems: managementSubItems
                });
            }
        }

        if (isCoordinator) {
            const coordinatorSubItems: MenuItem[] = [
                { id: 'regional-ranking', label: 'Ranking Regional', icon: Award, path: '/dashboard/regional-ranking' },
                { id: 'regional-requirements', label: 'Eventos Regionais', icon: Calendar, path: '/dashboard/regional-events-manager' }
            ];

            if (user?.role !== 'OWNER') {
                coordinatorSubItems.push({ id: 'club-directory', label: 'Diretório de Clubes', icon: Building2, path: '/dashboard/clubs-directory' });
                coordinatorSubItems.push({ id: 'coordinator-approvals', label: 'Intervenções', icon: Shield, path: '/dashboard/coordinator-approvals' });
                coordinatorSubItems.push({ id: 'hierarchy', label: 'Clubes / Hierarquia', icon: Globe, path: '/dashboard/hierarchy' });
            }

            items.push({
                id: 'coordinator',
                label: 'COORDENAÇÃO',
                icon: Shield,
                subItems: coordinatorSubItems
            });
        }

        if (!isPureCoordinator) {
            const financialSubItems: MenuItem[] = [];
            financialSubItems.push({ id: 'my-finance', label: 'Minhas Finanças', icon: DollarSign, path: '/dashboard/financial' });
            if (hasAccess('TREASURY')) {
                financialSubItems.push({ id: 'treasury', label: 'Tesouraria', icon: BarChart, path: '/dashboard/treasury' });
            }
            items.push({
                id: 'financial',
                label: 'FINANCEIRO',
                icon: DollarSign,
                subItems: financialSubItems
            });
        }

        const reportsSubItems: MenuItem[] = [
            { id: 'ranking', label: 'Ranking Geral', icon: Award, path: '/dashboard/ranking' }
        ];
        if (isCoordinator) {
            reportsSubItems.push({ id: 'regional-ranking-alt', label: 'Ranking Regional', icon: Award, path: '/dashboard/regional-ranking' });
        }
        if (isCoordinator || hasAccess('TREASURY') || ['OWNER', 'ADMIN'].includes(user?.role || '')) {
            reportsSubItems.push({ id: 'reports', label: 'Relatórios & Métricas', icon: BarChart, path: '/dashboard/regional-dashboard' });
        }
        items.push({
            id: 'reports',
            label: 'RELATÓRIOS',
            icon: BarChart,
            subItems: reportsSubItems
        });

        if (!isPureCoordinator) {
            items.push({
                id: 'store',
                label: 'LOJA',
                icon: ShoppingBag,
                path: '/dashboard/store'
            });
        }

        if (['OWNER', 'ADMIN', 'MASTER'].includes(user?.role || '')) {
            const configSubItems: MenuItem[] = [];
            configSubItems.push({ id: 'settings', label: 'Configurações', icon: Settings, path: '/dashboard/settings' });

            if (isMaster) {
                configSubItems.push({ id: 'system-users', label: 'Gestão de Usuários', icon: UserCog, path: '/dashboard/admin/users' });
                configSubItems.push({ id: 'user-approvals', label: 'Aprovação Cadastros', icon: Users, path: '/dashboard/user-approvals' });
                configSubItems.push({ id: 'club-approvals', label: 'Aprovações de Clubes', icon: Building2, path: '/dashboard/admin/club-approvals' });
                configSubItems.push({ id: 'payment-management', label: 'Gestão Pagamentos', icon: CreditCard, path: '/dashboard/payment-management' });
                configSubItems.push({ id: 'master-clubs', label: 'Gerenciar Clubes', icon: Globe, path: '/dashboard/clubs' });
                configSubItems.push({ id: 'master-hierarchy', label: 'Hierarquia', icon: Globe, path: '/dashboard/hierarchy' });
                configSubItems.push({ id: 'master-treasury', label: 'Tesouraria Master', icon: DollarSign, path: '/dashboard/master-treasury' });
                configSubItems.push({ id: 'referral-control', label: 'Controle Indicações', icon: Award, path: '/dashboard/referrals' });
                configSubItems.push({ id: 'all-approvals', label: 'Aprovações Pendentes', icon: Shield, path: '/dashboard/approvals' });
                configSubItems.push({ id: 'system-messages', label: 'Mensagens Sistema', icon: AlertTriangle, path: '/dashboard/system-messages' });
            }
            // Add Requirements Master for MASTER role specifically (or Admin if desired)
            if (isMaster) {
                configSubItems.push({ id: 'master-requirements', label: 'Requisitos (Master)', icon: ListChecks, path: '/dashboard/master-requirements' });
            }

            items.push({
                id: 'config',
                label: 'CONFIG',
                icon: Settings,
                subItems: configSubItems
            });
        }

        return items;
    };

    const menuItems = getMenuItems();
    const activeItem = menuItems.find(item => item.id === activeMenu);

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            <aside className={`fixed inset-y-0 left-0 z-50 flex transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

                {/* Level 1: Main Sidebar */}
                <div className="w-24 flex flex-col items-center py-6 h-full shadow-2xl relative z-20 bg-slate-950 border-r border-white/5">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mb-8 px-2"
                    >
                        <img src="/logo.png" alt="DBV" className="w-12 h-12 object-contain filter drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    </motion.div>

                    <nav className="flex-1 w-full space-y-2 overflow-y-auto scrollbar-none px-2">
                        {menuItems.map(item => {
                            const isActive = activeMenu === item.id || (!activeMenu && getActiveIdFromPath(location.pathname) === item.id);
                            const Icon = item.icon;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        if (activeMenu === item.id) setActiveMenu(null);
                                        else setActiveMenu(item.id);
                                    }}
                                    className={`
                                        group flex flex-col items-center justify-center py-3.5 cursor-pointer w-full transition-all duration-300 rounded-2xl relative
                                        ${isActive ? 'bg-blue-600/10 text-white' : 'text-slate-500 hover:text-slate-100 hover:bg-white/5'}
                                    `}
                                >
                                    {item.path ? (
                                        <Link
                                            to={item.path}
                                            className="flex flex-col items-center w-full"
                                            onClick={() => setActiveMenu(null)}
                                        >
                                            <Icon className={`w-7 h-7 mb-1.5 transition-all duration-300 ${isActive ? 'text-blue-500 scale-110' : 'text-slate-500 group-hover:text-white group-hover:scale-110'}`} />
                                            <span className={`text-[10px] font-bold tracking-wider text-center leading-tight px-1 uppercase transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500'}`}>
                                                {item.label}
                                            </span>
                                        </Link>
                                    ) : (
                                        <div className="flex flex-col items-center w-full">
                                            <Icon className={`w-7 h-7 mb-1.5 transition-all duration-300 ${isActive ? 'text-blue-500 scale-110' : 'text-slate-400 group-hover:text-white group-hover:scale-110'}`} />
                                            <span className={`text-[10px] font-bold tracking-wider text-center leading-tight px-1 uppercase transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500'}`}>
                                                {item.label}
                                            </span>
                                        </div>
                                    )}

                                    {/* Active Indicator Bar */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeIndicator"
                                            className="absolute left-[-8px] top-2 bottom-2 w-1.5 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    <div className="pt-6 border-t border-white/5 w-full flex flex-col items-center px-2">
                        <button onClick={logout} className="p-3 bg-white/5 hover:bg-red-500/10 rounded-2xl transition-all duration-300 group">
                            <LogOut className="w-6 h-6 text-slate-500 group-hover:text-red-400" />
                        </button>
                    </div>
                </div>

                {/* Level 2: Submenu Drawer */}
                <AnimatePresence>
                    {activeItem?.subItems && (
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="w-72 bg-slate-950/95 backdrop-blur-2xl border-r border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.3)] h-full flex flex-col"
                        >
                            <div className="p-7 mb-2">
                                <span className="text-blue-500 text-[10px] font-black tracking-[0.2em] mb-2 block uppercase">Menu de Opções</span>
                                <h2 className="text-xl font-black text-white flex items-center gap-3">
                                    <div className="p-2 bg-blue-600/10 rounded-xl">
                                        <activeItem.icon className="w-5 h-5 text-blue-500" />
                                    </div>
                                    {activeItem.label}
                                </h2>
                            </div>

                            <div className="p-4 space-y-1.5 overflow-y-auto flex-1 scrollbar-none">
                                {activeItem.subItems.map((sub, index) => {
                                    const SubIcon = sub.icon;
                                    const isSubActive = location.pathname === sub.path;
                                    return (
                                        <motion.div
                                            key={sub.id}
                                            initial={{ x: -10, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <Link
                                                to={sub.path || '#'}
                                                onClick={() => {
                                                    setMobileOpen(false);
                                                    setActiveMenu(null);
                                                }}
                                                className={`
                                                    flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group
                                                    ${isSubActive
                                                        ? 'bg-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.3)] ring-1 ring-blue-400/50'
                                                        : 'text-slate-400 hover:text-white hover:bg-white/5'}
                                                `}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <SubIcon className={`w-4.5 h-4.5 transition-transform group-hover:scale-110 ${isSubActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
                                                    {sub.label}
                                                </div>
                                                <ChevronRight className={`w-4 h-4 transition-transform ${isSubActive ? 'opacity-100 rotate-90' : 'opacity-0 group-hover:opacity-100'}`} />
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            <div className="p-6 bg-white/5 border-t border-white/5">
                                <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-2xl">
                                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-black text-sm">
                                        {user?.name?.[0].toUpperCase() || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                                        <p className="text-[10px] text-slate-500 font-medium">Sessão Ativa</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </aside>
        </>
    );
}
