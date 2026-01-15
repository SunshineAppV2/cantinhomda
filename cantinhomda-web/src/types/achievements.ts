
export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'PARTICIPATION' | 'SKILL' | 'SPECIAL';
    points: number;
}

export interface UserAchievement {
    id: string;
    userId: string;
    achievementId: string;
    assignedAt: string;
}
