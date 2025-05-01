import express from 'express';
import dotenv from 'dotenv';
import languagesRoutes from './routes/languages/languages.routes.js';
import userRoutes from './routes/user/user.routes.js';
import vocabularyRoutes from './routes/vocabulary/vocabulary.routes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000; // Use PORT from .env or default to 3000

app.use(express.json());

app.use('/vocabulary', vocabularyRoutes);
app.use('/languages', languagesRoutes);
app.use('/user', userRoutes)

app.get('/', (req, res) => {
  res.send('User API is running!');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});