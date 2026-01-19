import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { AttendanceDto } from './dto/attendance.dto';
import { ActivitiesService } from '../activities/activities.service';

@Injectable()
export class MeetingsService {
    constructor(
        private prisma: PrismaService,
        private activitiesService: ActivitiesService
    ) { }

    async create(createMeetingDto: CreateMeetingDto) {
        console.log('Creating Meeting Payload:', createMeetingDto);

        let activityId: string | null = null;

        if (createMeetingDto.isScoring) {
            const activity = await this.activitiesService.create({
                title: `Reunião: ${createMeetingDto.title}`,
                description: `Pontuação automática por presença na reunião de ${new Date(createMeetingDto.date).toLocaleDateString()}`,
                points: createMeetingDto.points || 10,
                clubId: createMeetingDto.clubId
            });
            activityId = activity.id;
        }

        return this.prisma.meeting.create({
            data: {
                ...createMeetingDto,
                activityId,
                isScoring: undefined // Remove from prisma payload if not in schema (it's not)
            } as any // Cast avoiding strict checks on isScoring removal
        });
    }

    findAllByClub(clubId: string) {
        return this.prisma.meeting.findMany({
            where: { clubId },
            orderBy: { date: 'desc' },
            include: {
                _count: { select: { attendances: true } }
            }
        });
    }

    findOne(id: string) {
        return this.prisma.meeting.findUnique({
            where: { id },
            include: {
                attendances: true
            }
        });
    }

    async update(id: string, data: any) {
        return this.prisma.meeting.update({
            where: { id },
            data
        });
    }

    async registerAttendance(meetingId: string, attendanceDto: AttendanceDto) {
        const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
        if (!meeting) throw new Error('Meeting not found');

        // Use extended timeout for transactions with many users
        const results = await this.prisma.$transaction(async (tx) => {
            const processedUsers: string[] = [];

            // Compatibility check: handle legacy userIds array if sent by older frontend
            const records = (attendanceDto as any).userIds
                ? (attendanceDto as any).userIds.map(id => ({ userId: id, points: meeting.points, requirements: [] }))
                : attendanceDto.records;

            console.log(`[RegisterAttendance] Processing ${records.length} records for Meeting ${meeting.title} (${meetingId})`);

            for (const record of records) {
                const { userId, points, requirements } = record;

                // DEBUG LOG
                console.log(`[RegisterAttendance] User: ${userId}, Received Points: ${points}, Reqs: ${requirements?.join(',')}`);

                const exists = await tx.attendance.findUnique({
                    where: { userId_meetingId: { userId, meetingId } }
                });

                if (!exists) {
                    // 1. Create Attendance Record
                    await tx.attendance.create({
                        data: {
                            userId,
                            meetingId,
                            status: 'PRESENT'
                        }
                    });

                    // 2. Determine Beneficiaries
                    let beneficiaries: string[] = [userId];

                    if (meeting.type === 'PARENTS') {
                        const children = await tx.user.findMany({
                            where: { parentId: userId }
                        });
                        if (children.length > 0) {
                            beneficiaries = children.map(c => c.id);
                        }
                    }

                    // 3. Award Points (using calculated points from frontend)
                    for (const targetId of beneficiaries) {
                        const pointsToAward = points > 0 ? points : meeting.points; // Fallback to meeting base points if 0

                        let reason = meeting.type === 'PARENTS' && targetId !== userId
                            ? `Presença do Responsável: ${meeting.title}`
                            : `Reunião: ${meeting.title}`;

                        if (requirements && requirements.length > 0) {
                            reason += ` (${requirements.join(', ')})`;
                        }

                        console.log(`[RegisterAttendance] Awarding ${pointsToAward} points to ${targetId} (Beneficiary of ${userId})`);

                        if (meeting.activityId) {
                            // Direct points update within transaction (faster)
                            // We ignore activity.points and use the calculated total
                            await tx.user.update({
                                where: { id: targetId },
                                data: {
                                    points: { increment: pointsToAward },
                                    pointsHistory: {
                                        create: {
                                            amount: pointsToAward,
                                            reason: reason,
                                            source: 'ACTIVITY'
                                        }
                                    }
                                }
                            });
                        } else {
                            // Legacy/Simple Mode
                            await tx.user.update({
                                where: { id: targetId },
                                data: {
                                    points: { increment: pointsToAward },
                                    pointsHistory: {
                                        create: {
                                            amount: pointsToAward,
                                            reason: reason,
                                            source: 'ATTENDANCE'
                                        }
                                    }
                                }
                            });
                        }
                    }

                    processedUsers.push(userId);
                }
            }
            return processedUsers;
        }, {
            maxWait: 30000,
            timeout: 60000
        });

        return { processed: results.length };
    }

