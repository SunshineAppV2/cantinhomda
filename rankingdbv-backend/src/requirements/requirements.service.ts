
import { Injectable, Inject, forwardRef, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';

import { NotificationsService } from '../notifications/notifications.service';
import { ClubsService } from '../clubs/clubs.service';
import * as cheerio from 'cheerio';
import axios from 'axios';

@Injectable()
export class RequirementsService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
        @Inject(forwardRef(() => ClubsService)) private clubsService: ClubsService
    ) { }

    async create(data: CreateRequirementDto) {
        console.log('[RequirementsService] Creating requirement:', JSON.stringify(data));
        const { questions, ...rest } = data;
        try {
            return await this.prisma.requirement.create({
                data: {
                    ...rest,
                    questions: questions ? {
                        create: questions
                    } : undefined
                }
            });
        } catch (error) {
            console.error('[RequirementsService] Error creating requirement:', error);
            throw error;
        }
    }

    async scrapeUrl(url: string): Promise<any[]> {
        console.log(`[Scraper] Fetching URL: ${url}`);
        try {
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);
            const requirements: any[] = [];
            let currentArea = 'GERAIS';

            // Extract text from body
            const text = $('body').text();
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            let isParsing = false;

            const areaRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+(.+)$/i;
            const reqRegex = /^(\d+)\.\s+(.+)$/;

            for (const line of lines) {
                // Start parsing when we see "REQUISITOS"
                if (line.toUpperCase().includes('REQUISITOS')) {
                    isParsing = true;
                    continue;
                }
                // Or if we identify an Area title
                if (areaRegex.test(line)) {
                    isParsing = true;
                }

                if (!isParsing) continue;

                const areaMatch = line.match(areaRegex);
                if (areaMatch) {
                    currentArea = areaMatch[2].trim().toUpperCase();
                    continue;
                }

                const reqMatch = line.match(reqRegex);
                if (reqMatch) {
                    const code = reqMatch[1];
                    const description = reqMatch[2];
                    // Add new requirement
                    requirements.push({
                        code: code,
                        area: currentArea,
                        description: description,
                        // active: true - Removed as it's not in Prisma Schema
                        dbvClass: 'AMIGO' // Placeholder, overwritten below
                    });
                } else {
                    // Check for sub-items like "a) ..." or continues text
                    if (requirements.length > 0) {
                        if (/^[a-z]\)\s/.test(line)) {
                            requirements[requirements.length - 1].description += '\n' + line;
                        }
                    }
                }

                // Stop condition for Class Avançada or similar sections if needed
                if (line.includes('CLASSE AVANÇADA')) {
                    currentArea = 'CLASSE AVANÇADA';
                }
            }

            // Detect Class from Titie
            const title = $('title').text().toUpperCase() || $('h1').text().toUpperCase();
            let dbvClass = 'AMIGO';
            if (title.includes('AMIGO')) dbvClass = 'AMIGO';
            else if (title.includes('COMPANHEIRO')) dbvClass = 'COMPANHEIRO';
            else if (title.includes('PESQUISADOR')) dbvClass = 'PESQUISADOR';
            else if (title.includes('PIONEIRO')) dbvClass = 'PIONEIRO';
            else if (title.includes('EXCURSIONISTA')) dbvClass = 'EXCURSIONISTA';
            else if (title.includes('GUIA')) dbvClass = 'GUIA';

            return requirements.map(r => ({ ...r, dbvClass }));
        } catch (error) {
            console.error('Error scraping URL:', error);
            throw new Error('Falha ao ler URL. Verifique se o link está correto.');
        }
    }

    async createMany(data: CreateRequirementDto[]) {
        console.log(`[RequirementsService] Importing ${data.length} requirements...`);
        let count = 0;
        const errors: any[] = [];
        for (const item of data) {
            try {
                await this.create(item);
                count++;
            } catch (err) {
                console.error('Error importing requirement:', item.code, err);
                errors.push({ code: item.code, error: err.message });
            }
        }
        console.log(`[RequirementsService] Imported ${count}/${data.length} requirements.`);
        return { count, errors };
    }

    async findAll(query: { dbvClass?: any, specialtyId?: string, userId?: string, userClubId?: string, region?: string, district?: string }) {
        const where: any = {};
        if (query.dbvClass) where.dbvClass = query.dbvClass;
        if (query.specialtyId) where.specialtyId = query.specialtyId;

        // Filter by Club (Global + User's Club + User's Hierarchy)
        // Levels: Global (club=null, region=null, district=null), Club, Region, District
        if (query.userClubId || query.region || query.district) {
            where.OR = [
                { clubId: null, region: null, district: null }, // Universal Global
            ];

            if (query.userClubId) {
                where.OR.push({ clubId: query.userClubId });
            }

            if (query.region) {
                where.OR.push({ region: query.region, district: null }); // Regional (applies to all districts in region)
                // Note: Some systems allow region=X, district=null to mean "Applicable for whole region".
                // If a requirement has region=X AND district=Y, it is District specific.
            }

            if (query.district) {
                where.OR.push({ district: query.district });
            }
        } else {
            // If no context, show GLOBAL only
            where.clubId = null;
            where.region = null;
            where.district = null;
        }

        const rawRequirements = await this.prisma.requirement.findMany({
            where,
            orderBy: [
                { area: 'asc' },
                { code: 'asc' },
                { description: 'asc' }
            ],
            include: {
                userProgress: query.userId ? {
                    where: { userId: query.userId },
                    select: { status: true, answerText: true, answerFileUrl: true }
                } : false
            }
        });

        // PRIORITIZATION & PROGRESS INHERITANCE LOGIC:
        // If we have both a Universal and a Club requirement with the same Code/Class/Specialty OR Description,
        // show the CLUB one, but ensure we keep or merge user progress.
        if (query.userClubId) {
            const clubReqs = rawRequirements.filter(r => r.clubId === query.userClubId);
            const universalReqs = rawRequirements.filter(r => r.clubId === null);

            // Index Universal Reqs by "Key" to quickly find matches for Club Reqs
            const universalMap = new Map<string, any>();
            for (const u of universalReqs) {
                if (u.code) {
                    const key = `${u.dbvClass || ''}_${u.specialtyId || ''}_${u.code}`;
                    universalMap.set(key, u);
                }
                const descKey = `${u.dbvClass || ''}_${u.specialtyId || ''}_${u.description.trim().toLowerCase()}`;
                if (!universalMap.has(descKey)) universalMap.set(descKey, u);
            }

            // Index overridden keys to filter the universal list later
            const overriddenKeys = new Set<string>();

            // Process Club Reqs and inherit progress if needed
            for (const r of clubReqs) {
                let match = null;
                if (r.code) {
                    const key = `${r.dbvClass || ''}_${r.specialtyId || ''}_${r.code}`;
                    match = universalMap.get(key);
                    if (match) overriddenKeys.add(key);
                }

                const descKey = `${r.dbvClass || ''}_${r.specialtyId || ''}_${r.description.trim().toLowerCase()}`;
                if (!match) {
                    match = universalMap.get(descKey);
                }
                if (match) overriddenKeys.add(descKey);

                // Inherit progress if Club req has none but Universal has
                if (match && query.userId) {
                    const m = match as any;
                    const clubProg = (r as any).userProgress || [];
                    const univProg = m.userProgress || [];
                    if (clubProg.length === 0 && univProg.length > 0) {
                        // Inherit from Universal
                        (r as any).userProgress = univProg;
                        (r as any).inheritedFromId = m.id;
                    }
                }
            }

            // Filter Universal Reqs (only keep ones that weren't overridden)
            const finalUniversal = universalReqs.filter(u => {
                if (u.code) {
                    const key = `${u.dbvClass || ''}_${u.specialtyId || ''}_${u.code}`;
                    if (overriddenKeys.has(key)) return false;
                }
                const descKey = `${u.dbvClass || ''}_${u.specialtyId || ''}_${u.description.trim().toLowerCase()}`;
                return !overriddenKeys.has(descKey);
            });

            // Combine and Re-Sort
            const combined = [...clubReqs, ...finalUniversal];
            return combined.sort((a, b) => {
                // Area > Code > Description
                if ((a.area || '') !== (b.area || '')) return (a.area || '').localeCompare(b.area || '');
                if ((a.code || '') !== (b.code || '')) return (a.code || '').localeCompare(b.code || '');
                return (a.description || '').localeCompare(b.description || '');
            });
        }

        return rawRequirements;
    }

    // Toggle status (Pending <-> Completed)
    async toggleStatus(userId: string, requirementId: string) {
        const existing = await this.prisma.userRequirement.findUnique({
            where: { userId_requirementId: { userId, requirementId } }
        });

        if (!existing) {
            // Create if not exists (Auto-assign on self-toggle? Allowed for basic requirements)
            return this.prisma.userRequirement.create({
                data: {
                    userId,
                    requirementId,
                    status: 'APPROVED',
                    completedAt: new Date()
                }
            });
        }

        if (existing.status === 'APPROVED') {
            // Revert to PENDING (Un-complete)
            return this.prisma.userRequirement.update({
                where: { id: existing.id },
                data: { status: 'PENDING', completedAt: null }
            });
        } else {
            // Mark as APPROVED (Complete)
            return this.prisma.userRequirement.update({
                where: { id: existing.id },
                data: { status: 'APPROVED', completedAt: new Date() }
            });
        }
    }

    // Get User Progress
    async getUserProgress(userId: string) {
        return this.prisma.userRequirement.findMany({
            where: { userId }
        });
    }

    async remove(id: string) {
        return this.prisma.requirement.delete({
            where: { id }
        });
    }

    async update(id: string, updateDto: UpdateRequirementDto) {
        const { questions, ...rest } = updateDto;

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.requirement.update({
                where: { id },
                data: rest
            });

            if (rest.type === 'QUESTIONNAIRE' && questions) {
                // Remove old questions and add new ones
                await tx.question.deleteMany({ where: { requirementId: id } });
                await tx.question.createMany({
                    data: questions.map(q => ({
                        ...q,
                        requirementId: id
                    }))
                });
            }

            return updated;
        });
    }

    // Submit Answer for Requirement
    // Submit Answer for Requirement
    async submitAnswer(userId: string, requirementId: string, text?: string, fileUrl?: string) {
        // 1. Fetch Requirement & Context
        const requirement = await this.prisma.requirement.findUnique({
            where: { id: requirementId },
            include: { regionalEvent: { include: { participatingClubs: true } } }
        });
        if (!requirement) throw new Error('Requisito não encontrado');

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { club: true }
        });
        if (!user || !user.clubId) throw new UnauthorizedException('Usuário inválido ou sem clube');

        // 2. Event Participation Check
        if (requirement.regionalEventId && requirement.regionalEvent) {
            const isSubscribed = requirement.regionalEvent.participatingClubs.some(c => c.id === user.clubId);
            if (!isSubscribed) {
                throw new UnauthorizedException('Seu clube não está inscrito neste evento.');
            }
        }

        // 3. Upsert Response
        const result = await this.prisma.userRequirement.upsert({
            where: { userId_requirementId: { userId, requirementId } },
            create: {
                userId,
                requirementId,
                answerText: text,
                answerFileUrl: fileUrl,
                status: 'PENDING',
                completedAt: new Date()
            },
            update: {
                answerText: text,
                answerFileUrl: fileUrl,
                status: 'PENDING',
                completedAt: new Date()
            }
        });

        // 4. Notifications
        try {
            // If Event Requirement -> Notify Coordinators
            if (requirement.regionalEventId) {
                // Find Coordinators for the Event's Region/District
                // Assuming RegionalEvent has region/district fields.
                // Or we notify the Event Creator?
                // Better: Notify Regional/District Coordinators.

                const whereCoord: any = { role: { in: ['COORDINATOR_REGIONAL', 'COORDINATOR_DISTRICT', 'MASTER'] } };
                if (requirement.regionalEvent?.district) {
                    whereCoord.district = requirement.regionalEvent.district;
                } else if (requirement.regionalEvent?.region) {
                    whereCoord.region = requirement.regionalEvent.region;
                }

                const coordinators = await this.prisma.user.findMany({
                    where: whereCoord,
                    select: { id: true }
                });

                for (const coord of coordinators) {
                    await this.notificationsService.send(
                        coord.id,
                        'Nova Resposta de Evento',
                        `O clube ${user.club?.name} enviou uma resposta para o evento ${requirement.regionalEvent?.title}.`,
                        'INFO'
                    );
                }

            } else {
                // Legacy / Club Requirement -> Notify Club Admins
                const admins = await this.prisma.user.findMany({
                    where: {
                        clubId: user.clubId,
                        role: { in: ['OWNER', 'ADMIN', 'INSTRUCTOR'] },
                        id: { not: userId } // Don't notify self
                    },
                    select: { id: true }
                });

                for (const admin of admins) {
                    await this.notificationsService.send(
                        admin.id,
                        'Nova Aprovação Pendente',
                        `${user.name} enviou uma resposta para o requisito: ${requirement.code ? requirement.code + ' - ' : ''}${requirement.description.substring(0, 30)}...`,
                        'INFO'
                    );
                }
            }
        } catch (error) {
            console.error('Failed to send notifications on submit:', error);
        }

        return result;
    }

    // --- QUESTIONNAIRE LOGIC ---

    async getQuiz(requirementId: string) {
        // Fetch all questions for the requirement
        const questions = await this.prisma.question.findMany({
            where: { requirementId }
        });

        // Shuffle and pick 3
        const shuffled = questions.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);

        // Map to return without correct answer for security (though options are checked on backend)
        return selected.map(q => ({
            id: q.id,
            questionText: q.questionText,
            options: q.options
        }));
    }

    async submitQuiz(userId: string, requirementId: string, answers: { questionId: string, selectedIndex: number }[]) {
        // Fetch questions to verify
        const questionIds = answers.map(a => a.questionId);
        const questions = await this.prisma.question.findMany({
            where: { id: { in: questionIds }, requirementId }
        });

        // Verify answers
        let isPass = true;
        if (questions.length !== answers.length) isPass = false; // Missing answers?

        for (const q of questions) {
            const answer = answers.find(a => a.questionId === q.id);
            if (!answer || answer.selectedIndex !== q.correctIndex) {
                isPass = false;
                break;
            }
        }

        if (isPass) {
            // Mark requirement as APPROVED
            await this.prisma.userRequirement.upsert({
                where: { userId_requirementId: { userId, requirementId } },
                update: { status: 'APPROVED', completedAt: new Date() },
                create: {
                    userId,
                    requirementId,
                    status: 'APPROVED',
                    completedAt: new Date()
                }
            });
            return { success: true, message: 'Parabéns! Você passou no questionário.' };
        } else {
            return { success: false, message: 'Respostas incorretas. Tente novamente.' };
        }
    }
    // --- BULK ASSIGNMENT ---

    async createAssignments(requirementId: string, userIds: string[], counselorId: string) {
        // 1. Validate Counselor/Admin permissions
        const counselor = await this.prisma.user.findUnique({ where: { id: counselorId } });
        if (!counselor) throw new Error('Conselheiro não encontrado');

        const validUserIds: string[] = [];

        if (counselor.role === 'COUNSELOR') {
            if (!counselor.unitId) throw new Error('Conselheiro não possui unidade vinculada');

            // Verify if all target users belong to the counselor's unit
            const users = await this.prisma.user.findMany({
                where: {
                    id: { in: userIds },
                    unitId: counselor.unitId
                },
                select: { id: true }
            });
            validUserIds.push(...users.map(u => u.id));
        } else if (['ADMIN', 'OWNER', 'INSTRUCTOR'].includes(counselor.role)) {
            // Admins can assign to anyone
            validUserIds.push(...userIds);
        } else {
            throw new Error('Permissão negada');
        }

        if (validUserIds.length === 0) return { count: 0, message: 'Nenhum usuário válido para atribuição' };

        // 2. Create Assignments (Upsert loop to avoid errors if already assigned)
        let count = 0;
        for (const uid of validUserIds) {
            const existing = await this.prisma.userRequirement.findUnique({
                where: { userId_requirementId: { userId: uid, requirementId } }
            });

            if (!existing) {
                await this.prisma.userRequirement.create({
                    data: {
                        userId: uid,
                        requirementId,
                        status: 'PENDING'
                    }
                });
                count++;
            }
        }

        return { count, message: `Requisito atribuído a ${count} desbravadores` };
    }

    // --- APPROVALS ---

    async getPendingApprovals(counselorId: string) {
        const counselor = await this.prisma.user.findUnique({ where: { id: counselorId } });
        if (!counselor || !counselor.unitId) return [];

        // For Admins/Owners, maybe return ALL pending?
        // For now, let's stick to Unit logic as requested.
        // If Admin/Owner has no unit, they might see nothing here, but they have other views.
        // Let's allow Admins to see ALL pending if they want? Or reuse this for Unit view.
        // The user request is specifically for "Minha Unidade".

        const whereClause: any = {
            status: 'PENDING',
            // Only showing those with answers? User said "aguardando aprovação". 
            // Usually 'PENDING' + answer means waiting approval.
            // If just assigned (no answer), it is also PENDING?
            // "Assign" creates PENDING. "Answer" updates PENDING.
            // We should filter where answerText is NOT null OR answerFileUrl is NOT null.
            OR: [
                { answerText: { not: null } },
                { answerFileUrl: { not: null } }
            ]
        };

        if (counselor.role === 'COUNSELOR') {
            whereClause.user = { unitId: counselor.unitId };
        } else if (['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(counselor.role)) {
            // Admins see all pending in their club
            whereClause.user = { clubId: counselor.clubId };
        } else if (counselor.role === 'COORDINATOR_DISTRICT') {
            whereClause.user = { club: { district: counselor.district || '' } };
        } else if (counselor.role === 'COORDINATOR_REGIONAL') {
            whereClause.user = { club: { region: counselor.region || '' } };
        } else if (counselor.role === 'COORDINATOR_AREA') {
            whereClause.user = { club: { association: counselor.association || '' } };
        } else if (counselor.role === 'MASTER') {
            // Master sees everything
        } else {
            return [];
        }

        return this.prisma.userRequirement.findMany({
            where: whereClause,
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
                requirement: { select: { id: true, code: true, description: true, area: true } }
            },
            orderBy: { completedAt: 'desc' }
        });
    }

    async getAlertsForChild(childId: string) {
        return this.prisma.userRequirement.findMany({
            where: {
                userId: childId,
                status: { in: ['PENDING', 'REJECTED'] }
            },
            include: {
                requirement: { select: { id: true, code: true, description: true, area: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }

    async getPendingDeliveries(counselorId: string) {
        const counselor = await this.prisma.user.findUnique({ where: { id: counselorId } });
        if (!counselor || !counselor.unitId) return [];

        const whereClause: any = {
            status: 'PENDING',
            answerText: null,
            answerFileUrl: null
        };

        if (counselor.role === 'COUNSELOR') {
            whereClause.user = { unitId: counselor.unitId };
        } else if (['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(counselor.role)) {
            // Admins see all pending deliveries?
        } else {
            return [];
        }

        return this.prisma.userRequirement.findMany({
            where: whereClause,
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
                requirement: { select: { id: true, code: true, description: true, area: true } }
            },
            orderBy: { createdAt: 'asc' } // Oldest first
        });
    }

    async approveAssignment(id: string, approverId: string) {
        // 1. Fetch & Check Access
        const pending = await this.prisma.userRequirement.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!pending) throw new Error('Requirement request not found');
        if (pending.user && pending.user.clubId) {
            await this.clubsService.checkWriteAccess(pending.user.clubId);
        }

        // 2. Approve
        const userReq = await this.prisma.userRequirement.update({
            where: { id },
            data: { status: 'APPROVED', completedAt: new Date() },
            include: {
                user: true,
                requirement: true
            }
        });

        const userId = userReq.userId;
        const user = userReq.user;
        const requirement = userReq.requirement;

        // 2. Class Progress & Scoring
        if (user.dbvClass && requirement.dbvClass === user.dbvClass) {
            const classReqsCount = await this.prisma.requirement.count({
                where: { dbvClass: user.dbvClass }
            });

            const userApprovedCount = await this.prisma.userRequirement.count({
                where: {
                    userId,
                    status: 'APPROVED',
                    requirement: { dbvClass: user.dbvClass }
                }
            });

            if (classReqsCount > 0) {
                const percent = (userApprovedCount / classReqsCount) * 100;
                let newPoints = 0;
                let newMilestone = user.lastClassMilestone;
                let msg = '';

                // Cumulative Checks
                if (percent >= 25 && user.lastClassMilestone < 25) {
                    newPoints += 100;
                    newMilestone = 25;
                    msg = 'Parabéns! Você completou 25% da sua classe (+100 XP)';
                }
                if (percent >= 50 && user.lastClassMilestone < 50) {
                    newPoints += 200;
                    newMilestone = 50;
                    msg = 'Incrível! Você completou 50% da sua classe (+200 XP)';
                }
                if (percent >= 75 && user.lastClassMilestone < 75) {
                    newPoints += 300;
                    newMilestone = 75;
                    msg = 'Quase lá! Você completou 75% da sua classe (+300 XP)';
                }
                if (percent >= 100 && user.lastClassMilestone < 100) {
                    newPoints += 1000;
                    newMilestone = 100;
                    msg = 'Fantástico! Você CONCLUIU sua classe! (+1000 XP)';
                }

                if (newPoints > 0) {
                    await this.prisma.user.update({
                        where: { id: userId },
                        data: {
                            points: { increment: newPoints },
                            lastClassMilestone: newMilestone,
                            pointsHistory: {
                                create: {
                                    amount: newPoints,
                                    reason: `Progresso de Classe (${percent}%)`,
                                    source: 'REQUIREMENT'
                                }
                            }
                        }
                    });

                    await this.notificationsService.send(userId, 'Progresso de Classe', msg, 'SUCCESS');
                }
            }
        }

        // 3. Specialty Logic
        if (requirement.specialtyId) {
            const specialtyReqsCount = await this.prisma.requirement.count({
                where: { specialtyId: requirement.specialtyId }
            });

            const userSpecialtyApprovedCount = await this.prisma.userRequirement.count({
                where: {
                    userId,
                    status: 'APPROVED',
                    requirement: { specialtyId: requirement.specialtyId }
                }
            });

            if (specialtyReqsCount > 0 && userSpecialtyApprovedCount === specialtyReqsCount) {
                // All requirements done. Check Approver Role.
                const approver = await this.prisma.user.findUnique({ where: { id: approverId } });

                if (approver && ['INSTRUCTOR', 'ADMIN', 'OWNER'].includes(approver.role)) {

                    // Check if already awarded
                    const existingSpecialty = await this.prisma.userSpecialty.findUnique({
                        where: { userId_specialtyId: { userId, specialtyId: requirement.specialtyId } }
                    });

                    if (!existingSpecialty || existingSpecialty.status !== 'COMPLETED') {
                        // Mark as Completed & Award Points
                        await this.prisma.userSpecialty.upsert({
                            where: { userId_specialtyId: { userId, specialtyId: requirement.specialtyId } },
                            update: { status: 'COMPLETED', awardedAt: new Date() },
                            create: {
                                userId,
                                specialtyId: requirement.specialtyId,
                                status: 'COMPLETED',
                                awardedAt: new Date()
                            }
                        });

                        // Award Specialty Points (e.g. 500 XP)
                        const SPECIALTY_POINTS = 500;
                        await this.prisma.user.update({
                            where: { id: userId },
                            data: {
                                points: { increment: SPECIALTY_POINTS },
                                pointsHistory: {
                                    create: {
                                        amount: SPECIALTY_POINTS,
                                        reason: 'Especialidade Concluída',
                                        source: 'SPECIALTY'
                                    }
                                }
                            }
                        });

                        await this.notificationsService.send(userId, 'Especialidade Concluída', 'Você concluiu uma nova especialidade! (+500 XP)', 'SUCCESS');
                    }
                }
            }
        }

        return userReq;
    }

    async rejectAssignment(id: string) {
        // Option A: Delete and reset?
        // Option B: Set status REJECTED (allowing re-submission?)
        // Let's set to REJECTED.
        // Actually, if we set to REJECTED, the user needs to know.
        // Or we just clear the answer and set status PENDING?
        // Let's just update prompt to REJECTED status.
        return this.prisma.userRequirement.update({
            where: { id },
            data: { status: 'REJECTED' } // We might need to handle this status in frontend
        });
    }
}

