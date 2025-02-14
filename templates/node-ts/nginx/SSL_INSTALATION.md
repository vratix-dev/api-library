# (Optional) SSL Setup for NGINX Proxy

> This guide explains how to install SSL certificates for NGINX using Let's Encrypt. SSL certificates are generated on the host and then mounted into the NGINX Docker container.

### 1. Install Certbot and Generate SSL Certificates

1. **Install Certbot** (Let's Encrypt client) on your host if it’s not already installed:

```bash
sudo apt install certbot
```

2. **Generate SSL certificates** for your domain. Replace `yourdomain.com` with your actual domain name:

```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

Certificates will be stored in `/etc/letsencrypt/live/yourdomain.com/`.

### 2. Update `nginx.conf` for SSL

Modify your `nginx.conf` to enable SSL:

1. **Add an HTTPS server block** in `nginx.conf`, configured as follows:
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/certs/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
2. **Add an HTTP to HTTPS redirect block** (optional):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    return 301 https://$host$request_uri;
}
```

### 3. Mount Certificates in Docker

Ensure SSL certificates are available to the NGINX container by mounting them in `docker-compose.yml`. 
Replace `yourdomain.com` with your domain name:

```yaml
services:
  nginx:
    volumes:
      - ./etc/letsencrypt/live/yourdomain.com:/etc/ssl/certs:ro
```

### 4. Automate SSL Renewal

1. **Open your crontab** to add an automated renewal job:

```bash
sudo crontab -e
```

2. **Add the renewal command** to run daily at 3 AM (or adjust the schedule as desired):

```bash
0 3 * * * certbot renew --quiet && docker compose -f /path-to-your-project/docker-compose.yml restart nginx
```

This setup will check for certificate renewal daily and restart NGINX if renewal occurs.
