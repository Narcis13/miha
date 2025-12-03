module.exports = {
  apps: [{
    name: 'miha',
    script: 'bun',
    args: 'run server/src/index.ts',
    cwd: '/home/sysadm/miha',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/home/sysadm/miha/logs/pm2-error.log',
    out_file: '/home/sysadm/miha/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
}
