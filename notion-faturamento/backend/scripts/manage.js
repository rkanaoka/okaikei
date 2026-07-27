/**
 * Gerenciador simples de processo em background (start/stop/restart), sem
 * dependências externas. Guarda o PID em .server.pid e a saída em .server.log,
 * ambos na raiz de notion-faturamento/backend.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const PID_FILE = path.join(ROOT, '.server.pid');
const LOG_FILE = path.join(ROOT, '.server.log');
const ENTRY = path.join(ROOT, 'src', 'index.js');

function readPid() {
  if (!fs.existsSync(PID_FILE)) return null;
  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
  return Number.isInteger(pid) ? pid : null;
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function start() {
  const existing = readPid();
  if (existing && isAlive(existing)) {
    console.log(`Já está rodando (PID ${existing}). Use "npm run restart" para reiniciar.`);
    return;
  }
  if (existing) fs.rmSync(PID_FILE, { force: true }); // PID obsoleto de uma execução anterior

  const out = fs.openSync(LOG_FILE, 'a');
  const child = spawn(process.execPath, [ENTRY], {
    cwd: ROOT,
    detached: true,
    stdio: ['ignore', out, out],
  });
  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid));
  console.log(`Iniciado em background (PID ${child.pid}). Logs em ${LOG_FILE}`);
}

function stop() {
  const pid = readPid();
  if (!pid || !isAlive(pid)) {
    console.log('Não está rodando.');
    fs.rmSync(PID_FILE, { force: true });
    return;
  }
  process.kill(pid);
  fs.rmSync(PID_FILE, { force: true });
  console.log(`Parado (PID ${pid}).`);
}

function restart() {
  stop();
  setTimeout(start, 500);
}

const cmd = process.argv[2];
if (cmd === 'start') start();
else if (cmd === 'stop') stop();
else if (cmd === 'restart') restart();
else {
  console.error('Uso: node scripts/manage.js <start|stop|restart>');
  process.exit(1);
}
