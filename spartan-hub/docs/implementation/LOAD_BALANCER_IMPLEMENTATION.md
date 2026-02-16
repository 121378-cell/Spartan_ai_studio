# Load Balancer Implementation for Backend Services

## Overview

This document describes the implementation of a load balancer for the Spartan Hub backend services. The load balancer distributes incoming requests across multiple backend instances to improve performance, scalability, and reliability.

## Architecture

### Components

1. **NGINX Load Balancer** - Distributes requests across backend instances
2. **Multiple Backend Instances** - Two instances of the backend service
3. **Health Checks** - Monitors backend instance availability
4. **Session Management** - Handles session affinity (optional)

### Load Balancing Algorithm

The implementation uses **Round Robin** load balancing, which is the default algorithm in NGINX. This algorithm distributes requests evenly across all available backend instances.

## Configuration

### Docker Compose Changes

The `docker-compose.yml` file has been updated to run two backend instances:

```yaml
# Backend Service Instance 1
synergycoach_backend_1:
  # ... configuration ...

# Backend Service Instance 2
synergycoach_backend_2:
  # ... configuration ...
```

Each instance:
- Runs on the same port internally (3001)
- Exposes different ports externally (3001 and 3002)
- Has unique container names and instance IDs
- Shares the same configuration and secrets

### NGINX Configuration

The NGINX configuration defines an upstream block for load balancing:

```nginx
upstream backend {
    # Load balancing algorithm: round-robin (default)
    server synergycoach_backend_1:3001 weight=1 max_fails=3 fail_timeout=30s;
    server synergycoach_backend_2:3001 weight=1 max_fails=3 fail_timeout=30s;
    
    # Keepalive connections to backend servers
    keepalive 32;
    
    # Health checks
    keepalive_requests 1000;
    keepalive_timeout 60s;
}
```

Key configuration parameters:
- `weight`: Relative weight for load distribution (equal weights mean equal distribution)
- `max_fails`: Number of failed requests before marking server as unavailable
- `fail_timeout`: Time to wait before retrying a failed server
- `keepalive`: Number of keepalive connections to each backend

### Environment Variables

Each backend instance receives a unique `INSTANCE_ID` environment variable for logging and monitoring purposes.

## Benefits

### 1. Improved Performance
- Distributes load across multiple instances
- Reduces response times during peak usage
- Enables horizontal scaling

### 2. High Availability
- Automatic failover when one instance fails
- Health checks ensure only healthy instances receive traffic
- Reduced downtime during maintenance

### 3. Scalability
- Easy to add more backend instances
- Dynamic load distribution
- Resource utilization optimization

### 4. Reliability
- Fault isolation between instances
- Graceful degradation
- Better error handling

## Load Balancing Algorithms

### Round Robin (Default)
Distributes requests evenly across all available servers in rotation.

### Weighted Round Robin
Servers can be assigned different weights based on their capacity.

### Least Connections
Sends requests to the server with the fewest active connections.

### IP Hash
Uses the client's IP address to determine which server receives the request (sticky sessions).

## Health Checks

NGINX performs passive health checks by monitoring:
- Connection failures
- Timeout errors
- HTTP error responses

When a server fails, it's marked as unavailable for the `fail_timeout` period.

## Session Affinity

Currently, session affinity is disabled. If needed, it can be enabled by uncommenting the relevant lines in the NGINX configuration:

```nginx
# Enable sticky sessions if needed
# proxy_set_header X-Session-ID $cookie_sessionid;
```

## Monitoring

Each backend instance logs its `INSTANCE_ID` to help with debugging and monitoring:

```
[INFO] Server is running on port 3001 { instanceId: "1" }
```

## Scaling

To add more backend instances:

1. Add a new service definition in `docker-compose.yml`
2. Update the upstream block in NGINX configuration
3. Adjust resource limits as needed

## Testing

### Verify Instances Are Running
```bash
docker ps | grep synergycoach_backend
```

### Test Load Balancing
```bash
# Make multiple requests and check logs for different instance IDs
curl http://localhost:3001/health
```

### Check NGINX Configuration
```bash
docker exec nginx_proxy nginx -t
```

## Failover Behavior

When a backend instance becomes unavailable:
1. NGINX marks it as failed after `max_fails` consecutive failures
2. Traffic is redirected to healthy instances
3. NGINX retries the failed instance after `fail_timeout` seconds
4. If all instances fail, clients receive 502 Bad Gateway errors

## Performance Considerations

### Connection Pooling
NGINX maintains keepalive connections to backend instances to reduce connection overhead.

### Caching
Consider implementing caching strategies to reduce load on backend instances.

### Resource Allocation
Ensure adequate CPU and memory allocation for all instances.

## Security

### Network Isolation
All services run on an internal Docker network for security.

### Header Management
Security headers are properly configured in NGINX.

### Rate Limiting
Rate limiting is maintained through NGINX configuration.

## Maintenance

### Rolling Updates
Update instances one at a time to maintain availability.

### Log Aggregation
Centralize logs from all instances for easier monitoring.

### Health Monitoring
Monitor instance health through NGINX and application logs.