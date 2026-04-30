import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import athleteRoutes from './routes/athletes';
import postRoutes from './routes/posts';
import likeRoutes from './routes/likes';
import commentRoutes from './routes/comments';
import followRoutes from './routes/follows';
import saveRoutes from './routes/saves';
import coachRoutes from './routes/coaches';
import brandRoutes from './routes/brands';
import offerRoutes from './routes/offers';
import dealRoutes from './routes/deals';
import messageRoutes from './routes/messages';
import publicRoutes from './routes/public';
import uploadRoutes from './routes/uploads';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SPOTR API is running', v: '2fb8f40' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/athletes', athleteRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/posts', likeRoutes);
app.use('/api/posts', commentRoutes);
app.use('/api/users', followRoutes);
app.use('/api', saveRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.listen(PORT, () => {
  console.log(`🚀 SPOTR API server running on http://localhost:${PORT}`);
});
