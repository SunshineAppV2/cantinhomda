import { api } from '../lib/axios';

export interface SystemSetting {
    id: string;
    key: string;
    value: string;
    updatedAt: string;
}

export const systemSettingsService = {
    getSettings: async () => {
        const response = await api.get<SystemSetting[]>('/system-settings');
        return response.data;
    },

    updateSetting: async (key: string, value: string) => {
        const response = await api.put<SystemSetting>(`/system-settings/${key}`, { value });
        return response.data;
    },
};
