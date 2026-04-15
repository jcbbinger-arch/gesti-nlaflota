import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { Creator } from '../types';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface CreatorContextType {
  creatorInfo: Creator;
  setCreatorInfo: (info: Creator) => Promise<void>;
}

const CreatorContext = createContext<CreatorContextType | undefined>(undefined);

const initialCreatorInfo: Creator = {
  name: "JCB",
  logo: "https://avatars.githubusercontent.com/u/1?v=4", // Placeholder Octocat
  website: "mailto:managerproapp@gmail.com",
  copyright: `© ${new Date().getFullYear()} JCB. Todos los derechos reservados.`,
  app_name: "Manager Pro",
};

export const CreatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [creatorInfo, setCreatorInfoState] = useState<Creator>(initialCreatorInfo);
  
  useEffect(() => {
    const docRef = doc(db, 'settings', 'creator');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCreatorInfoState(docSnap.data() as Creator);
      } else {
        // Initialize if it doesn't exist
        setDoc(docRef, initialCreatorInfo, { merge: true }).catch(console.error);
      }
    }, (error) => {
      console.error("Error fetching creator info:", error);
    });

    return () => unsubscribe();
  }, []);

  const setCreatorInfo = async (info: Creator) => {
    try {
      // Optimistic update
      setCreatorInfoState(info);
      await setDoc(doc(db, 'settings', 'creator'), info, { merge: true });
    } catch (error) {
      console.error("Error updating creator info:", error);
    }
  };

  const value = useMemo(() => ({ creatorInfo, setCreatorInfo }), [creatorInfo]);

  return <CreatorContext.Provider value={value}>{children}</CreatorContext.Provider>;
};

export const useCreator = () => {
  const context = useContext(CreatorContext);
  if (!context) {
    throw new Error('useCreator must be used within a CreatorProvider');
  }
  return context;
};