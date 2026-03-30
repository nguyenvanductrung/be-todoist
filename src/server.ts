import { app } from './app.js';
import { env } from './config/env.js';

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT.toString()}`);
  console.log(`[server] Environment: ${env.NODE_ENV}`);
});
