// Hook PostToolUse (harness): después de cada Edit/Write en src/ o tests/ corre las pruebas unitarias.
// Si fallan, sale con código 2 y el resumen va a stderr: Claude Code se lo muestra al agente para que corrija.
const { execSync } = require('child_process');

let entrada = '';
process.stdin.on('data', (c) => { entrada += c; });
process.stdin.on('end', () => {
  let archivo = '';
  try { archivo = JSON.parse(entrada).tool_input?.file_path || ''; } catch { process.exit(0); }
  if (!/[\\/](src|tests)[\\/].+\.js$/.test(archivo)) process.exit(0);
  try {
    execSync('npm run test:unit --silent', { cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(), stdio: 'pipe' });
    process.exit(0);
  } catch (e) {
    const salida = `${e.stdout || ''}${e.stderr || ''}`.split('\n').slice(-40).join('\n');
    process.stderr.write(`Las pruebas unitarias fallan después de editar ${archivo}:\n${salida}`);
    process.exit(2);
  }
});
