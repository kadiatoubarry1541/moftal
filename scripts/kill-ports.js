// Tue les processus sur les ports 7777 et 3000-3005 avant le démarrage
const { execSync } = require('child_process')

function killPort(port) {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8', shell: true })
    for (const line of out.split('\n')) {
      if (line.includes(':' + port + ' ') && line.includes('LISTENING')) {
        const pid = line.trim().split(/\s+/).pop()
        if (pid && /^\d+$/.test(pid) && pid !== '0') {
          try { execSync('taskkill /F /PID ' + pid, { shell: true, stdio: 'ignore' }) } catch (_) {}
        }
      }
    }
  } catch (_) {}
}

[7777, 3000, 3001, 3002, 3003, 3004, 3005].forEach(killPort)
