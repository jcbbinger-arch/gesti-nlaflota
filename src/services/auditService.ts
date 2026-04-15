import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const logAuditAction = async (
  userId: string,
  action: string,
  collectionName: string,
  documentId: string,
  details: any
) => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      userId,
      action,
      collectionName,
      documentId,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
};
