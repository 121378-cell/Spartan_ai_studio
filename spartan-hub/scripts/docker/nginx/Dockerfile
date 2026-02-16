# Use official NGINX image
FROM nginx:1.24-alpine

# Install required packages
RUN apk add --no-cache openssl

# Create self-signed certificates for development
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
    -keyout /etc/nginx/ssl/server.key -out /etc/nginx/ssl/server.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Remove default NGINX configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create temp directories and set permissions
RUN mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp && \
    chown -R nginx:nginx /etc/nginx && \
    chown -R nginx:nginx /var/run/nginx.pid && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /tmp/client_temp && \
    chown -R nginx:nginx /tmp/proxy_temp && \
    chown -R nginx:nginx /tmp/fastcgi_temp && \
    chown -R nginx:nginx /tmp/uwsgi_temp && \
    chown -R nginx:nginx /tmp/scgi_temp && \
    chown -R nginx:nginx /etc/nginx/ssl

# Expose HTTPS port
EXPOSE 443

# Switch to non-root user
USER nginx

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]