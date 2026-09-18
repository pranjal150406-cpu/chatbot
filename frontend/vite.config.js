import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'child_process';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function autoStartBackendPlugin() {
  let backendProcess = null;

  return {
    name: 'auto-start-backend',
    configureServer() {
      // Check if backend is already listening on port 8000
      const req = http.get('http://127.0.0.1:8000/api/health', (res) => {
        if (res.statusCode === 200) {
          console.log('\x1b[32m[Backend]\x1b[0m FastAPI backend is already running on http://localhost:8000');
        }
      });

      req.on('error', () => {
        // Backend not running, spawn it automatically
        const backendDir = path.resolve(__dirname, '../backend');
        const pythonExe = path.resolve(backendDir, 'venv/Scripts/python.exe');
        console.log('\x1b[36m[Backend]\x1b[0m Starting FastAPI backend automatically on http://localhost:8000...');

        backendProcess = spawn(pythonExe, ['main.py'], {
          cwd: backendDir,
          stdio: 'inherit',
          shell: true,
        });

        backendProcess.on('error', (err) => {
          console.error('[Backend] Failed to start backend:', err.message);
        });
      });

      const killBackend = () => {
        if (backendProcess) {
          try {
            backendProcess.kill();
          } catch {}
        }
      };

      process.on('exit', killBackend);
      process.on('SIGINT', killBackend);
      process.on('SIGTERM', killBackend);
    },
  };
}

export default defineConfig({
  plugins: [react(), autoStartBackendPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});