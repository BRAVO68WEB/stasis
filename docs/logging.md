# Stasis AIO Logging

## Log Locations

All logs are stored in the `logs/` directory with the following structure:

```
logs/
├── stasis/
│   ├── api.log           # API server logs (JSON structured)
│   ├── api-error.log     # API error logs
│   ├── web.log           # Web frontend logs
│   └── web-error.log     # Web frontend errors
├── nginx/
│   ├── access.log        # Nginx access logs
│   └── error.log         # Nginx error logs
└── supervisord/
    ├── supervisord.log   # Process manager logs
    ├── logrotate.log     # Log rotation logs
    └── logrotate-error.log
```

## Log Rotation

Logs are automatically rotated with the following settings:

| Log Type | Max Size | Retention | Compression |
|----------|----------|-----------|-------------|
| API/Web | 50MB | 5 backups | Yes |
| Nginx | 10MB | 3 backups | Yes |
| Supervisord | Default | 4 weeks | Yes |

## Viewing Logs

### Using the helper script

```bash
# Show last 50 lines of API logs
./scripts/view-logs.sh api

# Follow API logs in real-time
./scripts/view-logs.sh api -f

# Show last 100 lines
./scripts/view-logs.sh api -n 100

# Show error logs only
./scripts/view-logs.sh api -e

# Show all logs
./scripts/view-logs.sh all

# Follow all logs
./scripts/view-logs.sh all -f
```

### Using Docker commands

```bash
# View container logs (stdout/stderr)
docker logs stasis-aio-test

# Follow container logs
docker logs -f stasis-aio-test

# View specific log file in container
docker exec stasis-aio-test cat /var/log/stasis/api.log

# Follow log file in container
docker exec -it stasis-aio-test tail -f /var/log/stasis/api.log
```

### Using standard tools

```bash
# View API logs
tail -f logs/stasis/api.log

# View with jq for JSON formatting
tail -f logs/stasis/api.log | jq .

# Search for errors
grep -i error logs/stasis/*.log

# View nginx access logs
tail -f logs/nginx/access.log
```

## Log Format

### API Logs (JSON)

```json
{
  "level": "info",
  "timestamp": "2026-07-18T16:21:57.614Z",
  "caller": "gin@v1.11.0/context.go:192",
  "message": "HTTP Request",
  "request_id": "20260718162157.614474469",
  "method": "GET",
  "path": "/",
  "status_code": 200,
  "latency": 0.000013333,
  "latency_human": "13.333µs",
  "client_ip": "::1",
  "user_agent": "Wget/1.25.0",
  "body_size": 3,
  "protocol": "HTTP/1.1"
}
```

### Nginx Access Logs

```
::1 - - [18/Jul/2026:16:20:03 +0000] "GET /health HTTP/1.1" 200 3 "-" "Wget/1.25.0" "-"
```

## Configuration

Log behavior is configured in:

- `deploy/supervisord.conf` - Log file locations and rotation
- `deploy/logrotate.conf` - Log rotation policies
- `configs/config.yaml` - API logging level and format

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `STASIS_SERVER_MODE` | Server mode (debug/release) | `release` |
| `LOG_LEVEL` | Log level (debug/info/warn/error) | `info` |

## Production Recommendations

1. **Use log aggregation** - Send logs to ELK, Loki, or CloudWatch
2. **Monitor error logs** - Set up alerts on `api-error.log` and `web-error.log`
3. **Centralized logging** - Use Docker logging drivers or OTEL
4. **Log retention** - Adjust rotation policies based on disk space
5. **Structured queries** - Use jq or similar tools for JSON log analysis
