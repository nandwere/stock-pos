module.exports = {
  apps: [{
    name: 'stock-pos',
    script: 'npm',
    args: 'start',
    cwd: '/home/app/apps/stock-pos',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '500M',
    error_file: '/home/app/apps/logs/err.log', // Use absolute path
    out_file: '/home/app/apps/logs/out.log',  // Use absolute path
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};