
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { api } from '../lib/axios';
import { jwtDecode } from 'jwt-decode';
import { safeLocalStorage } from '../lib/storage';

interface User {
    id: string; // Backend ID
    uid?: string; // Firebase UID
    name: string;
    email: string;
    role: string;
    clubId?: string;
    dbvClass?: string;
    unit?: { name: string };
    unitId?: string;
    specialties?: any[];
    points?: number;
    mustChangePassword?: boolean;
    region?: string;
    district?: string;
    association?: string;
    union?: string;
    mission?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    signOut: () => Promise<void>; // Alias for logout
    refreshUser: () => Promise<void>; // Re-fetch user data
    isAuthenticated: boolean;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const checkBackendToken = async (firebaseUser: any) => {
        const token = safeLocalStorage.getItem('token');
        if (token) {
            try {
                // Decode token to get basic info
                const decoded: any = jwtDecode(token);

                // Fetch full data from backend to get the real Name and Hierarchy
                let backendData: any = {};
                try {
                    const res = await api.get(`/users/${decoded.userId || decoded.sub}`);
                    if (res.data) {
                        backendData = res.data;
                    }
                } catch (apiErr: any) {
                    // Expected error when user is not fully authenticated yet
                    if (apiErr.response?.status !== 401) {
                        console.warn("Could not fetch user profile from API:", apiErr);
                    }
                }

                setUser({
                    id: decoded.userId || decoded.sub,
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || decoded.email,
                    name: backendData.name || firebaseUser.displayName || 'Usuário',
                    role: decoded.role,
                    clubId: decoded.clubId,
                    unitId: decoded.unitId,
                    mustChangePassword: decoded.mustChangePassword,
                    // Hierarchy Data
                    union: backendData.union,
                    association: backendData.association,
                    mission: backendData.mission, // Alias
                    region: backendData.region,
                    district: backendData.district
                });
            } catch (e) {
                console.error("Invalid token:", e);
                // ... (error handling same as before)
                safeLocalStorage.removeItem('token');
                setUser({
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: firebaseUser.displayName || 'Usuário',
                    role: 'MEMBER'
                } as User);
            }
        } else {
            // ... (no token fallback same as before)
            try {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUser({
                        id: firebaseUser.uid,
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        name: userData.name || firebaseUser.displayName || 'Usuário',
                        role: userData.role || 'MEMBER',
                        ...userData
                    } as User);
                } else {
                    // ...
                    setUser({
                        id: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        name: firebaseUser.displayName || 'Usuário',
                        role: 'MEMBER'
                    } as User);
                }
            } catch (err) {
                setUser({
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: firebaseUser.displayName || '',
                    role: 'MEMBER'
                } as User);
            }
        }
        setLoading(false);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                await checkBackendToken(firebaseUser);
            } else {
                safeLocalStorage.removeItem('token'); // Clear token on logout
                setUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        console.log('[Login] Starting login flow for:', email);

        // 1. Firebase Login
        try {
            console.log('[Login] 1. Executing Firebase signInWithEmailAndPassword...');
            await signInWithEmailAndPassword(auth, email, password);
            console.log('[Login] 1. Firebase Login Success');
        } catch (firebaseErr) {
            console.error('[Login] 1. Firebase Login Failed:', firebaseErr);
            throw firebaseErr;
        }

        // 2. Backend Login (Get Access Token for API & Roles)
        try {
            console.log('[Login] 2. Requesting Backend Token...');
            const res = await api.post('/auth/login', { email, password });
            console.log('[Login] 2. Backend Response Received');
            const { access_token, user: backendUser } = res.data;

            if (access_token) {
                safeLocalStorage.setItem('token', access_token);
                console.log('[Login] 3. Token stored');

                // SYNC FIRESTORE: Background task, non-blocking
                const userRef = doc(db, 'users', auth.currentUser?.uid || backendUser.id);
                setDoc(userRef, {
                    role: backendUser.role,
                    clubId: backendUser.clubId || null,
                    unitId: backendUser.unitId || null,
                    email: backendUser.email
                }, { merge: true })
                    .then(() => console.log('[Login] 4. Firestore Sync Success (Background)'))
                    .catch(e => console.warn('[Login] 4. Firestore Sync Failed (Non-critical):', e));

                console.log('[Login] 5. Setting User State...');
                setUser({
                    id: backendUser.id,
                    uid: auth.currentUser?.uid,
                    name: backendUser.name,
                    email: backendUser.email,
                    role: backendUser.role,
                    clubId: backendUser.clubId,
                    unitId: backendUser.unitId,
                    mustChangePassword: backendUser.mustChangePassword
                });
                console.log('[Login] 6. Login Complete');
            }
        } catch (error: any) {
            console.error("Backend login failed.", error);

            // Catch 401/404 specifically
            const isUserNotFound = error.response?.status === 401 || error.response?.status === 404;

            if (isUserNotFound && auth.currentUser) {
                // Try SYNC (Auto-Link)
                try {
                    console.log('[Login] 2b. Attempting Firebase Sync...');
                    const idToken = await auth.currentUser.getIdToken();
                    const syncRes = await api.post('/auth/sync', { idToken });

                    if (syncRes.data?.access_token) {
                        console.log('[Login] 2b. Sync Success!');
                        const { access_token, user: backendUser } = syncRes.data;
                        safeLocalStorage.setItem('token', access_token);

                        setUser({
                            id: backendUser.id,
                            uid: auth.currentUser.uid,
                            name: backendUser.name,
                            email: backendUser.email,
                            role: backendUser.role,
                            clubId: backendUser.clubId,
                            unitId: backendUser.unitId,
                            mustChangePassword: backendUser.mustChangePassword
                        });
                        return; // Successfully recovered!
                    }
                } catch (syncErr) {
                    console.warn("Sync failed:", syncErr);
                    // Fallthrough to original error
                }

                // If sync failed or didn't return token (User truly doesn't exist)
                throw new Error('CONTA_INCOMPLETA');
            }

            await signOut(auth);
            throw new Error(error.response?.data?.message || 'Falha na autenticação com o servidor. Verifique seu login.');
        }
    };

    const logout = async () => {
        await signOut(auth);
        safeLocalStorage.removeItem('token');
        setUser(null);
    };

    const refreshUser = async () => {
        if (auth.currentUser) {
            // 1. Update decoded user state
            await checkBackendToken(auth.currentUser);

            // 2. Request new Token with updated claims (Hierarchy, etc)
            try {
                const res = await api.get('/auth/refresh');
                if (res.data?.access_token) {
                    safeLocalStorage.setItem('token', res.data.access_token);
                    console.log('[Auth] Token refreshed successfully');
                }
            } catch (err) {
                console.warn('[Auth] Token refresh failed:', err);
            }
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
            signOut: logout,
            refreshUser,
            isAuthenticated: !!user,
            setUser
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
