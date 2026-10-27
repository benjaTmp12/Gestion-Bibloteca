const { spawnSync } = require('node:child_process');
const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) {
  throw new Error('Las pruebas requieren un emulador local de Firestore.');
}
const resultado = spawnSync(process.execPath, ['--test'], {
  stdio: 'inherit', env: { ...process.env, FIRESTORE_EMULATOR_HOST: host, RUN_FIRESTORE_TESTS: '1' }
});
if (resultado.error) throw resultado.error;
process.exitCode = resultado.status === null ? 1 : resultado.status;
