/**
 * Componentes de Loading Skeleton
 * 
 * Substitui spinners genéricos por skeletons animados
 * Melhora a percepção de performance e UX
 */

interface SkeletonProps {
    className?: string;
}

/**
 * Skeleton Base
 * Componente básico com animação shimmer
 */
export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 bg-[length:200%_100%] dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded ${className}`}
            style={{
                animation: 'shimmer 2s infinite linear',
            }}
        />
    );
}

/**
 * Card Skeleton
 * Para cards de dashboard, produtos, etc
 */
export function CardSkeleton() {
    return (
        <div className="glass-card rounded-[2.5rem] p-8 premium-shadow">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-10 rounded-full" />
            </div>

            {/* Content */}
            <div className="space-y-4">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                <Skeleton className="h-10 w-full rounded-2xl" />
            </div>
        </div>
    );
}

/**
 * Table Row Skeleton
 * Para tabelas de membros, transações, etc
 */
export function TableRowSkeleton() {
    return (
        <tr className="border-b border-slate-100 dark:border-slate-700">
            <td className="px-8 py-5">
                <Skeleton className="h-4 w-32" />
            </td>
            <td className="px-8 py-5">
                <Skeleton className="h-4 w-48" />
            </td>
            <td className="px-8 py-5">
                <Skeleton className="h-4 w-24" />
            </td>
            <td className="px-8 py-5">
                <Skeleton className="h-4 w-20" />
            </td>
            <td className="px-8 py-5">
                <div className="flex justify-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-xl" />
                    <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
            </td>
        </tr>
    );
}

/**
 * List Item Skeleton
 * Para listas de itens, notificações, etc
 */
export function ListItemSkeleton() {
    return (
        <div className="flex items-center gap-4 p-4 border-b border-slate-100 dark:border-slate-700">
            <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20 rounded-full" />
        </div>
    );
}

/**
 * Dashboard Stats Skeleton
 * Para cards de estatísticas do dashboard
 */
export function DashboardStatSkeleton() {
    return (
        <div className="glass-card p-8 rounded-[2.5rem] premium-shadow">
            <div className="flex justify-between items-start">
                <div className="space-y-3 flex-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-14 w-14 rounded-2xl" />
            </div>
        </div>
    );
}

/**
 * Product Card Skeleton
 * Para cards de produtos da loja
 */
export function ProductCardSkeleton() {
    return (
        <div className="glass-card rounded-[2.5rem] premium-shadow overflow-hidden">
            {/* Image */}
            <Skeleton className="h-56 w-full" />

            {/* Content */}
            <div className="p-8 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />

                {/* Price and Button */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-700">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-10 w-28 rounded-2xl" />
                </div>
            </div>
        </div>
    );
}

/**
 * Dashboard Skeleton
 * Layout completo para a página do dashboard
 */
export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="mb-8">
                <Skeleton className="h-10 w-64 mb-2" />
                <Skeleton className="h-4 w-48" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardStatSkeleton />
                <DashboardStatSkeleton />
                <DashboardStatSkeleton />
                <DashboardStatSkeleton />
            </div>

            {/* Content Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CardSkeleton />
                <CardSkeleton />
            </div>
        </div>
    );
}

/**
 * Table Skeleton
 * Tabela completa com múltiplas linhas
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="glass-card rounded-[2.5rem] premium-shadow overflow-hidden">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-700">
                <Skeleton className="h-6 w-48" />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-8 py-5">
                                <Skeleton className="h-3 w-24" />
                            </th>
                            <th className="px-8 py-5">
                                <Skeleton className="h-3 w-32" />
                            </th>
                            <th className="px-8 py-5">
                                <Skeleton className="h-3 w-20" />
                            </th>
                            <th className="px-8 py-5">
                                <Skeleton className="h-3 w-24" />
                            </th>
                            <th className="px-8 py-5">
                                <Skeleton className="h-3 w-16" />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rows }).map((_, i) => (
                            <TableRowSkeleton key={i} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/**
 * Grid Skeleton
 * Para grids de produtos, cards, etc
 */
export function GridSkeleton({
    items = 8,
    columns = 4
}: {
    items?: number;
    columns?: number;
}) {
    return (
        <div
            className="grid gap-6"
            style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(250px, 1fr))`,
            }}
        >
            {Array.from({ length: items }).map((_, i) => (
                <ProductCardSkeleton key={i} />
            ))}
        </div>
    );
}

/**
 * List Skeleton
 * Para listas verticais
 */
export function ListSkeleton({ items = 5 }: { items?: number }) {
    return (
        <div className="glass-card rounded-[2.5rem] premium-shadow overflow-hidden">
            {Array.from({ length: items }).map((_, i) => (
                <ListItemSkeleton key={i} />
            ))}
        </div>
    );
}
