module.exports = {
  apps: [
    {
      name: 'vzxab-admin',
      script: '/usr/bin/pnpm',
      args: 'start',
      cwd: __dirname,
      autorestart: true,
      merge_logs: true,
      max_memory_restart: '2G',
      env: {
        ENV_PATH: '.env'
      }
    }
  ]
}