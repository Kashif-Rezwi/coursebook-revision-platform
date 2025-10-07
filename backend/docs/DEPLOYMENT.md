# Deployment Guide

## Prerequisites

### System Requirements
- **Node.js**: 18.x or 20.x (LTS recommended)
- **MongoDB**: 6.0+ (with replica set for production)
- **Redis**: 7.0+ (for caching and queues)
- **ChromaDB**: 0.4.0+ (for vector storage)
- **Memory**: 2GB+ RAM (4GB+ recommended for production)
- **Storage**: 10GB+ available space
- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows

### External Services
- **Hugging Face API**: For LLM inference
- **OpenAI API**: For embeddings (text-embedding-3-small)
- **Domain**: With SSL certificate for production

## Environment Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd coursebook-revision-platform/backend
```

### 2. Install Dependencies
```bash
# Install production dependencies
npm install --production

# Or install all dependencies (including dev)
npm install
```

### 3. Environment Variables
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**
```env
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://localhost:27017/learning-platform
MONGODB_OPTIONS={"useNewUrlParser":true,"useUnifiedTopology":true}

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# ChromaDB
CHROMADB_HOST=localhost
CHROMADB_PORT=8000

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# AI Services
HUGGINGFACE_API_KEY=your_huggingface_api_key
LLM_API_KEY=your_llm_api_key
EMBEDDING_API_KEY=your_openai_api_key

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Database Setup

### MongoDB Setup

#### Development
```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt-get install mongodb

# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Create database and user
mongo
use learning-platform
db.createUser({
  user: "learning_user",
  pwd: "secure_password",
  roles: ["readWrite"]
})
```

#### Production (Replica Set)
```bash
# Install MongoDB (Ubuntu/Debian)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Configure replica set
sudo nano /etc/mongod.conf
```

**MongoDB Configuration (`/etc/mongod.conf`):**
```yaml
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 0.0.0.0

replication:
  replSetName: "rs0"

security:
  authorization: enabled
```

```bash
# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Initialize replica set
mongo
rs.initiate()
```

### Redis Setup

#### Development
```bash
# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Production
```bash
# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
```

**Redis Configuration:**
```conf
# Bind to all interfaces
bind 0.0.0.0

# Set password
requirepass your_redis_password

# Enable persistence
save 900 1
save 300 10
save 60 10000

# Set max memory
maxmemory 2gb
maxmemory-policy allkeys-lru
```

```bash
# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### ChromaDB Setup

#### Using Docker (Recommended)
```bash
# Pull ChromaDB image
docker pull chromadb/chroma:latest

# Run ChromaDB
docker run -p 8000:8000 --name chromadb \
  -v chroma_data:/chroma/chroma \
  chromadb/chroma:latest
```

#### Using Python
```bash
# Install Python and pip
sudo apt-get install python3 python3-pip

# Install ChromaDB
pip3 install chromadb

# Start ChromaDB server
chroma run --host 0.0.0.0 --port 8000
```

## Production Deployment

### Option 1: PM2 (Process Manager)

#### Install PM2
```bash
npm install -g pm2
```

#### Create PM2 Configuration
```bash
# Create ecosystem file
nano ecosystem.config.js
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'learning-platform-api',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

#### Deploy with PM2
```bash
# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### Option 2: Docker

#### Create Dockerfile
```dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/

# Create uploads directory
RUN mkdir -p uploads logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["node", "dist/server.js"]
```

#### Create docker-compose.yml
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/learning-platform
      - REDIS_URL=redis://redis:6379
      - CHROMADB_HOST=chromadb
      - CHROMADB_PORT=8000
    depends_on:
      - mongo
      - redis
      - chromadb
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    restart: unless-stopped

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass your_redis_password
    volumes:
      - redis_data:/data
    restart: unless-stopped

  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:
  chroma_data:
```

#### Deploy with Docker
```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f api

# Scale API instances
docker-compose up -d --scale api=3
```

### Option 3: Kubernetes

#### Create Kubernetes Manifests

**api-deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: learning-platform-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: learning-platform-api
  template:
    metadata:
      labels:
        app: learning-platform-api
    spec:
      containers:
      - name: api
        image: your-registry/learning-platform-api:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: mongodb-uri
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

**api-service.yaml:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: learning-platform-api-service
spec:
  selector:
    app: learning-platform-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: LoadBalancer
```

## Nginx Configuration

### Install Nginx
```bash
sudo apt-get update
sudo apt-get install nginx
```

### Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/learning-platform
```

**Nginx Configuration:**
```nginx
upstream api_backend {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # API routes
    location /api/ {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # File uploads
    location /api/v1/pdfs/upload {
        client_max_body_size 10M;
        proxy_pass http://api_backend;
        proxy_request_buffering off;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://api_backend;
        access_log off;
    }
}
```

### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/learning-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Certificate (Let's Encrypt)

### Install Certbot
```bash
sudo apt-get install certbot python3-certbot-nginx
```

### Obtain Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Auto-renewal
```bash
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring and Logging

### Application Monitoring

#### Install PM2 Monitoring
```bash
# Install PM2 Plus (optional)
pm2 install pm2-server-monit

# View monitoring dashboard
pm2 monit
```

#### Setup Log Rotation
```bash
# Install logrotate
sudo apt-get install logrotate

# Create logrotate config
sudo nano /etc/logrotate.d/learning-platform
```

**Logrotate Configuration:**
```
/var/log/learning-platform/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
    postrotate
        pm2 reloadLogs
    endscript
}
```

### System Monitoring

#### Install htop and iotop
```bash
sudo apt-get install htop iotop
```

#### Setup Uptime Monitoring
```bash
# Install Uptime Kuma (optional)
docker run -d --restart=always -p 3001:3001 -v uptime-kuma:/app/data --name uptime-kuma louislam/uptime-kuma
```

## Backup Strategy

### MongoDB Backup
```bash
# Create backup script
nano backup-mongodb.sh
```

**backup-mongodb.sh:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
mkdir -p $BACKUP_DIR

# Create backup
mongodump --uri="mongodb://localhost:27017/learning-platform" --out="$BACKUP_DIR/backup_$DATE"

# Compress backup
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C "$BACKUP_DIR" "backup_$DATE"

# Remove uncompressed backup
rm -rf "$BACKUP_DIR/backup_$DATE"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "MongoDB backup completed: backup_$DATE.tar.gz"
```

```bash
chmod +x backup-mongodb.sh

# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /path/to/backup-mongodb.sh
```

### Redis Backup
```bash
# Redis automatically creates snapshots, but you can force one:
redis-cli BGSAVE
```

### Application Files Backup
```bash
# Create application backup script
nano backup-app.sh
```

**backup-app.sh:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/app"
APP_DIR="/path/to/learning-platform"

mkdir -p $BACKUP_DIR

# Backup uploads and logs
tar -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" \
  -C "$APP_DIR" uploads logs

# Keep only last 30 days
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +30 -delete

echo "Application backup completed: app_backup_$DATE.tar.gz"
```

## Security Checklist

### Server Security
- [ ] Firewall configured (UFW)
- [ ] SSH key authentication only
- [ ] Regular security updates
- [ ] Fail2ban installed and configured
- [ ] Non-root user for application
- [ ] SSL/TLS certificates installed
- [ ] Security headers configured

### Application Security
- [ ] Environment variables secured
- [ ] JWT secrets are strong and unique
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] CORS properly configured
- [ ] Helmet.js security headers
- [ ] File upload restrictions

### Database Security
- [ ] MongoDB authentication enabled
- [ ] Redis password protected
- [ ] Database backups encrypted
- [ ] Network access restricted
- [ ] Regular security audits

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
pm2 logs learning-platform-api

# Check environment variables
pm2 show learning-platform-api

# Restart application
pm2 restart learning-platform-api
```

#### Database Connection Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Test connection
mongo --eval "db.adminCommand('ismaster')"
```

#### Redis Connection Issues
```bash
# Check Redis status
sudo systemctl status redis-server

# Test Redis connection
redis-cli ping
```

#### High Memory Usage
```bash
# Check memory usage
pm2 monit

# Restart with memory limit
pm2 restart learning-platform-api --max-memory-restart 1G
```

### Performance Optimization

#### Enable Gzip Compression
```bash
# Add to nginx config
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

#### Database Indexing
```bash
# Connect to MongoDB
mongo learning-platform

# Create indexes
db.users.createIndex({ "email": 1 }, { unique: true })
db.pdfs.createIndex({ "userId": 1, "createdAt": -1 })
db.chats.createIndex({ "userId": 1, "pdfId": 1 })
db.quizzes.createIndex({ "userId": 1, "pdfId": 1 })
db.progress.createIndex({ "userId": 1, "createdAt": -1 })
```

## Maintenance

### Regular Tasks
- [ ] Monitor disk space
- [ ] Check application logs
- [ ] Verify backup integrity
- [ ] Update dependencies
- [ ] Security patches
- [ ] Performance monitoring

### Weekly Tasks
- [ ] Review error logs
- [ ] Check database performance
- [ ] Verify SSL certificate expiry
- [ ] Test backup restoration

### Monthly Tasks
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Dependency updates
- [ ] Disaster recovery testing

## Support

For deployment issues:
1. Check application logs: `pm2 logs learning-platform-api`
2. Verify environment variables: `pm2 show learning-platform-api`
3. Test database connections
4. Check system resources: `htop`
5. Review nginx logs: `sudo tail -f /var/log/nginx/error.log`

For production support, contact the development team with:
- Error logs
- System specifications
- Steps to reproduce
- Expected vs actual behavior
