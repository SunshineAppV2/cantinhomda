
import { useState, useEffect } from 'react';
import { api } from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Search, Pencil, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export function SystemUsers() {
    const { user } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<any | null>(null);

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, clubsRes] = await Promise.all([
                api.get('/users'),
                api.get('/clubs')
            ]);
            setUsers(usersRes.data);
            setClubs(clubsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Erro ao carregar dados.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'MASTER' || user?.role === 'OWNER' || user?.email === 'master@cantinhomda.com') {
            fetchData();
        }
    }, [user]);

    // Permissions Check
    if (user?.role !== 'MASTER' && user?.role !== 'OWNER' && user?.email !== 'master@cantinhomda.com') {
        return <div className="p-8 text-center text-red-500 font-bold">Acesso Negado. Apenas Master/Owner.</div>;
    }

    // Filter Logic
    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.club?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 100); // Limit display for performance

    // Handlers


    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            await api.patch(`/users/${editingUser.id}`, {
                name: editingUser.name,
                email: editingUser.email,
                role: editingUser.role,
                status: editingUser.status,
                clubId: editingUser.clubId,
                region: editingUser.region,
                district: editingUser.district,
                mission: editingUser.mission,
                association: editingUser.association,
                union: editingUser.union
            });
            toast.success('Usuário atualizado!');
            setEditingUser(null);
            fetchData();
        } catch (error) {
            toast.error('Erro ao atualizar usuário.');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gestão Global de Usuários</h1>
                    <p className="text-slate-500">Visualize e edite qualquer usuário do sistema.</p>
                </div>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                    {users.length} Registros (Exibindo Top 100)
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, email ou clube..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <button onClick={fetchData} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">
                    Atualizar Lista
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 uppercase text-xs text-slate-500">
                            <tr>
                                <th className="p-4">Nome / Email</th>
                                <th className="p-4">Clube</th>
                                <th className="p-4">Cargo</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800">{u.name}</div>
                                        <div className="text-xs text-slate-500">{u.email}</div>
                                    </td>
                                    <td className="p-4">
                                        {u.club?.name || <span className="text-slate-400 italic">Sem Clube</span>}
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-semibold">{u.role}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                            u.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {u.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => setEditingUser(u)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                            title="Editar"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            // onClick={() => handleResetPassword(u.id, u.name)}
                                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded cursor-not-allowed opacity-50"
                                            title="Resetar Senha (Em Breve)"
                                        >
                                            <KeyRound className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum usuário encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95">
                        <h3 className="text-lg font-bold mb-4">Editar Usuário</h3>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome</label>
                                <input
                                    value={editingUser.name}
                                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                    className="w-full border rounded p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
                                <input
                                    value={editingUser.email}
                                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                                    className="w-full border rounded p-2 bg-slate-50"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cargo (Role)</label>
                                    <select
                                        value={editingUser.role}
                                        onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                                        className="w-full border rounded p-2"
                                    >
                                        {['PATHFINDER', 'INSTRUCTOR', 'COUNSELOR', 'DIRECTOR', 'ADMIN', 'OWNER', 'SECRETARY', 'TREASURER', 'COORDINATOR_AREA', 'COORDINATOR_DISTRICT', 'COORDINATOR_REGIONAL', 'MASTER'].map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status</label>
                                    <select
                                        value={editingUser.status}
                                        onChange={e => setEditingUser({ ...editingUser, status: e.target.value })}
                                        className="w-full border rounded p-2"
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="PENDING">PENDING</option>
                                        <option value="BLOCKED">BLOCKED</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Clube</label>
                                <select
                                    value={editingUser.clubId || ''}
                                    onChange={e => setEditingUser({ ...editingUser, clubId: e.target.value || null })}
                                    className="w-full border rounded p-2 bg-white"
                                >
                                    <option value="">Sem Clube</option>
                                    {clubs.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="border-t pt-4 mt-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Hierarquia (Coordenação)</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">União</label>
                                        <input
                                            value={editingUser.union || ''}
                                            onChange={e => setEditingUser({ ...editingUser, union: e.target.value })}
                                            className="w-full border rounded p-1.5 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Associação/Missão</label>
                                        <input
                                            value={editingUser.association || editingUser.mission || ''}
                                            onChange={e => setEditingUser({ ...editingUser, association: e.target.value, mission: e.target.value })}
                                            className="w-full border rounded p-1.5 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Região</label>
                                        <input
                                            value={editingUser.region || ''}
                                            onChange={e => setEditingUser({ ...editingUser, region: e.target.value })}
                                            className="w-full border rounded p-1.5 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Distrito</label>
                                        <input
                                            value={editingUser.district || ''}
                                            onChange={e => setEditingUser({ ...editingUser, district: e.target.value })}
                                            className="w-full border rounded p-1.5 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Salvar Alterações</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SystemUsers;
