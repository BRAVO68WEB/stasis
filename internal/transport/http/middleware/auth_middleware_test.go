package middleware

import (
	"context"
	"encoding/base64"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/bravo68web/stasis/internal/domain/models"
	"github.com/bravo68web/stasis/internal/domain/service"
)

// mockAuthService implements service.AuthService for testing.
type mockAuthService struct {
	sessionTokens map[string]*models.User // token -> user
	patTokens     map[string]*models.User // token -> user
}

var _ service.AuthService = (*mockAuthService)(nil)

func (m *mockAuthService) AuthenticateToken(_ context.Context, token string) (*models.User, error) {
	if u, ok := m.patTokens[token]; ok {
		return u, nil
	}
	return nil, errors.New("invalid PAT")
}

func (m *mockAuthService) AuthenticateSession(_ context.Context, token string) (*models.User, error) {
	if u, ok := m.sessionTokens[token]; ok {
		return u, nil
	}
	return nil, errors.New("invalid session")
}

func (m *mockAuthService) AuthenticateSSH(_ context.Context, _ []byte) (*models.User, error) {
	return nil, errors.New("not implemented")
}

func newTestUser(username string, isAdmin bool) *models.User {
	return &models.User{
		ID:       uuid.New(),
		Username: username,
		Email:    username + "@test.com",
		IsAdmin:  isAdmin,
	}
}

func newTestMiddleware(auth service.AuthService) *AuthMiddleware {
	return NewAuthMiddleware(auth)
}

// --- Tests ---

// TestNoDebugPrintln verifies that the auth middleware does not emit raw
// println output (a regression test for a previous debug println fix).
func TestNoDebugPrintln(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Capture stderr.
	oldStderr := os.Stderr
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("os.Pipe: %v", err)
	}
	os.Stderr = w

	t.Cleanup(func() {
		w.Close()
		os.Stderr = oldStderr
	})

	mw := newTestMiddleware(&mockAuthService{})

	router := gin.New()
	router.Use(mw.RequireAuth())
	router.GET("/test", func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	// Request with no auth header (triggers the warn/error path).
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	// Close writer and read stderr.
	w.Close()
	var buf [4096]byte
	n, _ := r.Read(buf[:])
	stderrOutput := string(buf[:n])

	// println in Go writes to stderr. Verify none was emitted.
	// Structured log lines are JSON; a raw println would be bare text without JSON.
	for _, line := range strings.Split(stderrOutput, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "{") {
			// Structured JSON log line – expected.
			continue
		}
		t.Errorf("unexpected non-JSON stderr line (possible raw println): %q", line)
	}
}

// TestBearerTokenAuth verifies that a valid Bearer session token authenticates
// the user and sets it in the gin context.
func TestBearerTokenAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)

	user := newTestUser("alice", false)
	auth := &mockAuthService{
		sessionTokens: map[string]*models.User{
			"valid-session-token": user,
		},
	}
	mw := newTestMiddleware(auth)

	router := gin.New()
	router.Use(mw.RequireAuth())
	router.GET("/protected", func(c *gin.Context) {
		got := GetUserFromContext(c)
		if got == nil {
			t.Errorf("expected user in context, got nil")
			c.String(http.StatusInternalServerError, "no user")
			return
		}
		c.String(http.StatusOK, got.Username)
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer valid-session-token")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "alice") {
		t.Errorf("expected body to contain 'alice', got %q", rec.Body.String())
	}
}

// TestBasicAuthPAT verifies that Basic auth with a PAT as the password
// authenticates the user correctly (Git HTTP protocol pattern).
func TestBasicAuthPAT(t *testing.T) {
	gin.SetMode(gin.TestMode)

	user := newTestUser("gituser", false)
	auth := &mockAuthService{
		patTokens: map[string]*models.User{
			"my-personal-access-token": user,
		},
	}
	mw := newTestMiddleware(auth)

	router := gin.New()
	router.Use(mw.RequireAuth())
	router.GET("/repo.git/info/refs", func(c *gin.Context) {
		got := GetUserFromContext(c)
		if got == nil {
			t.Errorf("expected user in context, got nil")
			c.String(http.StatusInternalServerError, "no user")
			return
		}
		c.String(http.StatusOK, got.Username)
	})

	cred := base64.StdEncoding.EncodeToString([]byte("gituser:my-personal-access-token"))
	req := httptest.NewRequest(http.MethodGet, "/repo.git/info/refs", nil)
	req.Header.Set("Authorization", "Basic "+cred)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "gituser") {
		t.Errorf("expected body to contain 'gituser', got %q", rec.Body.String())
	}
}

// TestInvalidToken verifies that an invalid Bearer token returns 401.
func TestInvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	auth := &mockAuthService{} // no valid tokens
	mw := newTestMiddleware(auth)

	router := gin.New()
	router.Use(mw.RequireAuth())
	router.GET("/protected", func(c *gin.Context) {
		c.String(http.StatusOK, "should not reach here")
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer totally-invalid-token")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

// TestEmptyAuthHeader verifies that a request with no Authorization header
// returns 401 when auth is required.
func TestEmptyAuthHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)

	auth := &mockAuthService{}
	mw := newTestMiddleware(auth)

	router := gin.New()
	router.Use(mw.RequireAuth())
	router.GET("/protected", func(c *gin.Context) {
		c.String(http.StatusOK, "should not reach here")
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	// No Authorization header set.
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

// TestBearerTokenFallsToPAT verifies that if session auth fails for a Bearer
// token, the middleware falls through to PAT authentication.
func TestBearerTokenFallsToPAT(t *testing.T) {
	gin.SetMode(gin.TestMode)

	user := newTestUser("patuser", false)
	auth := &mockAuthService{
		// No session tokens – only PATs.
		patTokens: map[string]*models.User{
			"my-pat-token": user,
		},
	}
	mw := newTestMiddleware(auth)

	router := gin.New()
	router.Use(mw.RequireAuth())
	router.GET("/protected", func(c *gin.Context) {
		got := GetUserFromContext(c)
		if got == nil {
			t.Errorf("expected user in context, got nil")
			c.String(http.StatusInternalServerError, "no user")
			return
		}
		c.String(http.StatusOK, got.Username)
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer my-pat-token")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "patuser") {
		t.Errorf("expected 'patuser' in body, got %q", rec.Body.String())
	}
}
