package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/bravo68web/stasis/internal/application/service"
	"github.com/bravo68web/stasis/internal/config"
	"github.com/bravo68web/stasis/internal/domain/models"
	"github.com/bravo68web/stasis/internal/domain/repository"
)

// ---------------------------------------------------------------------------
// mockRepoRepo implements repository.RepoRepository for testing.
//
// FindByOwnerUsernameAndNameFn is the only function exercised by CI handler
// permission checks.  All other methods panic if called, which would
// indicate a test drifting out of scope.
// ---------------------------------------------------------------------------

type mockRepoRepo struct {
	FindByOwnerUsernameAndNameFn func(ctx context.Context, username, name string) (*models.Repository, error)
}

func (m *mockRepoRepo) Create(_ context.Context, _ *models.Repository) error {
	panic("unexpected call")
}
func (m *mockRepoRepo) FindByID(_ context.Context, _ uuid.UUID) (*models.Repository, error) {
	panic("unexpected call")
}
func (m *mockRepoRepo) FindByOwnerAndName(_ context.Context, _ uuid.UUID, _ string) (*models.Repository, error) {
	panic("unexpected call")
}
func (m *mockRepoRepo) FindByOwnerUsernameAndName(ctx context.Context, username, name string) (*models.Repository, error) {
	if m.FindByOwnerUsernameAndNameFn != nil {
		return m.FindByOwnerUsernameAndNameFn(ctx, username, name)
	}
	panic("unexpected call")
}
func (m *mockRepoRepo) FindByOwner(_ context.Context, _ uuid.UUID) ([]*models.Repository, error) {
	panic("unexpected call")
}
func (m *mockRepoRepo) ListPublic(_ context.Context, _, _ int) ([]*models.Repository, error) {
	panic("unexpected call")
}
func (m *mockRepoRepo) ListAll(_ context.Context, _, _ int) ([]*models.Repository, error) {
	panic("unexpected call")
}
func (m *mockRepoRepo) Update(_ context.Context, _ *models.Repository) error {
	panic("unexpected call")
}
func (m *mockRepoRepo) Delete(_ context.Context, _ uuid.UUID) error {
	panic("unexpected call")
}
func (m *mockRepoRepo) ExistsByOwnerAndName(_ context.Context, _ uuid.UUID, _ string) (bool, error) {
	panic("unexpected call")
}
func (m *mockRepoRepo) CountByOwner(_ context.Context, _ uuid.UUID) (int64, error) {
	panic("unexpected call")
}
func (m *mockRepoRepo) FindAllMirrors(_ context.Context) ([]*models.Repository, error) {
	panic("unexpected call")
}
func (m *mockRepoRepo) CheckCollaboratorAccess(_ context.Context, _, _ uuid.UUID) (bool, error) {
	panic("unexpected call")
}

// Compile-time check that mockRepoRepo satisfies the interface.
var _ repository.RepoRepository = (*mockRepoRepo)(nil)

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const testWebhookSecret = "super-secret-webhook-value"
const testCIServiceKey = "test-ci-api-key-42"

var (
	ownerID    = uuid.New()
	adminID    = uuid.New()
	strangerID = uuid.New()
	repoID     = uuid.New()
)

func testUser(id uuid.UUID, username string, isAdmin bool) *models.User {
	return &models.User{
		ID:       id,
		Username: username,
		IsAdmin:  isAdmin,
	}
}

// newTestCIHandler builds a CIHandler backed by a real (but idle) CIService.
func newTestCIHandler(t *testing.T, repoRepo *mockRepoRepo) *CIHandler {
	t.Helper()

	ciCfg := &config.CIConfig{
		Enabled:        true,
		ServerURL:      "http://localhost:19999",
		TimeoutSeconds: 5,
	}
	ciService := service.NewCIService(ciCfg, repoRepo)

	return NewCIHandler(ciService, repoRepo, testWebhookSecret)
}

// requireServiceToken replicates the Bearer-token middleware from
// internal/transport/http/router.RequireServiceToken so that we can
// exercise the full authentication stack without a circular import.
func requireServiceToken(apiKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if apiKey == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "CI service token not configured",
			})
			return
		}

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || len(authHeader) < 8 || authHeader[:7] != "Bearer " {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "missing or invalid Authorization header",
			})
			return
		}

		token := authHeader[7:]
		if token != apiKey {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "invalid service token",
			})
			return
		}

		c.Next()
	}
}

// startFakeCIRunner starts an httptest.Server that emulates the CI runner's
// POST /api/v1/jobs endpoint, returning 202 with a valid job response.
func startFakeCIRunner(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/jobs", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		fmt.Fprint(w, `{"job_id":"00000000-0000-0000-0000-000000000001","run_id":"00000000-0000-0000-0000-000000000002","status":"queued"}`)
	})
	return httptest.NewServer(mux)
}

