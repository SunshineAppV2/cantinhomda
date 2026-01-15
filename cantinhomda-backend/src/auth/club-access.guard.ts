
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ClubAccessGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const params = request.params;
        const clubId = params.clubId || request.body.clubId || request.query.clubId;

        // 1. If no clubId is involved in the request, this guard might be irrelevant 
        // OR we might want to enforcement that clubId IS present.
        // For now, let's assume if no clubId is targetted, we pass (other guards handle auth).
        if (!clubId) {
            return true;
        }

        // 2. Initial Checks
        if (!user) {
            throw new ForbiddenException('Usuário não autenticado.');
        }

        // 3. MASTER Override
        if (user.role === 'MASTER' || user.email === 'master@cantinhodbv.com') {
            return true;
        }

        // 4. District/Regional Coordinators
        // They can access if the club is in their jurisdiction. 
        // This requires DB lookup which is expensive in a Guard without caching.
        // For now, let's simplify: functionality is mainly for Club Isolation.
        // If we need complex hierarchy checks, we might need to inject a Service or allow them 
        // if they have the specific role (and let Service layer handle the data filtering).
        if (['COORDINATOR_DISTRICT', 'COORDINATOR_REGIONAL', 'COORDINATOR_AREA'].includes(user.role)) {
            return true; // Delegate granular data filering to Service
        }

        // 5. Club Isolation Check
        if (user.clubId !== clubId) {
            throw new ForbiddenException('Acesso negado: Você não tem permissão para acessar dados deste clube.');
        }

        return true;
    }
}
