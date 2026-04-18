import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import * as admin from 'firebase-admin';

dotenv.config();

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});
const db = admin.firestore();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post('/api/admin/create-user', async (req, res) => {
    res.status(400).json({ error: 'La creación manual de usuarios está deshabilitada. Los usuarios deben iniciar sesión con Google.' });
  });

  app.post('/api/log', async (req, res) => {
      try {
          const authHeader = req.headers.authorization;
          if (!authHeader?.startsWith('Bearer ')) {
              return res.status(401).json({ error: 'No autorizado' });
          }
          const idToken = authHeader.split('Bearer ')[1];
          const decodedToken = await admin.auth().verifyIdToken(idToken);

          const { collection, documentId, action, changes } = req.body;
          
          await db.collection('audit_logs').add({
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              user_id: decodedToken.uid,
              user_email: decodedToken.email,
              collection,
              documentId,
              action,
              changes
          });
          
          res.json({ success: true });
      } catch (error) {
          console.error('Error logging operation:', error);
          res.status(500).json({ error: 'Internal server error' });
      }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