// ---------------------------------------------------------------------------
// ReceiveLogs: Bearer-token authentication (RequireServiceToken middleware)
// ---------------------------------------------------------------------------

func setupReceiveLogsRouter(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)

	repoRepo := &mockRepoRepo{}
	h := newTestCIHandler(t, repoRepo)

	r := gin.New()
	ciGroup := r.Group("/api/v1/ci")
	ciGroup.Use(requireServiceToken(testCIServiceKey))
	{
		ciGroup.POST("/jobs/:job_id/logs", h.ReceiveLogs)
	}
	return r
}

func validLogEntries() []service.CIRunnerLogEntry {
	msg := "hello"
	return []service.CIRunnerLogEntry{
		{
			JobID:     uuid.New(),
			RunID:     uuid.New(),
			Timestamp: time.Now().UTC(),
			Level:     "info",
			StepName:  &msg,
			Message:   "test log line",
			Sequence:  1,
		},
	}
}

func TestReceiveLogs_ValidBearerToken(t *testing.T) {
	r := setupReceiveLogsRouter(t)

	body, _ := json.Marshal(validLogEntries())
	req := httptest.NewRequest(http.MethodPost, "/api/v1/ci/jobs/"+uuid.New().String()+"/logs", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+testCIServiceKey)
	req.Header.Set("X-Webhook-Secret", testWebhookSecret)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if resp["message"] != "Logs received" {
		t.Fatalf("unexpected message: %v", resp["message"])
	}
}