    async importMeetings(file: Express.Multer.File, clubId: string) {
        console.log('--- Importing Meetings ---');
        console.log('Club ID:', clubId);
        if (!clubId) throw new Error('Club ID não fornecido');

        const XLSX = require('xlsx');
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);
        console.log(`Linhas encontradas: ${rows.length}`);

        const meetingsToCreate = rows.map((row: any, index: number) => {
            const rawDate = row['Data'] || row['Date'];
            let parsedDate = new Date(); // Default now

            if (rawDate) {
                if (typeof rawDate === 'string' && rawDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                    const [day, month, year] = rawDate.split('/');
                    parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
                }
                else if (typeof rawDate === 'number' || !isNaN(Number(rawDate))) {
                    const days = Number(rawDate);
                    // Excel serial date adjustment
                    parsedDate = new Date((days - 25569) * 86400 * 1000);
                }
                else {
                    parsedDate = new Date(rawDate);
                }
            }

            if (isNaN(parsedDate.getTime())) {
                console.warn(`Data inválida na linha ${index + 1}: ${rawDate}`);
                parsedDate = new Date();
            }

            return {
                title: row['Titulo'] || row['Título'] || row['Name'] || row['Nome'] || `Reunião Importada ${index + 1}`,
                date: parsedDate,
                type: row['Tipo'] || 'REGULAR',
                points: Number(row['Pontos']) || Number(row['Points']) || 10,
                clubId
            };
        });

        console.log(`Criando ${meetingsToCreate.length} reuniões no banco...`);
        return this.prisma.meeting.createMany({
            data: meetingsToCreate
        });
    }

    async importAttendance(meetingId: string, file: Express.Multer.File) {
        console.log('--- Importing Attendance ---');
        console.log('Meeting ID:', meetingId);

        const XLSX = require('xlsx');
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);
        console.log(`Linhas encontradas: ${rows.length}`);

        const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
        if (!meeting) throw new Error('Meeting not found');

        const results = {
            success: 0,
            skipped: 0,
            errors: [] as string[]
        };

        for (const [index, row] of (rows as any[]).entries()) {
            const identifier = row['Email'] || row['email'] || row['Nome'] || row['nome'] || row['Name'];
            if (!identifier) {
                console.warn(`Identificador ausente na linha ${index + 1}`);
                results.skipped++;
                continue;
            }

            try {
                // Find user by email or exact name (case insensitive)
                const user = await this.prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: identifier.toString().trim().toLowerCase() },
                            { name: { equals: identifier.toString().trim(), mode: 'insensitive' } }
                        ],
                        clubId: meeting.clubId
                    }
                });

                if (!user) {
                    console.warn(`Membro não encontrado: ${identifier}`);
                    results.errors.push(`Membro não encontrado na linha ${index + 1}: ${identifier}`);
                    continue;
                }

                // Register attendance using existing logic (points increment included)
                const attendance = await this.registerAttendance(meetingId, {
                    records: [{
                        userId: user.id,
                        points: meeting.points,
                        requirements: ['Importado via Excel']
                    }]
                });
                if (attendance.processed > 0) {
                    results.success++;
                } else {
                    results.skipped++;
                }
            } catch (error) {
                console.error(`Erro ao processar linha ${index + 1}:`, error);
                results.errors.push(`Erro na linha ${index + 1} (${identifier}): ${error.message}`);
            }
        }

        console.log(`Importação finalizada. Sucesso: ${results.success}, Erros: ${results.errors.length}`);
        return results;
    }

    async remove(id: string) {
        // Delete attendances first just in case (though cascade usually handles it)
        // Check Prisma Schema behavior if possible, but manual delete is safer for now if unsure
        const attendances = await this.prisma.attendance.deleteMany({
            where: { meetingId: id }
        });

        return this.prisma.meeting.delete({
            where: { id }
        });
    }
}
