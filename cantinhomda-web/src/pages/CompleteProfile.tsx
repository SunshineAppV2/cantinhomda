import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HierarchySelector } from '../components/HierarchySelector';
import { api } from '../lib/axios';
import { toast } from 'sonner';
import { AlertCircle, LogOut } from 'lucide-react';

export function CompleteProfile() {
    const { user, signOut, refreshUser } = useAuth(); // Assuming refreshUser exists, otherwise we trigger it by other means
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [hierarchy, setHierarchy] = useState({
        union: '',
        association: '',
        mission: '',
        region: '',
        district: ''
    });

    useEffect(() => {
        if (user) {
            setHierarchy({
                union: user.union || '',
                association: user.association || user.mission || '',
                mission: user.mission || user.association || '',
                region: user.region || '',
                district: user.district || ''
            });
        }
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!hierarchy.union || !hierarchy.association || !hierarchy.region) {
                toast.error('Por favor, preencha União, Associação/Missão e Região.');
                setLoading(false);
                return;
            }

            if (user?.role === 'COORDINATOR_DISTRICT' && !hierarchy.district) {
                toast.error('Coordenadores Distritais precisam informar o Distrito.');
                setLoading(false);
                return;
            }

            if (user?.role === 'COORDINATOR_REGIONAL' && (!hierarchy.region || !hierarchy.association)) {
                toast.error('Coordenadores Regionais precisam informar União, Associação e Região.');
                setLoading(false);
                return;
            }

            // Update Backend
            // Use 'me' if user.id is missing to leverage backend alias resolution
            const targetId = user?.id || 'me';
            console.log('Updating Profile for:', targetId);

            await api.patch(`/users/${targetId}`, {
                union: hierarchy.union,
                association: hierarchy.association,
                mission: hierarchy.association, // Synced
                region: hierarchy.region,
                district: hierarchy.district
            });

            // Trigger context refresh
            await refreshUser();

            toast.success('Perfil atualizado com sucesso!');
            navigate('/dashboard');

        } catch (error) {
            console.error(error);
            toast.error('Erro ao atualizar perfil.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6 text-amber-600">
                    <AlertCircle className="w-8 h-8" />
                    <h1 className="text-2xl font-bold text-slate-800">Complete seu Perfil</h1>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-800">
                    <p>Olá, <b>{user?.name}</b>!</p>
                    <p className="mt-1">
                        Para acessar o painel de <b>{user?.role === 'COORDINATOR_REGIONAL' ? 'Coordenação Regional' : 'Coordenação Distrital'}</b>,
                        precisamos que você atualize seus dados hierárquicos (União, Associação, Região{user?.role === 'COORDINATOR_DISTRICT' ? ' e Distrito' : ''}).
                    </p>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <HierarchySelector
                        value={hierarchy}
                        onChange={setHierarchy}
                    />

                    <div className="flex flex-col gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? 'Salvando...' : 'Salvar e Acessar Painel'}
                        </button>

                        <button
                            type="button"
                            onClick={() => signOut()}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Sair da Conta
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
