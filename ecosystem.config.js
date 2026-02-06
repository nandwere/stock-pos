// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'stock-pos',
    script: 'npm',
    args: 'start',
    cwd: '/home/app/apps/stock-pos-system',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '500M',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    merge_logs: true,
    autorestart: true,
    watch: false
  }]
};