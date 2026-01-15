
export class CreateAchievementDto {
    name: string;
    description: string;
    icon: string; // Lucide icon name usually
    category: 'PARTICIPATION' | 'SKILL' | 'SPECIAL';
    points?: number;
}
