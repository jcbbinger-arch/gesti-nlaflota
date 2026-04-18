import { auth } from '../firebase';

export const logAudit = async (collection: string, documentId: string, action: 'CREATE' | 'UPDATE' | 'DELETE', changes: any) => {
    try {
        const user = auth.currentUser;
        if (!user) return;
        
        const idToken = await user.getIdToken();
        
        await fetch('/api/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                collection,
                documentId,
                action,
                changes
            })
        });
    } catch (error) {
        console.error('Failed to log audit:', error);
    }
};
