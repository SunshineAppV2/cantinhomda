
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: string[] }) {
    const { isAuthenticated, loading, user } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-100">Carregando...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Force Password Change Check
    if (user?.mustChangePassword && location.pathname !== '/change-password') {
        return <Navigate to="/change-password" replace />;
    }

    // Force Profile Completion for Coordinators
    const isCoordinator = ['COORDINATOR_REGIONAL', 'COORDINATOR_DISTRICT', 'COORDINATOR_AREA'].includes(user?.role || '');
    if (isCoordinator && location.pathname !== '/complete-profile') {
        // Check strict compliance
        const hasUnion = !!user?.union;
        const hasAssociation = !!(user?.association || user?.mission);
        const hasRegion = (user?.role === 'COORDINATOR_REGIONAL' || user?.role === 'COORDINATOR_DISTRICT') ? !!user?.region : true;
        const hasDistrict = user?.role === 'COORDINATOR_DISTRICT' ? !!user?.district : true;

        if (!hasUnion || !hasAssociation || !hasRegion || !hasDistrict) {
            return <Navigate to="/complete-profile" replace />;
        }
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}
