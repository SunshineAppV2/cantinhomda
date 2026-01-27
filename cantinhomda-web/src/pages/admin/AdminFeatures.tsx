import { useState, useEffect } from 'react';
import { systemSettingsService } from '../../services/systemSettings';
import { Switch } from '@headlessui/react';
import { toast } from 'sonner';

const FEATURES = [
    { key: 'FEATURE_SPIRITUAL_MODULE', label: 'Módulo Espiritual (Ano Bíblico)', description: 'Habilita planos de leitura e quizzes.' },
    { key: 'FEATURE_INVENTORY_MODULE', label: 'Gestão de Patrimônio (Almoxarifado)', description: 'Controle de bens e empréstimos.' },
    { key: 'FEATURE_CATEGORIZED_RANKING', label: 'Ranking Categorizado', description: 'Permite pontuação por unidade e categorias específicas.' },
];

export function AdminFeatures() {
    const [settings, setSettings] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            const data = await systemSettingsService.getSettings();
            const settingsMap: Record<string, boolean> = {};
            data.forEach(s => {
                settingsMap[s.key] = s.value === 'true';
            });
            setSettings(settingsMap);
        } catch (error) {
            toast.error('Erro ao carregar configurações');
        } finally {
            setLoading(false);
        }
    }

    async function toggleFeature(key: string, currentValue: boolean) {
        const newValue = !currentValue;
        // Otimistic update
        setSettings(prev => ({ ...prev, [key]: newValue }));

        try {
            await systemSettingsService.updateSetting(key, String(newValue));
            toast.success('Configuração atualizada');
        } catch (error) {
            setSettings(prev => ({ ...prev, [key]: currentValue })); // Rollback
            toast.error('Erro ao salvar');
        }
    }

    if (loading) return <div className="p-8">Carregando...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Gerenciamento de Funcionalidades (Flags)</h1>
            <div className="bg-white rounded-lg shadow aspect-ratio-none p-6 space-y-6">
                {FEATURES.map(feature => (
                    <div key={feature.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <div>
                            <h3 className="font-semibold text-lg text-gray-900">{feature.label}</h3>
                            <p className="text-sm text-gray-500">{feature.description}</p>
                        </div>

                        <Switch
                            checked={settings[feature.key] || false}
                            onChange={() => toggleFeature(feature.key, settings[feature.key] || false)}
                            className={`${settings[feature.key] ? 'bg-blue-600' : 'bg-gray-200'
                                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                        >
                            <span
                                className={`${settings[feature.key] ? 'translate-x-6' : 'translate-x-1'
                                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                            />
                        </Switch>
                    </div>
                ))}
            </div>
        </div>
    );
}
