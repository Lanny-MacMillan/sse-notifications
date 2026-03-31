# SSE Notifications Service - EC2 / Ubuntu / PM2 Cheat Sheet

## Connect to EC2

```bash
# this shows command in relation to normal stored pem key
ssh -i ~/.ssh/sse-server-key.pem ubuntu@18.222.159.163
```

## Initial Setup & Build

```bash
# Install Node.js dependencies
npm install

# Generate Prisma client (REQUIRED before building)
npx prisma generate

# Build TypeScript to JavaScript
npm run build
```

## Test Server Manually

```bash
# Start server directly
node dist/server.js

# Test health endpoint (in another terminal)
curl -N http://localhost:4000/health
```

## Environment Variables

### Temporary (current session only)

```bash
export NODE_ENV=production
export PORT=4000
export DATABASE_URL="production_db_url"
```

### Permanent (survives reboots)

```bash
# Edit system environment file
sudo nano /etc/environment

# Add these lines:
# NODE_ENV=production
# PORT=4000
# DATABASE_URL="production_db_url"

# Reload environment variables
source /etc/environment
```

## PM2 Process Management

### Basic Operations

```bash
# Start the application
pm2 start dist/server.js --name sse-notifications --env production

# View live logs
pm2 logs sse-notifications

# Restart application (for updates)
pm2 restart sse-notifications

# Stop application
pm2 stop sse-notifications

# Remove from PM2 (deletes process config)
pm2 delete sse-notifications

# List all PM2 processes
pm2 list
```

### Make PM2 Persistent (survive server reboots)

```bash
# Generate startup script
pm2 startup

# Save current PM2 process list
pm2 save
```

## Testing & Verification

### From EC2 Server

```bash
curl -N http://localhost:4000/health
```

### From External (Local Machine/Postman)

```bash
GET http://<EC2_PUBLIC_IP>:4000/health
```

## Troubleshooting

### Check What's Using Port 4000

```bash
sudo lsof -i :4000
```

### Reload Environment Variables

```bash
source ~/.bashrc
# OR
source /etc/environment
```

### Fix Module Not Found Errors

```bash
# Regenerate Prisma client
npx prisma generate

# Rebuild project
npm run build

# Restart PM2
pm2 restart sse-notifications
```

### View Detailed PM2 Info

```bash
# Show detailed process info
pm2 show sse-notifications

# Monitor resources (CPU, memory)
pm2 monit
```
