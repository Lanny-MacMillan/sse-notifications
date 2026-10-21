# SSE Notifications Service - EC2 / Ubuntu / PM2 Cheat Sheet

## Connect to EC2

```bash
# Key pair is stored at ~/.ssh/sse-key.pem (chmod 400)
# Use the instance's current public DNS (it changes if the instance is stopped/started)
ssh -i ~/.ssh/sse-key.pem ubuntu@<ec2-public-dns>

# Copy a local .env to the server
scp -i ~/.ssh/sse-key.pem .env ubuntu@<ec2-public-dns>:~/sse-notifications/.env

# SSH is allowed from one IP only; if it times out, your IP changed. Add the new one:
# aws ec2 authorize-security-group-ingress --group-id <sse-sg> --protocol tcp --port 22 --cidr <your-ip>/32
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

# Restart and reload changed .env values
pm2 restart sse-notifications --update-env

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

Port 4000 is only open to CloudFront, so test through the CloudFront URL:

```bash
GET https://<distribution>.cloudfront.net/health
```

## Troubleshooting

### CloudFront returns 504

The origin isn't reachable. On the server check `pm2 list` (should be `online`, restart count not climbing), `curl localhost:4000/health`, and that the security group allows port 4000 from the CloudFront origin-facing prefix list. If the instance was stopped/started, update the CloudFront origin to its new public DNS.

### PM2 restart loop: Prisma "could not locate the Query Engine"

`prisma/schema.prisma` must contain `output = "../src/generated/prisma"`. Then:

```bash
npx prisma generate && npm run build && pm2 restart sse-notifications
pm2 logs sse-notifications --lines 40 --nostream
```

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
