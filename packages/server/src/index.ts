import { Server } from 'socket.io';
import { buildApp } from './app.js';
import { config } from './config.js';
import { setupSocketHandlers } from './socket.js';

async function main() {
  const app = await buildApp();

  const io = new Server(app.server, {
    cors: config.isProduction
      ? undefined
      : { origin: 'http://localhost:5173', credentials: true },
  });

  setupSocketHandlers(io);

  await app.listen({ port: config.port, host: config.host });
  console.log(`Server listening on ${config.host}:${config.port}`);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
