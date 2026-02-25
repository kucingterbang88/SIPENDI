import express from 'express';
import { createServer as createViteServer } from 'vite';
import app from './api/index';

async function startServer() {
  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT as number, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
