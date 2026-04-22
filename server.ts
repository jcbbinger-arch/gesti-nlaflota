import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import * as admin from 'firebase-admin';

import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let projectIdStr = process.env.FIREBASE_PROJECT_ID;
try {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const fileContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(fileContent);
    if (config.projectId) {
      projectIdStr = config.projectId;
    }
  }
} catch (e) {
  console.log('Could not read firebase-applet-config.json:', e);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: projectIdStr
});
const db = admin.firestore();

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

  app.get('/api/backup', async (req, res) => {
      try {
          const authHeader = req.headers.authorization;
          if (!authHeader?.startsWith('Bearer ')) {
              return res.status(401).json({ error: 'No autorizado' });
          }
          const idToken = authHeader.split('Bearer ')[1];
          const decodedToken = await admin.auth().verifyIdToken(idToken);
          
          // Verify user permission
          const userDoc = await db.collection('users').doc(decodedToken.uid).get();
          const userData = userDoc.data();
          const isCreator = userData?.profiles?.includes('creator');
          const isMaintainer = userData?.isMaintainer === true;
          
          if (!isCreator && !isMaintainer) {
              return res.status(403).json({ error: 'Forbidden' });
          }
          
          // Logic: Date range (current + 2 previous courses) -> 3 years
          const threeYearsAgo = new Date();
          threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
          
          const collections = await db.listCollections();
          const backup: Record<string, any[]> = {};
          
          for (const col of collections) {
              try {
                  console.log(`Backing up collection: ${col.id}`);
                  const snapshot = await col.get();
                  backup[col.id] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                  
                  // Only filter specific collections by date
                  const academicCollections = ['orders', 'incidents', 'sales', 'reservations', 'dining_services', 'dining_reservations', 'events', 'classroom_orders'];
                  if (academicCollections.includes(col.id)) {
                      backup[col.id] = backup[col.id].filter(doc => {
                          const dateField = doc.date || doc.start_date || doc.created_at || doc.sale_date;
                          if (!dateField) return true; // keep if no date
                          return new Date(dateField) >= threeYearsAgo;
                      });
                  }
              } catch (e) {
                  console.error(`Error backing up collection ${col.id}:`, e);
                  throw e;
              }
          }

          // Log the backup operation
          await db.collection('audit_logs').add({
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              user_id: decodedToken.uid,
              user_email: decodedToken.email,
              action: 'GENERATE_BACKUP'
          });

          res.json(backup);
      } catch (error) {
          console.error('Error generating backup:', error);
          res.status(500).json({ error: 'Error generating backup' });
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
