
import { Router } from 'express';
import { validateCredentials, createSession, revokeSession } from '../auth';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await validateCredentials(email, password);
    const session = await createSession(user);
    res.json({ user, token: session.token });
  } catch (error) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

router.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    await revokeSession(token);
  }
  res.json({ success: true });
});

export default router;
