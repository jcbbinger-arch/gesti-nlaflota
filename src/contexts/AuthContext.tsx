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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { User, Profile, SUPER_USER_EMAILS } from '../types';

interface AuthContextType {
  currentUser: User | null;
  selectedProfile: Profile | null;
  isImpersonating: boolean;
  isAuthReady: boolean;
  loginWithGoogle: () => Promise<boolean>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  registerWithEmail: (email: string, password: string, name: string, phone: string, allergens: string[]) => Promise<boolean>;
  logout: () => void;
  selectProfile: (profile: Profile) => void;
  impersonateUser: (user: User) => void;
  stopImpersonating: () => void;
  updateCurrentUser: (userData: Partial<User>) => void;
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

  useEffect(() => {
    // Firebase Auth Listener
    const unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Firebase Auth state changed:', firebaseUser?.email);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            let userData = userDoc.data() as User;
            let needsUpdate = false;
            // Migration for users created before the change
            if (userData.profiles.includes(Profile.STUDENT) && !userData.classroom_id && !SUPER_USER_EMAILS.includes(userData.email)) {
               userData = {
                 ...userData,
                 profiles: [Profile.TEACHER],
                 activity_status: 'De Baja'
               };
               needsUpdate = true;
            }
            // Ensure workspaceId exists
            if (!userData.workspaceId) {
              userData.workspaceId = firebaseUser.uid;
              needsUpdate = true;
            }
            if (needsUpdate) {
              await setDoc(doc(db, 'users', firebaseUser.uid), userData);
            }
            setCurrentUser(userData);
          } else {
            // Create user if it doesn't exist
            const userEmail = firebaseUser.email || '';
            const isSuperUser = SUPER_USER_EMAILS.includes(userEmail);
            const newUser: User = {
              id: firebaseUser.uid,
              email: userEmail,
              name: firebaseUser.displayName || userEmail.split('@')[0],
              profiles: isSuperUser 
                ? [Profile.CREATOR, Profile.ADMIN, Profile.TEACHER, Profile.ALMACEN, Profile.STUDENT] 
                : [Profile.TEACHER], // Default to Teacher so they appear in TeacherManager
              workspaceId: firebaseUser.uid, // Set workspaceId to UID by default
              activity_status: isSuperUser ? 'Activo' : 'De Baja', // Default to inactive
              location_status: 'En el centro',
              avatar: firebaseUser.photoURL || `https://i.pravatar.cc/150?u=${firebaseUser.uid}`
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setCurrentUser(newUser);
          }
        } catch (err) {
          console.error('Firebase sync error:', err);
        }
      } else {
        setCurrentUser(null);
        setSelectedProfile(null);
      }
      setIsAuthReady(true);
    });

    return () => {
      unsubscribeFirebase();
    };
  }, []);

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      console.log('AuthContext - Starting Google Login (Firebase)');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userDocRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const userEmail = result.user.email || '';
        const isSuperUser = SUPER_USER_EMAILS.includes(userEmail);
        const newUser: User = {
          id: result.user.uid,
          email: userEmail,
          name: result.user.displayName || userEmail.split('@')[0],
          profiles: isSuperUser 
            ? [Profile.CREATOR, Profile.ADMIN, Profile.TEACHER, Profile.ALMACEN, Profile.STUDENT] 
            : [Profile.TEACHER], // Default to Teacher so they appear in TeacherManager
          workspaceId: result.user.uid,
          activity_status: isSuperUser ? 'Activo' : 'De Baja', // Default to inactive
          location_status: 'En el centro',
          avatar: result.user.photoURL || `https://i.pravatar.cc/150?u=${result.user.uid}`
        };
        await setDoc(userDocRef, newUser);
        setCurrentUser(newUser);
      } else {
        let userData = userDoc.data() as User;
        // Migration for users created before the change
        if (userData.profiles.includes(Profile.STUDENT) && !userData.classroom_id && !SUPER_USER_EMAILS.includes(userData.email)) {
           userData = {
             ...userData,
             profiles: [Profile.TEACHER],
             activity_status: 'De Baja'
           };
           await setDoc(userDocRef, userData);
        }
        setCurrentUser(userData);
      }
      
      return true;
    } catch (error: any) {
      console.error('Firebase login error details:', error);
      return false;
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
    await signOut(auth);
    setSelectedProfile(null);
    setOriginalUser(null);
    navigate('/login');
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