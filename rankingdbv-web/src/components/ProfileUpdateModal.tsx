import { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/axios';
import { HierarchySelector } from './HierarchySelector';

interface ProfileUpdateModalProps {
    user: any;
    club: any;
    onUpdate: () => void;
}

export function ProfileUpdateModal({ user, club, onUpdate }: ProfileUpdateModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        mobile: user?.mobile || '',
        phone: user?.phone || '',
        union: club?.union || '',
        mission: club?.mission || '',
        region: club?.region || '',
        district: club?.district || ''
    });

    const isFormValid = () => {
        return (
            formData.name &&
            formData.mobile &&
            formData.union &&
            formData.mission &&
            formData.region
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFormValid()) {
            toast.error('Preencha todos os campos obrigatórios');
            return;
        }

        setLoading(true);

        try {
            // Update user profile
            await api.put(`/users/${user.id}`, {
                name: formData.name,
                mobile: formData.mobile,
                phone: formData.phone
            });

            // Update club hierarchy
            if (club?.id) {
                await api.put(`/clubs/${club.id}`, {
                    union: formData.union,
                    mission: formData.mission,
                    region: formData.region,
                    district: formData.district
                });
            }

            toast.success('Perfil atualizado com sucesso!');
            onUpdate();
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast.error(error.response?.data?.message || 'Erro ao atualizar perfil');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">Complete seu Perfil</h2>
                            <p className="text-blue-100 mt-1">
                                Por favor, atualize seus dados antes de continuar
                            </p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-yellow-300" />
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Alert */}
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                        <div className="flex items-start">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                            <div className="text-sm text-yellow-800">
                                <p className="font-semibold">Atualização Obrigatória</p>
                                <p className="mt-1">
                                    Você precisa preencher todos os campos marcados com * para acessar o sistema.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Personal Data */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                            Dados Pessoais
                        </h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome Completo *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    WhatsApp *
                                </label>
                                <input
                                    type="tel"
                                    value={formData.mobile}
                                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                    placeholder="(91) 98329-2005"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Telefone Fixo
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="(91) 3225-5678"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Club Hierarchy */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                            Dados Hierárquicos do Clube
                        </h3>

                        <HierarchySelector
                            value={{
                                union: formData.union,
                                mission: formData.mission,
                                association: formData.mission, // Use mission as association
                                region: formData.region,
                                district: formData.district
                            }}
                            onChange={(hierarchyData) => {
                                setFormData({
                                    ...formData,
                                    union: hierarchyData.union || '',
                                    mission: hierarchyData.mission || hierarchyData.association || '',
                                    region: hierarchyData.region || '',
                                    district: hierarchyData.district || ''
                                });
                            }}
                            required={{
                                union: true,
                                mission: true,
                                region: true,
                                district: false
                            }}
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4 border-t">
                        <button
                            type="submit"
                            disabled={!isFormValid() || loading}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Salvar e Continuar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
