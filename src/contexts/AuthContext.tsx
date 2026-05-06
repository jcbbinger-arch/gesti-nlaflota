import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs, deleteDoc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { User, Profile, SUPER_USER_EMAILS } from '../types';

interface AuthContextType {
  currentUser: User | null;
  selectedProfile: Profile | null;
  isImpersonating: boolean;
  isAuthReady: boolean;
  loginWithGoogle: () => Promise<string | null>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  registerWithEmail: (email: string, password: string, name: string, phone: string, allergens: string[]) => Promise<boolean>;
  logout: () => void;
  selectProfile: (profile: Profile) => void;
  impersonateUser: (user: User) => void;
  stopImpersonating: () => void;
  updateCurrentUser: (userData: Partial<User>) => void;
  isOwner: (userId?: string | null) => boolean;
  effectiveUserId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedProfile, setSelectedProfile] = useLocalStorage<Profile | null>('auth:profile', null);
  const [originalUser, setOriginalUser] = useLocalStorage<User | null>('auth:originalUser', null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isImpersonating = !!originalUser;

  useEffect(() => {
    if (currentUser && selectedProfile && !currentUser.profiles.includes(selectedProfile)) {
      console.log('Selected profile no longer valid for user, clearing:', selectedProfile);
      setSelectedProfile(null);
    }
  }, [currentUser, selectedProfile, setSelectedProfile]);

  // Helper function to handle user creation/matching logic
  const resolveOrSyncUser = async (firebaseUser: any) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    const userEmail = (firebaseUser.email || '').trim().toLowerCase();
    const isSuperUser = SUPER_USER_EMAILS.includes(userEmail);

    if (userDoc.exists()) {
      let userData = userDoc.data() as User;
      let needsUpdate = false;

      // Sanitize fields
      if (!Array.isArray(userData.profiles)) {
         userData.profiles = isSuperUser ? [Profile.CREATOR, Profile.ADMIN, Profile.TEACHER, Profile.ALMACEN, Profile.STUDENT] : []; // Do NOT default to TEACHER
         needsUpdate = true;
      }

      // Migration for users created before the change or with missing status
      if (!userData.activity_status && !isSuperUser) {
        userData.activity_status = 'De Baja';
        needsUpdate = true;
      }
      
      // Migration for users created before the change or with missing status
      if (!userData.activity_status && !isSuperUser) {
        userData.activity_status = 'De Baja';
        needsUpdate = true;
      }
      
      // Migration for users created before the change or with missing status
      if (!userData.activity_status && !isSuperUser) {
        userData.activity_status = 'De Baja';
        needsUpdate = true;
      }
      
      // Migration for users created before the change
      if (userData.profiles && userData.profiles.includes(Profile.STUDENT) && !userData.classroom_id && !isSuperUser) {
          // Keep as is, do not force TEACHER
      }
      // Ensure workspaceId exists
      if (!userData.workspaceId) {
        userData.workspaceId = firebaseUser.uid;
        needsUpdate = true;
      }
      // Ensure super users have admin role
      if (isSuperUser && userData.role !== 'admin') {
        userData.role = 'admin';
        needsUpdate = true;
      }
      // Ensure super users and fixed accounts are active
      if ((isSuperUser || userEmail === 'pablo.palazon@murciaeduca.es') && userData.activity_status !== 'Activo') {
        userData.activity_status = 'Activo';
        needsUpdate = true;
      }
      // Ensure super users have all profiles enabled
      if (isSuperUser) {
        console.log('AuthContext - Super user detected, ensuring all profiles are enabled:', userData.email);
        const allProfiles = Object.values(Profile);
        if (!userData.profiles || userData.profiles.length < allProfiles.length) {
            userData.profiles = allProfiles;
            needsUpdate = true;
        }
      }
      if (needsUpdate) {
        await setDoc(userDocRef, userData);
      }
      return userData;
    } else {
      // Create user if it doesn't exist, BUT first check if admin pre-created it based on email
      const usersQuery = query(collection(db, 'users'), where('email', '==', userEmail));
      const querySnapshot = await getDocs(usersQuery);

      if (!querySnapshot.empty) {
        // Find if any of the pre-created documents has a temporary ID (like 'user-171...')
        const oldUserDoc = querySnapshot.docs.find(d => d.id !== firebaseUser.uid);
        
        if (oldUserDoc) {
          console.log(`Pre-registered user found for email ${userEmail}. Migrating to true UID...`);
          const oldUserData = oldUserDoc.data() as User;
          
          const newUser: User = {
            ...oldUserData,
            id: firebaseUser.uid,
            name: firebaseUser.displayName || oldUserData.name || userEmail.split('@')[0],
            avatar: firebaseUser.photoURL || oldUserData.avatar,
            workspaceId: oldUserData.workspaceId || firebaseUser.uid,
          };
          
          await setDoc(userDocRef, newUser);
          await deleteDoc(doc(db, 'users', oldUserDoc.id));
          return newUser;
        }
      }

      // No pre-created user found, standard creation
      const newUser: User = {
        id: firebaseUser.uid,
        email: userEmail,
        name: firebaseUser.displayName || userEmail.split('@')[0],
        profiles: isSuperUser 
          ? [Profile.CREATOR, Profile.ADMIN, Profile.TEACHER, Profile.ALMACEN, Profile.STUDENT] 
          : [], // Do not default to TEACHER anymore, stay in standby/activation required
        role: isSuperUser ? 'admin' : 'user',
        workspaceId: firebaseUser.uid, // Set workspaceId to UID by default
        activity_status: (isSuperUser || userEmail === 'pablo.palazon@murciaeduca.es') ? 'Activo' : 'De Baja', // Default to active for this specific recovery case
        location_status: 'En el centro',
        avatar: firebaseUser.photoURL || `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
      };
      await setDoc(userDocRef, newUser);
      return newUser;
    }
  };

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'settings', 'connection_test'));
      } catch (error: any) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration or internet connection.");
        }
      }
    };
    testConnection();

    // Firebase Auth Listener
    const unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Firebase Auth state changed:', firebaseUser?.email);
      if (firebaseUser) {
        try {
          const syncedUser = await resolveOrSyncUser(firebaseUser);
          setCurrentUser(syncedUser);

          // Real-time listener for user document changes (profiles, activity_status)
          const unsubUserListener = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap: any) => {
            if (docSnap.exists()) {
              const latestData = docSnap.data() as User;
              setCurrentUser(latestData);
            }
          });
          
          // --- PRESENCE SYSTEM START ---
          const setPresence = (status: 'En el centro' | 'Fuera del centro') => {
            const userRef = doc(db, 'users', firebaseUser.uid);
            setDoc(userRef, { location_status: status }, { merge: true }).catch(console.error);
          };

          setPresence('En el centro');

          // Set offline ONLY if they completely close the tab/browser
          const handleBeforeUnload = () => {
             setPresence('Fuera del centro');
          };

          window.addEventListener('beforeunload', handleBeforeUnload);
          
          (window as any).__presenceCleanup = () => {
             setPresence('Fuera del centro');
             window.removeEventListener('beforeunload', handleBeforeUnload);
             unsubUserListener(); // Cleanup listener too
          };
          // --- PRESENCE SYSTEM END ---
          
        } catch (err) {
          console.error('Firebase sync error:', err);
        }
      } else {
        if ((window as any).__presenceCleanup) {
          (window as any).__presenceCleanup();
          delete (window as any).__presenceCleanup;
        }
        setCurrentUser(null);
        setSelectedProfile(null);
      }
      setIsAuthReady(true);
    });

    return () => {
      unsubscribeFirebase();
      if ((window as any).__presenceCleanup) {
        (window as any).__presenceCleanup();
      }
    };
  }, []);

  const loginWithGoogle = async (): Promise<string | null> => {
    try {
      console.log('AuthContext - Starting Google Login (Firebase)');
      const provider = new GoogleAuthProvider();
      // Force account selection to avoid stale sessions
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      // The onAuthStateChanged listener will handle syncing
      // but to be safe we can run resolveOrSyncUser here to immediately set it
      // if someone needs the promise to await the completed login state immediately.
      const syncedUser = await resolveOrSyncUser(result.user);
      setCurrentUser(syncedUser);
      
      return null;
    } catch (error: any) {
      console.error('Google Login Error:', error);
      if (error.code === 'auth/popup-blocked') {
        return 'El navegador ha bloqueado la ventana emergente. Por favor, permite las ventanas emergentes para este sitio.';
      }
      if (error.code === 'auth/popup-closed-by-user') {
        return 'Has cerrado la ventana de inicio de sesión antes de completar el proceso.';
      }
      if (error.code === 'auth/unauthorized-domain') {
        return 'Este dominio no está autorizado para el inicio de sesión. Contacta con el administrador.';
      }
      return error.message || 'Error desconocido al iniciar sesión.';
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      console.error('Email login error:', error);
      return false;
    }
  };

  const registerWithEmail = async (email: string, password: string, name: string, phone: string, allergens: string[]): Promise<boolean> => {
    try {
      console.log('Attempting registration for:', email);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User created in Firebase Auth:', result.user.uid);
      
      const newUser: User = {
        id: result.user.uid,
        email: email,
        name: name,
        phone: phone,
        allergens: allergens,
        profiles: [Profile.CUSTOMER],
        workspaceId: result.user.uid,
        activity_status: 'Activo',
        location_status: 'Fuera del centro',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
      };
      
      console.log('Attempting to create user document in Firestore:', newUser);
      await setDoc(doc(db, 'users', result.user.uid), newUser);
      console.log('User document created successfully');
      
      setCurrentUser(newUser);
      setSelectedProfile(Profile.CUSTOMER);
      return true;
    } catch (error: any) {
      console.error('Email registration error details:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      return false;
    }
  };

  const logout = async () => {
    try {
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.id);
        await setDoc(userRef, { location_status: 'Fuera del centro' }, { merge: true }).catch(console.error);
      }
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setCurrentUser(null);
      setSelectedProfile(null);
      setOriginalUser(null);
      navigate('/login', { replace: true });
    }
  };

  const selectProfile = (profile: Profile) => {
    console.log('AuthContext - selectProfile:', profile, 'currentUser:', currentUser?.email);
    if (currentUser && currentUser.profiles.includes(profile)) {
      setSelectedProfile(profile);
      
      const currentPath = location.pathname;
      const isProfilePage = currentPath.endsWith('/profile');

      if (profile === 'customer') {
        navigate('/student/takeaway-catalog');
      } else if (isProfilePage) {
        navigate(`/${profile}/profile`);
      } else {
        navigate(`/${profile}/dashboard`);
      }
    }
  };

  const impersonateUser = (user: User) => {
    if (currentUser) {
      setOriginalUser(currentUser);
      setCurrentUser(user);
      if (user.profiles.length > 0) {
        const newProfile = user.profiles[0];
        setSelectedProfile(newProfile);
        navigate(`/${newProfile}/dashboard`);
      } else {
        logout();
      }
    }
  };

  const stopImpersonating = () => {
    if (originalUser) {
      const newProfile = originalUser.profiles[0];
      setCurrentUser(originalUser);
      setSelectedProfile(newProfile);
      setOriginalUser(null);
      navigate(`/${newProfile}/dashboard`);
    }
  };
  
  const updateCurrentUser = async (userData: Partial<User>) => {
    if(currentUser) {
        const updatedUser = {...currentUser, ...userData};
        
        try {
          await setDoc(doc(db, 'users', currentUser.id), updatedUser, { merge: true });
        } catch (e) {
          console.warn('Firebase sync failed:', e);
        }

        setCurrentUser(updatedUser);
        if(isImpersonating && originalUser?.id === currentUser.id) {
            setOriginalUser(updatedUser);
        }
    }
  };

  const isOwner = (userId?: string | null) => {
    if (!currentUser || !userId) return false;
    return userId === currentUser.id || userId === currentUser.substituting_user_id;
  };

  const effectiveUserId = currentUser?.substituting_user_id || currentUser?.id || null;

  const value = useMemo(
    () => ({
      currentUser,
      selectedProfile,
      isImpersonating,
      isAuthReady,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      logout,
      selectProfile,
      impersonateUser,
      stopImpersonating,
      updateCurrentUser,
      isOwner,
      effectiveUserId,
    }),
    [currentUser, selectedProfile, isImpersonating, isAuthReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};