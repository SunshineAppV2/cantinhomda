
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { updatePassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { api } from '../lib/axios';
import { toast } from 'sonner';
import { Lock, Save } from 'lucide-react';

export function ChangePassword() {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) return toast.error('A senha deve ter no mínimo 6 caracteres.');
        if (password !== confirmPassword) return toast.error('As senhas não coincidem.');

        setLoading(true);
        try {
            // 1. Update Firebase Password
            if (auth.currentUser) {
                await updatePassword(auth.currentUser, password);
            } else {
                throw new Error('Usuário não autenticado no Firebase.');
            }

            // 2. Update Backend Flag
            await api.patch(`/users/${user?.id}`, {
                mustChangePassword: false,
                // We also send password to backend to keep sync, although UsersService syncs to firebase too.
                // But mainly to clear the flag.
                password: password
            });

            // 3. Update Local State
            setUser(user ? { ...user, mustChangePassword: false } : null);

            toast.success('Senha alterada com sucesso!');
            navigate('/dashboard');

        } catch (error: any) {
            console.error(error);
            // Handle "requires-recent-login" if necessary
            if (error.code === 'auth/requires-recent-login') {
                toast.error('Por favor, saia e entre novamente para trocar a senha.');
                navigate('/login');
            } else {
                toast.error('Erro ao alterar senha: ' + (error.message || 'Erro desconhecido'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-200">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Troca de Senha Obrigatória</h1>
                    <p className="text-slate-500 mt-2">Sua senha é temporária. Por segurança, defina uma nova senha para continuar.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500 outline-none"
                            placeholder="Mínimo 6 caracteres"
                            required
                            minLength={6}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Senha</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500 outline-none"
                            placeholder="Repita a senha"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? 'Salvando...' : <><Save className="w-5 h-5" /> Salvar Nova Senha</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
