import { auth } from '../firebase';

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string | null;
    email: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: any[];
  }
}

export const handleFirestoreError = (error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null) => {
    const user = auth.currentUser;
    const errorInfo: FirestoreErrorInfo = {
      error: error.message || String(error),
      operationType,
      path,
      authInfo: {
        userId: user?.uid || null,
        email: user?.email || null,
        emailVerified: user?.emailVerified || false,
        isAnonymous: user?.isAnonymous || false,
        providerInfo: user?.providerData || [],
      }
    };
    
    console.error('Firestore Error Detailed:', JSON.stringify(errorInfo, null, 2));

    // Throwing as JSON string as per instructions
    throw new Error(JSON.stringify(errorInfo));
};
