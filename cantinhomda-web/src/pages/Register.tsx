import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TermsModal } from '../components/TermsModal';
import { UserPlus, Mail, Lock, User, ArrowRight, Home, Users, Award, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { HierarchySelector } from '../components/HierarchySelector';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface Club {
    id: string;
    name: string;
}

interface Unit {
    id: string;
    name: string;
}

interface Unit {
    id: string;
    name: string;
}

type RegistrationMode = 'JOIN' | 'CREATE';

export function Register() {
    const navigate = useNavigate();
    // We don't need login function needed here necessarily if we just redirect, 
    // but AuthContext usually auto-logins on firebase creation.
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<RegistrationMode>('CREATE');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTerms, setShowTerms] = useState(false);

    // Common Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mobile, setMobile] = useState(''); // WhatsApp/Mobile
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    // Join Mode State
    const [clubId, setClubId] = useState('');
    const [unitId, setUnitId] = useState('');
    const [role, setRole] = useState('PATHFINDER');
    const [clubs, setClubs] = useState<Club[]>([]);
    const [referralCode, setReferralCode] = useState('');

    // Create Mode State
    const [clubName, setClubName] = useState('');
    const [region, setRegion] = useState('');
    const [district, setDistrict] = useState('');
    const [mission, setMission] = useState('');
    const [union, setUnion] = useState('');

    // Units State
    const [units, setUnits] = useState<Unit[]>([]);
    const [inviteClubName, setInviteClubName] = useState('');

    // New Fields
    const [cpf, setCpf] = useState('');
    const [paymentPeriod, setPaymentPeriod] = useState('MENSAL');
    const [clubSize, setClubSize] = useState('30'); // Default to min tier

    const [searchParams] = useSearchParams();

    // Fetch Clubs - Runs ONCE on mount
    useEffect(() => {
        const fetchClubs = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'clubs'));
                const clubsList: Club[] = [];
                querySnapshot.forEach((doc) => {
                    clubsList.push({ id: doc.id, ...doc.data() } as Club);
                });
                setClubs(clubsList);
            } catch (err) {
                console.error('Error fetching clubs from Firestore:', err);
            }
        };

        fetchClubs();
    }, []);

    // Handle Invite Link & URL Params
    useEffect(() => {
        const checkInvite = async () => {
            const inviteClubId = searchParams.get('clubId') || searchParams.get('clubid') || searchParams.get('clubID');
            const urlClubName = searchParams.get('clubName') || searchParams.get('clubname') || searchParams.get('clubNAME');

            if (inviteClubId) {
                setMode('JOIN');
                setClubId(inviteClubId);

                // If name is already in URL, use it immediately
                if (urlClubName) {
                    setInviteClubName(urlClubName);
                }

                // 1. Try to find in the already loaded list
                if (clubs.length > 0) {
                    const foundClub = clubs.find(c => String(c.id) === String(inviteClubId));
                    if (foundClub) {
                        setInviteClubName(foundClub.name);
                        console.log('Invite club found in loaded list:', foundClub.name);
                        return;
                    }
                }

                // 2. Fallback: Fetch directly from Firestore
                try {
                    const clubDoc = await getDoc(doc(db, 'clubs', inviteClubId));
                    if (clubDoc.exists()) {
                        const data = clubDoc.data();
                        setInviteClubName(data.name);
                        console.log('Invite club fetched by DocID:', data.name);
                        return;
                    }

                    // 3. Last Resort: Query in case the ID is a field and not the DocID
                    console.log('Searching by query for:', inviteClubId);
                    const q = query(collection(db, 'clubs'), where('id', '==', inviteClubId));
                    const qSnapshot = await getDocs(q);
                    if (!qSnapshot.empty) {
                        const data = qSnapshot.docs[0].data();
                        setInviteClubName(data.name);
                        console.log('Invite club found by Query:', data.name);
                        return;
                    }

                    console.warn('Invite club not found in any Firestore method:', inviteClubId);
                } catch (err) {
                    console.error('Error fetching invite club details:', err);
                }
            }
        };

        checkInvite();

        // Other Params (moved outside async to be immediate)
        const urlEmail = searchParams.get('email');
        if (urlEmail) {
            setEmail(urlEmail);
        }

        const isResume = searchParams.get('resume');
        if (isResume) {
            toast.info('Complete o nome do seu Clube para ativar sua conta.');
            setMode('CREATE');
        }

        const refCode = searchParams.get('ref');
        if (refCode) {
            setReferralCode(refCode);
            setMode('CREATE');
            toast.success('Código de indicação aplicado com sucesso!');
        }

        // Auto-fill mobile if present (unlikely but good for consistency)
        const urlMobile = searchParams.get('mobile');
        if (urlMobile) setMobile(urlMobile);

    }, [searchParams, clubs]);

    // Fetch Units when Club changes
    useEffect(() => {
        const fetchUnits = async () => {
            if (mode === 'JOIN' && clubId) {
                try {
                    const q = query(collection(db, 'units'), where('clubId', '==', clubId));
                    const querySnapshot = await getDocs(q);
                    const unitsList: Unit[] = [];
                    querySnapshot.forEach((doc) => {
                        unitsList.push({ id: doc.id, ...doc.data() } as Unit);
                    });
                    setUnits(unitsList);
                } catch (err) {
                    console.error('Error fetching units:', err);
                }
            } else {
                setUnits([]);
                setUnitId('');
            }
        };
        fetchUnits();
    }, [clubId, mode]);


    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        // DEBUG: Verify Config
        console.log('[Register] Checking Config...');
        const configDebug = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? 'Present' : 'MISSING',
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : 'MISSING',
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? 'Present' : 'MISSING',
        };
        console.log('[Register] Firebase Config State:', configDebug);

        if (configDebug.apiKey === 'MISSING') {
            toast.error('Erro de Configuração: API Key do Firebase não encontrada. Verifique o arquivo .env');
            return;
        }

        if (!termsAccepted) {
            setShowTerms(true);
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Validation
            if (mode === 'JOIN') {
                if (!clubId) throw new Error('Selecione um Clube.');
                if (!role) throw new Error('Selecione sua função.');
            } else {
                if (!clubName) throw new Error('Digite o nome do seu Clube.');
                if (!region || !mission || !union || !district) throw new Error('Preencha todos os dados hierárquicos (União, Associação, Região e Distrito).');
            }

            if (!mobile) throw new Error('O WhatsApp (Celular) é obrigatório.');
            if (!termsAccepted) throw new Error('Você precisa aceitar os Termos de Uso.');

            let user;
            try {
                // 1. Attempt to Create Authentication User
                console.log('[Register] Step 1: Creating Firebase User...');
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                user = userCredential.user;
                console.log('[Register] Step 1 Success: Firebase User Created');
            } catch (authErr: any) {
                // If user already exists, try to sign in to resume flow
                if (authErr.code === 'auth/email-already-in-use') {
                    console.log('[Register] Step 1 Note: Email exists, attempting sign-in as fallback...');
                    try {
                        const { signInWithEmailAndPassword } = await import('firebase/auth');
                        const userCredential = await signInWithEmailAndPassword(auth, email, password);
                        user = userCredential.user;
                        console.log('[Register] Step 1 Success: Signed in existing user');
                    } catch (signInErr) {
                        console.error('[Register] Step 1 Error: Sign-in failed', signInErr);
                        throw new Error('Este email já está cadastrado com outra senha. Tente fazer login ou use outro email.');
                    }
                } else {
                    console.error('[Register] Step 1 Error: Create user failed', authErr);
                    throw authErr;
                }
            }

            if (!user) throw new Error('Falha na autenticação.');

            // Update Display Name
            console.log('[Register] Step 2: Updating user profile name...');
            await updateProfile(user, { displayName: name });

            let finalClubId = clubId;
            let finalRole = role;

            // 2. If Creating Club, create it in Firestore first (Legacy)
            if (mode === 'CREATE') {
                console.log('[Register] Step 3: (Background) Creating Club in Firestore...');
                addDoc(collection(db, 'clubs'), {
                    name: clubName,
                    region,
                    district,
                    mission,
                    union,
                    ownerId: user.uid,
                    createdAt: new Date().toISOString()
                }).then(clubRef => {
                    console.log('[Register] Step 3 Success (BG): Club created in Firestore:', clubRef.id);
                }).catch(fsErr => {
                    console.warn('[Register] Step 3 Warning (BG): Failed to create legacy club record.', fsErr);
                });

                finalRole = 'OWNER';
                // finalClubId will be empty here, but backend handles creation in step 5
            }

            // 3. Create User Profile in Firestore (Legacy/Stats)
            console.log('[Register] Step 4: (Background) Syncing User Profile to Firestore...');
            setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                name,
                email,
                mobile, // Save to Firestore profile
                role: finalRole,
                clubId: finalClubId,
                unitId: (mode === 'JOIN' && unitId) ? unitId : null,
                createdAt: new Date().toISOString()
            }, { merge: true }).then(() => {
                console.log('[Register] Step 4 Success (BG): User sync complete');
            }).catch(fsUserErr => {
                console.warn('[Register] Step 4 Warning (BG): Failed to sync legacy user record.', fsUserErr);
            });

            // 4. Register in Backend (PostgreSQL) - CRITICAL FOR LOGIN
            try {
                console.log('[Register] Step 5: Registering in Backend (Postgres)...');
                const registerPayload = {
                    email,
                    password,
                    name,
                    role: finalRole,
                    clubId: (mode === 'JOIN') ? clubId : undefined,
                    unitId: (mode === 'JOIN' && unitId) ? unitId : undefined,
                    clubName: (mode === 'CREATE') ? clubName : undefined,
                    region: (mode === 'CREATE') ? region : undefined,
                    district: (mode === 'CREATE') ? district : undefined,
                    mission: (mode === 'CREATE') ? mission : undefined,
                    union: (mode === 'CREATE') ? union : undefined,
                    referralCode: (mode === 'CREATE') ? referralCode : undefined,
                    mobile, // Send to backend
                    cpf,
                    paymentPeriod: (mode === 'CREATE') ? paymentPeriod : undefined,
                    clubSize: (mode === 'CREATE') ? clubSize : undefined
                };

                // --- STEP 5: SYNC WITH BACKEND ---
                console.log('[Register] Step 5: Syncing with Backend...');

                let token = null;
                if (auth.currentUser) {
                    console.log('[Register] Step 5: Forcing token refresh...');
                    token = await auth.currentUser.getIdToken(true);
                }

                const { api } = await import('../lib/axios');

                // Explicitly set headers to bypass any interceptor issues during registration
                const config = {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                };

                console.log('[Register] Step 5: Sending request to Postgres backend...');
                const res = await api.post('/auth/register', registerPayload, config);

                // ===== SUCCESS RESPONSE =====
                // Backend returns { success: true, message: '...', user: {...} } for PENDING users
                if (res.data && res.data.success) {
                    console.log('[Register] ✅ Registration successful!');
                    toast.success('Cadastro realizado com sucesso!', {
                        description: 'Aguarde a aprovação da diretoria para acessar o sistema.',
                        duration: 8000,
                    });
                    navigate('/registration-success', {
                        state: {
                            clubName,
                            ownerName: name,
                            region,
                            mission,
                            union,
                            mobile,
                            isNewClub: mode === 'CREATE',
                            paymentPeriod,
                            clubSize
                        }
                    });
                    return;
                }

                // Fallback: If we got here without explicit success, something is wrong
                console.warn('[Register] ⚠️ Unexpected response format:', res.data);
                toast.error('Resposta inesperada do servidor.');

            } catch (backendErr: any) {
                console.error("[Register] Step 5 Error: Backend registration failed:", backendErr);

                // ===== HANDLE SPECIFIC ERROR CODES =====
                const status = backendErr.response?.status;
                const message = backendErr.response?.data?.message;

                if (status === 409) {
                    // Conflict - User already exists
                    const msg = message || 'Este e-mail já está cadastrado no sistema.';
                    toast.error(msg);
                    setError(msg);
                } else if (status === 403) {
                    // Forbidden - Plan limit or access issue
                    const msg = message || 'Ação não permitida.';
                    toast.error(msg);
                    setError(msg);
                } else if (status === 400) {
                    // Bad Request - Validation error
                    const msg = message || 'Dados inválidos. Verifique os campos e tente novamente.';
                    toast.error(msg);
                    setError(msg);
                } else {
                    // Generic error
                    const msg = message || 'Erro ao sincronizar com o servidor.';
                    toast.error(msg);
                    setError(msg);
                }
            }

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/weak-password') {
                setError('A senha deve ter pelo menos 6 caracteres.');
            } else {
                // Try to get message from axios response if it was rethrown without processing
                const msg = err.response?.data?.message || err.message || 'Erro ao criar conta.';
                setError(msg);
                toast.error(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden my-8" translate="no">
            <div className="bg-green-600 p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative z-10">
                    <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                        <UserPlus className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Criar Conta</h1>
                    <p className="text-green-100">Junte-se ao Cantinho DBV</p>
                </div>
            </div>



            <div className="p-8">
                <form onSubmit={handleRegister} className="space-y-5">
                    {error && (
                        <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                            <span className="font-bold">Erro:</span> {error}
                        </div>
                    )}

                    {/* Common Fields */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                placeholder="Seu Nome"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                placeholder="seu@email.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-10 pr-12 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp (Celular)</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </div>
                            <input
                                type="tel"
                                required
                                value={mobile}
                                onChange={e => {
                                    setMobile(e.target.value);
                                }}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                placeholder="55 (DDD) 9xxxx-xxxx"
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Obrigatório para contato da coordenação</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">CPF (Opcional)</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                                #
                            </div>
                            <input
                                type="text"
                                value={cpf}
                                onChange={e => {
                                    // Simple mask
                                    let v = e.target.value.replace(/\D/g, '');
                                    if (v.length > 11) v = v.slice(0, 11);
                                    v = v.replace(/(\d{3})(\d)/, '$1.$2');
                                    v = v.replace(/(\d{3})(\d)/, '$1.$2');
                                    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                                    setCpf(v);
                                }}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                placeholder="000.000.000-00"
                            />
                        </div>
                    </div>

                    {/* SEPARATOR */}
                    <div className="border-t border-slate-100 my-4"></div>

                    {mode === 'JOIN' ? (
                        <>
                            {inviteClubName ? (
                                <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4 flex items-start gap-3">
                                    <div className="bg-green-100 p-2 rounded-full">
                                        <Award className="w-6 h-6 text-green-700" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-green-800 font-bold">Convite Especial</p>
                                        <p className="text-sm text-green-700">
                                            Você está se cadastrando no clube <span className="font-bold underline">{inviteClubName}</span>.
                                        </p>
                                        <p className="text-xs text-green-600 mt-1">Seu cadastro passará por aprovação da diretoria.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mb-2">
                                    <p>Selecione o clube que você participa.</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Clube</label>
                                <div className="relative">
                                    <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    {inviteClubName ? (
                                        <input
                                            type="text"
                                            value={inviteClubName}
                                            readOnly
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 outline-none cursor-not-allowed font-medium"
                                        />
                                    ) : (
                                        <select
                                            required
                                            value={clubId}
                                            onChange={e => setClubId(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                                        >
                                            <option value="">Selecione seu Clube</option>
                                            {clubs.map(club => (
                                                <option key={club.id} value={club.id}>{club.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Unidade (Opcional)</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <select
                                        value={unitId}
                                        onChange={e => setUnitId(e.target.value)}
                                        disabled={!clubId}
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        <option value="">Selecione sua Unidade</option>
                                        {units.map(unit => (
                                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                                <select
                                    required
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                                >
                                    <option value="PATHFINDER">Desbravador</option>
                                    <option value="ADMIN">Diretoria</option>
                                    <option value="PARENT">Pais/Responsável</option>
                                </select>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800 mb-2">
                                <p>Você será o <b>Diretor/Admin</b> deste novo clube.</p>
                            </div>



                            {/* HIERARCHY SELECTOR */}
                            <HierarchySelector
                                value={{
                                    union,
                                    association: mission,
                                    mission,
                                    region,
                                    district
                                }}
                                onChange={(val) => {
                                    setUnion(val.union);
                                    setMission(val.association);
                                    setRegion(val.region);
                                    setDistrict(val.district);
                                }}
                            />

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Clube</label>
                                <div className="relative">
                                    <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        required
                                        value={clubName}
                                        onChange={e => setClubName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                        placeholder="Ex: Clube Águias"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Forma de Pagamento</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type='button'
                                        onClick={() => setPaymentPeriod('MENSAL')}
                                        className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${paymentPeriod === 'MENSAL' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                    >
                                        Mensal
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => setPaymentPeriod('TRIMESTRAL')}
                                        className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${paymentPeriod === 'TRIMESTRAL' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                    >
                                        Trimestral
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => setPaymentPeriod('ANUAL')}
                                        className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${paymentPeriod === 'ANUAL' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                    >
                                        Anual
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    {paymentPeriod === 'MENSAL' && 'Renovação todo mês.'}
                                    {paymentPeriod === 'TRIMESTRAL' && 'Renovação a cada 3 meses.'}
                                    {paymentPeriod === 'ANUAL' && 'Renovação uma vez por ano.'}
                                </p>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade de Acessos (Membros)</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="number"
                                        min="1"
                                        value={clubSize}
                                        onChange={e => setClubSize(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                        placeholder="Ex: 30"
                                    />
                                </div>

                                {/* Price Calculator */}
                                {clubSize && !isNaN(Number(clubSize)) && (
                                    <div className="mt-2 p-3 bg-green-50 border border-green-100 rounded-lg flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                                        <span className="text-sm text-green-800">Valor do Plano:</span>
                                        <div className="text-right">
                                            <span className="block text-lg font-bold text-green-700">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                    Number(clubSize) * 2 * (
                                                        paymentPeriod === 'TRIMESTRAL' ? 3 :
                                                            paymentPeriod === 'ANUAL' ? 12 : 1
                                                    )
                                                )}
                                            </span>
                                            <span className="text-[10px] text-green-600 font-medium">
                                                ({paymentPeriod === 'MENSAL' ? 'Mensal' : paymentPeriod === 'TRIMESTRAL' ? 'Trimestral' : 'Anual'})
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <p className="text-xs text-slate-500 mt-1">Custo de <b>R$ 2,00</b> por membro/mês.</p>
                            </div>
                        </>
                    )}

                    {/* REFERRAL BANNER */}
                    {referralCode && mode === 'CREATE' && (
                        <div className="bg-gradient-to-r from-purple-100 to-indigo-100 border border-indigo-200 p-4 rounded-lg my-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                            <div className="bg-white p-2 rounded-full shadow-sm">
                                <Award className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-indigo-900">Indicação Aplicada!</p>
                                <p className="text-xs text-indigo-700">Você foi indicado por um parceiro oficial. Seu clube terá prioridade na aprovação.</p>
                            </div>
                        </div>
                    )}


                    <div className="flex items-start gap-3 pt-2">
                        <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={e => setTermsAccepted(e.target.checked)}
                            className="mt-1 w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500"
                            id="terms"
                        />
                        <label htmlFor="terms" className="text-sm text-slate-600">
                            Li e concordo com os{' '}
                            <button type="button" onClick={() => setShowTerms(true)} className="text-blue-600 font-bold hover:underline">
                                Termos de Uso e Privacidade
                            </button>
                            {' '}do Cantinho DBV.
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                    >
                        {loading ? (
                            <span>Processando...</span>
                        ) : (
                            <>
                                <span>{mode === 'CREATE' ? 'Criar Clube e Conta' : 'Solicitar Entrada'}</span>
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-600">
                    Já tem uma conta?{' '}
                    <Link to="/login" className="text-green-600 hover:text-green-700 font-semibold hover:underline">
                        Fazer Login
                    </Link>
                </div>
            </div >
            <TermsModal
                isOpen={showTerms}
                onClose={() => setShowTerms(false)}
                onAccept={() => setTermsAccepted(true)}
            />
        </div >
    );
}
