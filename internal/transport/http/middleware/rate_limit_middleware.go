package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"

	"github.com/bravo68web/stasis/pkg/logger"
)

// RateLimitConfig holds configuration for the rate limiting middleware.
type RateLimitConfig struct {
	// RequestsPerMinute is the maximum number of requests allowed per IP per minute.
	// A value of 0 or negative disables rate limiting.
	RequestsPerMinute int

	// Burst is the maximum burst size above the steady rate.
	// Defaults to RequestsPerMinute/5 if not set (minimum 1).
	Burst int
}

// ipEntry holds a rate limiter and its last-access time for an IP.
type ipEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// RateLimitMiddleware returns a gin.HandlerFunc that applies per-IP rate limiting.
// It uses a token-bucket algorithm via golang.org/x/time/rate.
// Stale entries (unused for >10 minutes) are periodically cleaned up.
func RateLimitMiddleware(cfg RateLimitConfig) gin.HandlerFunc {
	if cfg.RequestsPerMinute <= 0 {
		// Rate limiting disabled; return a no-op middleware.
		return func(c *gin.Context) {
			c.Next()
		}
	}

	log := logger.Get().WithFields(logger.Component("rate-limit"))

	// Convert requests/minute to requests/second for the rate limiter.
	rps := rate.Limit(float64(cfg.RequestsPerMinute) / 60.0)
	burst := cfg.Burst
	if burst <= 0 {
		burst = cfg.RequestsPerMinute / 5
		if burst < 1 {
			burst = 1
		}
	}

	var (
		mu      sync.Mutex
		clients = make(map[string]*ipEntry)
	)

	// Background cleanup goroutine: evict IPs unused for >10 minutes.
	go func() {
		ticker := time.NewTicker(3 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			mu.Lock()
			for ip, entry := range clients {
				if time.Since(entry.lastSeen) > 10*time.Minute {
					delete(clients, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		ip := c.ClientIP()

		mu.Lock()
		entry, exists := clients[ip]
		if !exists {
			entry = &ipEntry{
				limiter: rate.NewLimiter(rps, burst),
			}
			clients[ip] = entry
		}
		entry.lastSeen = time.Now()
		limiter := entry.limiter
		mu.Unlock()

		if !limiter.Allow() {
			log.Warn("rate limit exceeded",
				logger.ClientIP(ip),
				logger.Path(c.Request.URL.Path),
				logger.Method(c.Request.Method),
			)
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":   "too_many_requests",
				"message": "rate limit exceeded, please try again later",
			})
			return
		}

		c.Next()
	}
}