func TestReceiveLogs_MissingToken(t *testing.T) {
	r := setupReceiveLogsRouter(t)

	body, _ := json.Marshal(validLogEntries())
	req := httptest.NewRequest(http.MethodPost, "/api/v1/ci/jobs/"+uuid.New().String()+"/logs", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestReceiveLogs_InvalidToken(t *testing.T) {
	r := setupReceiveLogsRouter(t)

	body, _ := json.Marshal(validLogEntries())
	req := httptest.NewRequest(http.MethodPost, "/api/v1/ci/jobs/"+uuid.New().String()+"/logs", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer totally-wrong-token")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

// ---------------------------------------------------------------------------
// ReceiveLogs: Webhook-secret validation
// ---------------------------------------------------------------------------

func TestReceiveLogs_WebhookSecret_Valid(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repoRepo := &mockRepoRepo{}
	h := newTestCIHandler(t, repoRepo)

	r := gin.New()
	r.POST("/api/v1/ci/jobs/:job_id/logs", h.ReceiveLogs)

	body, _ := json.Marshal(validLogEntries())
	req := httptest.NewRequest(http.MethodPost, "/api/v1/ci/jobs/"+uuid.New().String()+"/logs", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Webhook-Secret", testWebhookSecret)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestReceiveLogs_WebhookSecret_Invalid(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repoRepo := &mockRepoRepo{}
	h := newTestCIHandler(t, repoRepo)

	r := gin.New()
	r.POST("/api/v1/ci/jobs/:job_id/logs", h.ReceiveLogs)

	body, _ := json.Marshal(validLogEntries())
	req := httptest.NewRequest(http.MethodPost, "/api/v1/ci/jobs/"+uuid.New().String()+"/logs", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Webhook-Secret", "wrong-secret")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestReceiveLogs_WebhookSecret_Missing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repoRepo := &mockRepoRepo{}
	h := newTestCIHandler(t, repoRepo)

	r := gin.New()
	r.POST("/api/v1/ci/jobs/:job_id/logs", h.ReceiveLogs)

	body, _ := json.Marshal(validLogEntries())
	req := httptest.NewRequest(http.MethodPost, "/api/v1/ci/jobs/"+uuid.New().String()+"/logs", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestReceiveLogs_WebhookSecret_EmptyConfig(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repoRepo := &mockRepoRepo{}
	ciCfg := &config.CIConfig{
		Enabled:        true,
		ServerURL:      "http://localhost:19999",
		TimeoutSeconds: 5,
	}
	ciService := service.NewCIService(ciCfg, repoRepo)
	h := NewCIHandler(ciService, repoRepo, "") // empty secret

	r := gin.New()
	r.POST("/api/v1/ci/jobs/:job_id/logs", h.ReceiveLogs)

	body, _ := json.Marshal(validLogEntries())
	req := httptest.NewRequest(http.MethodPost, "/api/v1/ci/jobs/"+uuid.New().String()+"/logs", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 (empty secret = always pass), got %d: %s", w.Code, w.Body.String())
	}
}

// ---------------------------------------------------------------------------
// validateWebhookSecret unit tests (direct function coverage)
// ---------------------------------------------------------------------------

func TestValidateWebhookSecret(t *testing.T) {
	tests := []struct {
		name       string
		secret     string
		headerVal  string
		setHeader  bool
		wantResult bool
	}{
		{"empty config always passes", "", "", false, true},
		{"empty config passes even with header", "", "something", true, true},
		{"matching secret passes", "s3cret", "s3cret", true, true},
		{"mismatched secret fails", "s3cret", "wrong", true, false},
		{"missing header fails when secret set", "s3cret", "", false, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			req := httptest.NewRequest(http.MethodPost, "/", nil)
			if tt.setHeader {
				req.Header.Set("X-Webhook-Secret", tt.headerVal)
			}
			c.Request = req

			got := validateWebhookSecret(c, tt.secret)
			if got != tt.wantResult {
				t.Fatalf("validateWebhookSecret() = %v, want %v", got, tt.wantResult)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// TriggerJob permission checks
//
// These tests lock in the fix that allows admin users to trigger CI jobs
// on repositories they do not own.
// ---------------------------------------------------------------------------

// triggerJobTestCase describes a single TriggerJob permission scenario.
type triggerJobTestCase struct {
	name       string
	setUser    bool           // whether to inject a user into gin context
	user       *models.User   // the user to inject (nil when setUser=false)
	repoOwner  uuid.UUID      // OwnerID of the test repository
	wantStatus int            // expected HTTP status code
	wantBody   string         // substring expected in the response body
}

func TestTriggerJob_PermissionChecks(t *testing.T) {
	tests := []triggerJobTestCase{
		{
			name:       "unauthenticated request gets 401",
			setUser:    false,
			repoOwner:  ownerID,
			wantStatus: http.StatusUnauthorized,
			wantBody:   "unauthorized",
		},
		{
			name:       "non-owner non-admin gets 403",
			setUser:    true,
			user:       testUser(strangerID, "stranger", false),
			repoOwner:  ownerID,
			wantStatus: http.StatusForbidden,
			wantBody:   "permission denied",
		},
		{
			name:       "owner can access",
			setUser:    true,
			user:       testUser(ownerID, "owner", false),
			repoOwner:  ownerID,
			wantStatus: http.StatusAccepted,
			wantBody:   "Job triggered successfully",
		},
		{
			name:       "admin can access any repo",
			setUser:    true,
			user:       testUser(adminID, "admin", true),
			repoOwner:  ownerID, // admin is NOT the owner
			wantStatus: http.StatusAccepted,
			wantBody:   "Job triggered successfully",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			runTriggerJobTest(t, tt)
		})
	}
}

func runTriggerJobTest(t *testing.T, tt triggerJobTestCase) {
	t.Helper()

	gin.SetMode(gin.TestMode)

	// Set up a fake CI runner for tests that pass the permission check.
	var fakeCI *httptest.Server
	if tt.wantStatus == http.StatusAccepted {
		fakeCI = startFakeCIRunner(t)
		defer fakeCI.Close()
	}

	repoRepo := &mockRepoRepo{
		FindByOwnerUsernameAndNameFn: func(_ context.Context, _, _ string) (*models.Repository, error) {
			return &models.Repository{
				ID:      repoID,
				Name:    "myrepo",
				OwnerID: tt.repoOwner,
			}, nil
		},
	}

	// Build CIService pointing at the fake runner (or a dummy URL for
	// tests that never reach the service layer).
	ciServerURL := "http://invalid.test"
	if fakeCI != nil {
		ciServerURL = fakeCI.URL
	}
	ciCfg := &config.CIConfig{
		Enabled:        true,
		ServerURL:      ciServerURL,
		ConfigPath:     ".stasis-ci.yaml",
		TimeoutSeconds: 5,
	}
	ciService := service.NewCIService(ciCfg, repoRepo)
	handler := NewCIHandler(ciService, repoRepo, "")

	// Wire up the route with an optional user-injecting middleware.
	router := gin.New()
	if tt.setUser {
		router.Use(func(c *gin.Context) {
			c.Set("user", tt.user)
			c.Next()
		})
	}
	router.POST("/api/v1/repos/:owner/:repo/ci/jobs", handler.TriggerJob)

	body := `{"commit_sha":"abc123def","ref_name":"main","ref_type":"branch"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/repos/owner/myrepo/ci/jobs", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != tt.wantStatus {
		t.Errorf("expected status %d, got %d; body: %s", tt.wantStatus, w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), tt.wantBody) {
		t.Errorf("expected %q in response body, got: %s", tt.wantBody, w.Body.String())
	}
}
