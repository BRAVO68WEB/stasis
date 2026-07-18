package handler

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/bravo68web/stasis/internal/application/dto"
	"github.com/bravo68web/stasis/internal/application/service"
	"github.com/bravo68web/stasis/internal/transport/http/middleware"
	"github.com/bravo68web/stasis/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// RepoHandler handles repository-related HTTP requests
type RepoHandler struct {
	repoService       *service.RepoService
	mirrorSyncService *service.MirrorSyncService
	baseURL           string
	sshHost           string
	sshPort           int
	log               *logger.Logger
}

// NewRepoHandler creates a new RepoHandler instance
func NewRepoHandler(
	repoService *service.RepoService,
	mirrorSyncService *service.MirrorSyncService,
	baseURL string,
	sshHost string,
	sshPort int,
) *RepoHandler {
	return &RepoHandler{
		repoService:       repoService,
		mirrorSyncService: mirrorSyncService,
		baseURL:           baseURL,
		sshHost:           sshHost,
		sshPort:           sshPort,
		log:               logger.Get().WithFields(logger.Component("repo-handler")),
	}
}

// CreateRepository handles POST /api/repos
func (h *RepoHandler) CreateRepository(c *gin.Context) {
	user := middleware.GetUserFromContext(c)
	if user == nil {
		h.log.Warn("Create repository attempted without authentication",
			logger.ClientIP(c.ClientIP()),
		)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "Authentication required",
		})
		return
	}

	h.log.Debug("Create repository request received",
		logger.String("user_id", user.ID.String()),
		logger.String("username", user.Username),
	)

	var req dto.CreateRepoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.log.Warn("Invalid create repository request body",
			logger.Error(err),
			logger.String("user_id", user.ID.String()),
		)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Validate request
	if err := req.Validate(); err != nil {
		h.log.Warn("Repository validation failed",
			logger.Error(err),
			logger.String("name", req.Name),
		)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	h.log.Info("Creating repository",
		logger.String("name", req.Name),
		logger.String("owner", user.Username),
		logger.Bool("is_private", req.IsPrivate),
	)

	// Create repository
	repo, err := h.repoService.CreateRepository(
		c.Request.Context(),
		user.ID,
		req.Name,
		req.Description,
		req.IsPrivate,
	)
	if err != nil {
		h.log.Error("Failed to create repository",
			logger.Error(err),
			logger.String("name", req.Name),
			logger.String("owner", user.Username),
		)
		handleError(c, h.log, err)
		return
	}

	h.log.Info("Repository created successfully",
		logger.String("repo_id", repo.ID.String()),
		logger.String("name", repo.Name),
		logger.String("owner", user.Username),
	)

	// Build response
	response := dto.RepoFromModel(repo, h.baseURL, h.sshHost, h.sshPort)

	c.JSON(http.StatusCreated, response)
}

// ImportRepository imports a repository from an external Git source
func (h *RepoHandler) ImportRepository(c *gin.Context) {
	user := middleware.GetUserFromContext(c)
	if user == nil {
		h.log.Warn("Import repository attempted without authentication",
			logger.ClientIP(c.ClientIP()),
		)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "Authentication required",
		})
		return
	}

	h.log.Debug("Import repository request received",
		logger.String("user_id", user.ID.String()),
		logger.String("username", user.Username),
	)

	var req dto.ImportRepoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.log.Warn("Invalid import repository request body",
			logger.Error(err),
			logger.String("user_id", user.ID.String()),
		)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Validate request
	if err := req.Validate(); err != nil {
		h.log.Warn("Repository import validation failed",
			logger.Error(err),
			logger.String("name", req.Name),
			logger.String("clone_url", req.CloneURL),
		)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": err.Error(),
		})
		return
	}

	h.log.Info("Importing repository",
		logger.String("name", req.Name),
		logger.String("owner", user.Username),
		logger.String("clone_url", req.CloneURL),
		logger.Bool("is_private", req.IsPrivate),
		logger.Bool("mirror", req.Mirror),
	)

	// Import repository
	repo, err := h.repoService.ImportRepository(
		c.Request.Context(),
		user.ID,
		req.Name,
		req.Description,
		req.CloneURL,
		req.Username,
		req.Password,
		req.IsPrivate,
		req.Mirror,
	)
	if err != nil {
		h.log.Error("Failed to import repository",
			logger.Error(err),
			logger.String("name", req.Name),
			logger.String("owner", user.Username),
			logger.String("clone_url", req.CloneURL),
		)
		handleError(c, h.log, err)
		return
	}

	h.log.Info("Repository imported successfully",
		logger.String("repo_id", repo.ID.String()),
		logger.String("name", repo.Name),
		logger.String("owner", user.Username),
		logger.String("clone_url", req.CloneURL),
		logger.Bool("mirror", req.Mirror),
	)

	// Build response
	response := dto.RepoFromModel(repo, h.baseURL, h.sshHost, h.sshPort)

	c.JSON(http.StatusCreated, response)
}

// ListRepositories lists all repositories for the authenticated user
func (h *RepoHandler) ListRepositories(c *gin.Context) {
	user := middleware.GetUserFromContext(c)
	if user == nil {
		h.log.Warn("List repositories attempted without authentication",
			logger.ClientIP(c.ClientIP()),
		)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "Authentication required",
		})
		return
	}

	h.log.Debug("Listing repositories for user",
		logger.String("user_id", user.ID.String()),
		logger.String("username", user.Username),
	)

	repos, err := h.repoService.ListUserRepositories(c.Request.Context(), user.ID)
	if err != nil {
		h.log.Error("Failed to list user repositories",
			logger.Error(err),
			logger.String("user_id", user.ID.String()),
		)
		handleError(c, h.log, err)
		return
	}

	h.log.Debug("Found repositories",
		logger.String("username", user.Username),
		logger.Int("count", len(repos)),
	)

	// Convert to response DTOs
	responses := make([]dto.RepoResponse, len(repos))
	for i, repo := range repos {
		responses[i] = dto.RepoFromModel(repo, h.baseURL, h.sshHost, h.sshPort)
	}

	c.JSON(http.StatusOK, gin.H{
		"repositories": responses,
		"total":        len(responses),
	})
}

// ListPublicRepositories handles GET /api/repos/public
func (h *RepoHandler) ListPublicRepositories(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	offset := (page - 1) * perPage

	h.log.Debug("Listing public repositories",
		logger.Int("page", page),
		logger.Int("per_page", perPage),
	)

	repos, err := h.repoService.ListPublicRepositories(c.Request.Context(), perPage, offset)
	if err != nil {
		h.log.Error("Failed to list public repositories",
			logger.Error(err),
		)
		handleError(c, h.log, err)
		return
	}

	h.log.Debug("Found public repositories",
		logger.Int("count", len(repos)),
	)

	// Convert to response DTOs
	responses := make([]dto.RepoResponse, len(repos))
	for i, repo := range repos {
		responses[i] = dto.RepoFromModel(repo, h.baseURL, h.sshHost, h.sshPort)
	}

	c.JSON(http.StatusOK, gin.H{
		"repositories": responses,
		"page":         page,
		"per_page":     perPage,
		"total":        len(responses),
	})
}

// GetRepository handles GET /api/repos/:owner/:repo
func (h *RepoHandler) GetRepository(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")

	h.log.Debug("Getting repository",
		logger.String("owner", owner),
		logger.String("repo", repoName),
	)

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		h.log.Debug("Repository not found",
			logger.String("owner", owner),
			logger.String("repo", repoName),
			logger.Error(err),
		)
		handleError(c, h.log, err)
		return
	}

	// Check access for private repos
	user := middleware.GetUserFromContext(c)
	if repo.IsPrivate {
		if user == nil {
			h.log.Debug("Anonymous user attempted to access private repository",
				logger.String("owner", owner),
				logger.String("repo", repoName),
			)
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "not_found",
				"message": "Repository not found",
			})
			return
		}
		if user.ID != repo.OwnerID && !user.IsAdmin {
			h.log.Debug("User attempted to access private repository without permission",
				logger.String("user_id", user.ID.String()),
				logger.String("owner", owner),
				logger.String("repo", repoName),
			)
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "not_found",
				"message": "Repository not found",
			})
			return
		}
	}

	h.log.Debug("Repository retrieved successfully",
		logger.String("repo_id", repo.ID.String()),
		logger.String("owner", owner),
		logger.String("repo", repoName),
	)

	response := dto.RepoFromModel(repo, h.baseURL, h.sshHost, h.sshPort)
	c.JSON(http.StatusOK, response)
}

// UpdateRepository handles PATCH /api/repos/:owner/:repo
func (h *RepoHandler) UpdateRepository(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")

	user := middleware.GetUserFromContext(c)
	if user == nil {
		h.log.Warn("Update repository attempted without authentication",
			logger.String("owner", owner),
			logger.String("repo", repoName),
		)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "Authentication required",
		})
		return
	}

	h.log.Debug("Update repository request",
		logger.String("user_id", user.ID.String()),
		logger.String("owner", owner),
		logger.String("repo", repoName),
	)

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		h.log.Debug("Repository not found for update",
			logger.String("owner", owner),
			logger.String("repo", repoName),
			logger.Error(err),
		)
		handleError(c, h.log, err)
		return
	}

	// Check ownership
	if user.ID != repo.OwnerID && !user.IsAdmin {
		h.log.Warn("User attempted to update repository without permission",
			logger.String("user_id", user.ID.String()),
			logger.String("owner", owner),
			logger.String("repo", repoName),
		)
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "You don't have permission to update this repository",
		})
		return
	}

	var req dto.UpdateRepoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.log.Warn("Invalid update repository request body",
			logger.Error(err),
		)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "Invalid request body",
		})
		return
	}

	h.log.Info("Updating repository",
		logger.String("repo_id", repo.ID.String()),
		logger.String("owner", owner),
		logger.String("repo", repoName),
	)

	updatedRepo, err := h.repoService.UpdateRepository(
		c.Request.Context(),
		repo.ID,
		req.Description,
		req.IsPrivate,
		req.DefaultBranch,
	)
	if err != nil {
		h.log.Error("Failed to update repository",
			logger.Error(err),
			logger.String("repo_id", repo.ID.String()),
		)
		handleError(c, h.log, err)
		return
	}

	h.log.Info("Repository updated successfully",
		logger.String("repo_id", repo.ID.String()),
		logger.String("owner", owner),
		logger.String("repo", repoName),
	)

	response := dto.RepoFromModel(updatedRepo, h.baseURL, h.sshHost, h.sshPort)
	c.JSON(http.StatusOK, response)
}

// DeleteRepository handles DELETE /api/repos/:owner/:repo
func (h *RepoHandler) DeleteRepository(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")

	user := middleware.GetUserFromContext(c)
	if user == nil {
		h.log.Warn("Delete repository attempted without authentication",
			logger.String("owner", owner),
			logger.String("repo", repoName),
		)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "Authentication required",
		})
		return
	}

	h.log.Debug("Delete repository request",
		logger.String("user_id", user.ID.String()),
		logger.String("owner", owner),
		logger.String("repo", repoName),
	)

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		h.log.Debug("Repository not found for deletion",
			logger.String("owner", owner),
			logger.String("repo", repoName),
			logger.Error(err),
		)
		handleError(c, h.log, err)
		return
	}

	// Check ownership
	if user.ID != repo.OwnerID && !user.IsAdmin {
		h.log.Warn("User attempted to delete repository without permission",
			logger.String("user_id", user.ID.String()),
			logger.String("owner", owner),
			logger.String("repo", repoName),
		)
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "You don't have permission to delete this repository",
		})
		return
	}

	h.log.Info("Deleting repository",
		logger.String("repo_id", repo.ID.String()),
		logger.String("owner", owner),
		logger.String("repo", repoName),
		logger.String("deleted_by", user.Username),
	)

	if err := h.repoService.DeleteRepository(c.Request.Context(), repo.ID); err != nil {
		h.log.Error("Failed to delete repository",
			logger.Error(err),
			logger.String("repo_id", repo.ID.String()),
		)
		handleError(c, h.log, err)
		return
	}

	h.log.Info("Repository deleted successfully",
		logger.String("repo_id", repo.ID.String()),
		logger.String("owner", owner),
		logger.String("repo", repoName),
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "Repository deleted successfully",
	})
}

// ListBranches handles GET /api/repos/:owner/:repo/branches
func (h *RepoHandler) ListBranches(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	// Check access
	user := middleware.GetUserFromContext(c)
	if repo.IsPrivate && (user == nil || (user.ID != repo.OwnerID && !user.IsAdmin)) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Repository not found",
		})
		return
	}

	branches, err := h.repoService.ListBranches(c.Request.Context(), repo)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	responses := make([]dto.BranchResponse, len(branches))
	for i, branch := range branches {
		responses[i] = dto.BranchResponse{
			Name:   branch.Name,
			Hash:   branch.Hash,
			IsHead: branch.IsHead,
		}
	}

	c.JSON(http.StatusOK, dto.BranchListResponse{
		Branches: responses,
		Total:    len(responses),
	})
}

// CreateBranch handles POST /api/repos/:owner/:repo/branches
func (h *RepoHandler) CreateBranch(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")

	user := middleware.GetUserFromContext(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "Authentication required",
		})
		return
	}

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	// Check write access
	if user.ID != repo.OwnerID && !user.IsAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "You don't have permission to create branches",
		})
		return
	}

	var req dto.BranchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "Invalid request body",
		})
		return
	}

	if err := h.repoService.CreateBranch(c.Request.Context(), repo, req.Name, req.CommitHash); err != nil {
		handleError(c, h.log, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Branch created successfully",
		"branch":  req.Name,
	})
}

// DeleteBranch handles DELETE /api/repos/:owner/:repo/branches/:branch
func (h *RepoHandler) DeleteBranch(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")
	branchName := c.Param("branch")

	user := middleware.GetUserFromContext(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "Authentication required",
		})
		return
	}

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	// Check write access
	if user.ID != repo.OwnerID && !user.IsAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "You don't have permission to delete branches",
		})
		return
	}

	if err := h.repoService.DeleteBranch(c.Request.Context(), repo, branchName); err != nil {
		handleError(c, h.log, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Branch deleted successfully",
	})
}

// ListTags handles GET /api/repos/:owner/:repo/tags
func (h *RepoHandler) ListTags(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	// Check access
	user := middleware.GetUserFromContext(c)
	if repo.IsPrivate && (user == nil || (user.ID != repo.OwnerID && !user.IsAdmin)) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Repository not found",
		})
		return
	}

	tags, err := h.repoService.ListTags(c.Request.Context(), repo)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	responses := make([]dto.TagResponse, len(tags))
	for i, tag := range tags {
		responses[i] = dto.TagResponse{
			Name:        tag.Name,
			Hash:        tag.Hash,
			Message:     tag.Message,
			Tagger:      tag.Tagger,
			IsAnnotated: !tag.IsLight,
		}
	}

	c.JSON(http.StatusOK, dto.TagListResponse{
		Tags:  responses,
		Total: len(responses),
	})
}

// CreateTag handles POST /api/repos/:owner/:repo/tags
func (h *RepoHandler) CreateTag(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")

	user := middleware.GetUserFromContext(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "Authentication required",
		})
		return
	}

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	// Check write access
	if user.ID != repo.OwnerID && !user.IsAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "You don't have permission to create tags",
		})
		return
	}

	var req dto.TagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "Invalid request body",
		})
		return
	}

	if err := h.repoService.CreateTag(c.Request.Context(), repo, req.Name, req.CommitHash, req.Message); err != nil {
		handleError(c, h.log, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Tag created successfully",
		"tag":     req.Name,
	})
}

// DeleteTag handles DELETE /api/repos/:owner/:repo/tags/:tag
func (h *RepoHandler) DeleteTag(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")
	tagName := c.Param("tag")

	user := middleware.GetUserFromContext(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "Authentication required",
		})
		return
	}

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	// Check write access
	if user.ID != repo.OwnerID && !user.IsAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "You don't have permission to delete tags",
		})
		return
	}

	if err := h.repoService.DeleteTag(c.Request.Context(), repo, tagName); err != nil {
		handleError(c, h.log, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Tag deleted successfully",
	})
}

// GetRepositoryStats handles GET /api/repos/:owner/:repo/stats
func (h *RepoHandler) GetRepositoryStats(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	// Check access
	user := middleware.GetUserFromContext(c)
	if repo.IsPrivate && (user == nil || (user.ID != repo.OwnerID && !user.IsAdmin)) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Repository not found",
		})
		return
	}

	stats, err := h.repoService.GetRepositoryStats(c.Request.Context(), repo)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	c.JSON(http.StatusOK, stats)
}

func (h *RepoHandler) GetContributors(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	user := middleware.GetUserFromContext(c)
	if repo.IsPrivate && (user == nil || (user.ID != repo.OwnerID && !user.IsAdmin)) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "Repository not found"})
		return
	}

	contributors, err := h.repoService.GetContributors(c.Request.Context(), repo)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"contributors": contributors,
		"total":        len(contributors),
	})
}

// ListCommits handles GET /api/repos/:owner/:repo/commits
func (h *RepoHandler) ListCommits(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	// Check access
	user := middleware.GetUserFromContext(c)
	if repo.IsPrivate && (user == nil || (user.ID != repo.OwnerID && !user.IsAdmin)) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Repository not found",
		})
		return
	}

	// Get query parameters
	ref := c.DefaultQuery("ref", "")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "30"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 30
	}

	offset := (page - 1) * perPage

	commits, err := h.repoService.GetCommits(c.Request.Context(), repo, ref, perPage, offset)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	response := dto.CommitListFromService(commits, ref)
	response.Ref = ref
	if ref == "" {
		response.Ref = "HEAD"
	}

	c.JSON(http.StatusOK, response)
}

// GetCommit handles GET /api/repos/:owner/:repo/commits/:sha
func (h *RepoHandler) GetCommit(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")
	sha := c.Param("sha")

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	// Check access
	user := middleware.GetUserFromContext(c)
	if repo.IsPrivate && (user == nil || (user.ID != repo.OwnerID && !user.IsAdmin)) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Repository not found",
		})
		return
	}

	commit, err := h.repoService.GetCommit(c.Request.Context(), repo, sha)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Commit not found",
		})
		return
	}

	response := dto.CommitFromService(*commit)
	c.JSON(http.StatusOK, response)
}

// GetDiff handles GET /api/v1/repos/:owner/:repo/diff/:hash
// Returns the patch content for a commit.
func (h *RepoHandler) GetDiff(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")
	hash := c.Param("hash")

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	// Access control: allow public reads; require auth for private repos
	user := middleware.GetUserFromContext(c)
	if repo.IsPrivate && (user == nil || (user.ID != repo.OwnerID && !user.IsAdmin)) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Repository not found",
		})
		return
	}

	if hash == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "Commit hash is required",
		})
		return
	}

	diffResult, err := h.repoService.GetDiff(c.Request.Context(), repo, hash)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Diff not found",
			"details": err.Error(),
		})
		return
	}

	response := dto.DiffFromService(diffResult)
	c.JSON(http.StatusOK, response)
}

// GetCompareDiff handles GET /api/v1/repos/:owner/:repo/compare/:range
func (h *RepoHandler) GetCompareDiff(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")
	rng := c.Param("range")
	parts := strings.Split(rng, "..")
	if len(parts) != 2 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "Range must be in format <from>..<to>",
		})
		return
	}

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	user := middleware.GetUserFromContext(c)
	if repo.IsPrivate && (user == nil || (user.ID != repo.OwnerID && !user.IsAdmin)) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Repository not found",
		})
		return
	}

	diffResult, err := h.repoService.GetCompareDiff(c.Request.Context(), repo, parts[0], parts[1])
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Diff not found",
			"details": err.Error(),
		})
		return
	}

	response := dto.DiffFromService(diffResult)
	c.JSON(http.StatusOK, response)
}

// GetTree handles GET /api/repos/:owner/:repo/tree/:ref/*path
func (h *RepoHandler) GetTree(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")
	ref := c.Param("ref")
	path := c.Param("path")

	if ref == "_" || ref == "" {
		if queryRef := c.Query("ref"); queryRef != "" {
			ref = queryRef
		}
	}
	if path == "" {
		if queryPath := c.Query("path"); queryPath != "" {
			path = queryPath
		}
	}

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	// Check access
	user := middleware.GetUserFromContext(c)
	if repo.IsPrivate && (user == nil || (user.ID != repo.OwnerID && !user.IsAdmin)) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Repository not found",
		})
		return
	}

	entries, err := h.repoService.GetTree(c.Request.Context(), repo, ref, path)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Tree not found",
			"details": err.Error(),
		})
		return
	}

	response := dto.TreeFromService(entries, path, ref)
	c.JSON(http.StatusOK, response)
}

// GetFileContent handles GET /api/repos/:owner/:repo/blob/:ref/*path
func (h *RepoHandler) GetFileContent(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")
	ref := c.Param("ref")
	path := c.Param("path")

	if ref == "_" || ref == "" {
		if queryRef := c.Query("ref"); queryRef != "" {
			ref = queryRef
		}
	}

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	// Check access
	user := middleware.GetUserFromContext(c)
	if repo.IsPrivate && (user == nil || (user.ID != repo.OwnerID && !user.IsAdmin)) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Repository not found",
		})
		return
	}

	fileContent, err := h.repoService.GetFileContent(c.Request.Context(), repo, ref, path)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "File not found",
			"details": err.Error(),
		})
		return
	}

	response := dto.FileContentFromService(fileContent, ref)
	c.JSON(http.StatusOK, response)
}

// GetRawFile handles GET /api/repos/:owner/:repo/raw/:ref/*path
// Returns raw file content with appropriate Content-Type (curlable)
func (h *RepoHandler) GetRawFile(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")
	ref := c.Param("ref")
	path := c.Param("path")

	if ref == "_" || ref == "" {
		if queryRef := c.Query("ref"); queryRef != "" {
			ref = queryRef
		}
	}

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "Repository not found"})
		return
	}

	user := middleware.GetUserFromContext(c)
	if repo.IsPrivate && (user == nil || (user.ID != repo.OwnerID && !user.IsAdmin)) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "Repository not found"})
		return
	}

	fileContent, err := h.repoService.GetFileContent(c.Request.Context(), repo, ref, path)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "File not found"})
		return
	}

	if fileContent.IsBinary {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "message": "Cannot serve binary file as raw text"})
		return
	}

	c.Header("Content-Type", "text/plain; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filepath.Base(path)))
	c.Header("Cache-Control", "public, max-age=300")
	c.String(http.StatusOK, "%s", fileContent.Content)
}

// GetBlame handles GET /api/repos/:owner/:repo/blame/:ref/*path
func (h *RepoHandler) GetBlame(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")
	ref := c.Param("ref")
	path := c.Param("path")

	if ref == "_" || ref == "" {
		if queryRef := c.Query("ref"); queryRef != "" {
			ref = queryRef
		}
	}

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	// Check access
	user := middleware.GetUserFromContext(c)
	if repo.IsPrivate && (user == nil || (user.ID != repo.OwnerID && !user.IsAdmin)) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Repository not found",
		})
		return
	}

	blameLines, err := h.repoService.GetBlame(c.Request.Context(), repo, ref, path)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Unable to get blame information",
			"details": err.Error(),
		})
		return
	}

	response := dto.BlameFromService(blameLines, path, ref)
	c.JSON(http.StatusOK, response)
}

// UpdateMirrorSettings handles PATCH /api/repos/:owner/:repo/mirror
func (h *RepoHandler) UpdateMirrorSettings(c *gin.Context) {
	user := middleware.GetUserFromContext(c)
	if user == nil {
		h.log.Warn("Update mirror settings attempted without authentication",
			logger.ClientIP(c.ClientIP()),
		)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "Authentication required",
		})
		return
	}

	owner := c.Param("owner")
	repoName := c.Param("repo")

	h.log.Debug("Update mirror settings request received",
		logger.String("owner", owner),
		logger.String("repo", repoName),
		logger.String("user_id", user.ID.String()),
	)

	// Get repository
	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		h.log.Error("Failed to get repository",
			logger.Error(err),
			logger.String("owner", owner),
			logger.String("repo", repoName),
		)
		handleError(c, h.log, err)
		return
	}

	// Verify user has access (owner or admin)
	if repo.OwnerID != user.ID && !user.IsAdmin {
		h.log.Warn("User does not have permission to update mirror settings",
			logger.String("user_id", user.ID.String()),
			logger.String("repo_id", repo.ID.String()),
		)
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "You do not have permission to update this repository",
		})
		return
	}

	// Parse request body
	var req dto.UpdateMirrorSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.log.Warn("Invalid update mirror settings request body",
			logger.Error(err),
			logger.String("user_id", user.ID.String()),
		)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Update mirror settings
	h.log.Info("Updating mirror settings",
		logger.String("repo_id", repo.ID.String()),
		logger.String("owner", owner),
		logger.String("repo", repoName),
	)

	updatedRepo, err := h.repoService.UpdateMirrorSettings(
		c.Request.Context(),
		repo.ID,
		&req,
	)
	if err != nil {
		h.log.Error("Failed to update mirror settings",
			logger.Error(err),
			logger.String("repo_id", repo.ID.String()),
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to update mirror settings: " + err.Error(),
		})
		return
	}

	h.log.Info("Mirror settings updated successfully",
		logger.String("repo_id", repo.ID.String()),
		logger.String("owner", owner),
		logger.String("repo", repoName),
	)

	// Build response
	response := dto.RepoFromModel(updatedRepo, h.baseURL, h.sshHost, h.sshPort)

	c.JSON(http.StatusOK, response)
}

// GetMirrorSettings handles GET /api/repos/:owner/:repo/mirror
func (h *RepoHandler) GetMirrorSettings(c *gin.Context) {
	user := middleware.GetUserFromContext(c)
	owner := c.Param("owner")
	repoName := c.Param("repo")

	h.log.Debug("Get mirror settings request received",
		logger.String("owner", owner),
		logger.String("repo", repoName),
	)

	// Get repository
	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		h.log.Error("Failed to get repository",
			logger.Error(err),
			logger.String("owner", owner),
			logger.String("repo", repoName),
		)
		handleError(c, h.log, err)
		return
	}

	// Check if user can access this repository
	var userID *uuid.UUID
	if user != nil {
		userID = &user.ID
	}
	canAccess := h.repoService.CanUserAccessRepository(c.Request.Context(), userID, repo, "read")

	if !canAccess {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Repository not found",
		})
		return
	}

	// Build mirror settings response (don't expose passwords)
	settings := dto.MirrorSettingsResponse{
		MirrorEnabled:      repo.MirrorEnabled,
		MirrorDirection:    repo.MirrorDirection,
		UpstreamURL:        repo.UpstreamURL,
		UpstreamUsername:   repo.UpstreamUsername,
		DownstreamURL:      repo.DownstreamURL,
		DownstreamUsername: repo.DownstreamUsername,
		SyncInterval:       repo.SyncInterval,
		SyncSchedule:       repo.SyncSchedule,
		LastSyncedAt:       repo.LastSyncedAt,
		NextSyncAt:         repo.GetNextSyncTime(),
		SyncStatus:         repo.SyncStatus,
		SyncError:          repo.SyncError,
	}

	c.JSON(http.StatusOK, settings)
}

// SyncMirror handles POST /api/repos/:owner/:repo/sync
func (h *RepoHandler) SyncMirror(c *gin.Context) {
	user := middleware.GetUserFromContext(c)
	if user == nil {
		h.log.Warn("Sync mirror attempted without authentication",
			logger.ClientIP(c.ClientIP()),
		)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "Authentication required",
		})
		return
	}

	owner := c.Param("owner")
	repoName := c.Param("repo")

	h.log.Debug("Sync mirror request received",
		logger.String("owner", owner),
		logger.String("repo", repoName),
		logger.String("user_id", user.ID.String()),
	)

	// Get repository
	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		h.log.Error("Failed to get repository",
			logger.Error(err),
			logger.String("owner", owner),
			logger.String("repo", repoName),
		)
		handleError(c, h.log, err)
		return
	}

	// Verify user has access (owner or admin)
	if repo.OwnerID != user.ID && !user.IsAdmin {
		h.log.Warn("User does not have permission to sync repository",
			logger.String("user_id", user.ID.String()),
			logger.String("repo_id", repo.ID.String()),
		)
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "You do not have permission to sync this repository",
		})
		return
	}

	// Verify mirror is enabled
	if !repo.MirrorEnabled {
		h.log.Warn("Repository mirror is not enabled",
			logger.String("repo_id", repo.ID.String()),
			logger.String("repo_name", repo.Name),
		)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "Repository mirror is not enabled",
		})
		return
	}

	// Trigger sync
	h.log.Info("Triggering mirror sync",
		logger.String("repo_id", repo.ID.String()),
		logger.String("owner", owner),
		logger.String("repo", repoName),
	)

	if err := h.mirrorSyncService.SyncRepository(c.Request.Context(), repo.ID); err != nil {
		h.log.Error("Failed to trigger sync",
			logger.Error(err),
			logger.String("repo_id", repo.ID.String()),
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to trigger sync: " + err.Error(),
		})
		return
	}

	h.log.Info("Mirror sync triggered successfully",
		logger.String("repo_id", repo.ID.String()),
		logger.String("owner", owner),
		logger.String("repo", repoName),
	)

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Mirror sync started",
		"status":  "syncing",
	})
}

// GetLicense handles GET /api/v1/repos/:owner/:repo/license
func (h *RepoHandler) GetLicense(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	user := middleware.GetUserFromContext(c)
	if repo.IsPrivate && (user == nil || (user.ID != repo.OwnerID && !user.IsAdmin)) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "Repository not found"})
		return
	}

	// Try common license file names
	licenseFiles := []string{"LICENSE", "LICENSE.md", "LICENCE", "LICENCE.md", "license", "license.md"}
	var licenseContent string
	var licenseName string

	for _, name := range licenseFiles {
		content, err := h.repoService.GetFileContent(c.Request.Context(), repo, "HEAD", name)
		if err == nil {
			licenseContent = string(content.Content)
			licenseName = name
			break
		}
	}

	if licenseName == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "No license file found"})
		return
	}

	// Try to detect license type from content
	licenseType := detectLicenseType(licenseContent)

	c.JSON(http.StatusOK, gin.H{
		"license":  licenseType,
		"filename": licenseName,
		"content":  licenseContent,
	})
}

func detectLicenseType(content string) string {
	lower := strings.ToLower(content)
	switch {
	case strings.Contains(lower, "mit license"):
		return "MIT"
	case strings.Contains(lower, "apache license"):
		return "Apache-2.0"
	case strings.Contains(lower, "gnu general public license"):
		if strings.Contains(lower, "version 3") {
			return "GPL-3.0"
		}
		return "GPL-2.0"
	case strings.Contains(lower, "bsd"):
		return "BSD"
	case strings.Contains(lower, "isc license"):
		return "ISC"
	case strings.Contains(lower, "mozilla public license"):
		return "MPL-2.0"
	default:
		return "Unknown"
	}
}

// GetMirrorStatus handles GET /api/repos/:owner/:repo/mirror/status
func (h *RepoHandler) GetMirrorStatus(c *gin.Context) {
	user := middleware.GetUserFromContext(c)
	owner := c.Param("owner")
	repoName := c.Param("repo")

	h.log.Debug("Get mirror status request received",
		logger.String("owner", owner),
		logger.String("repo", repoName),
	)

	// Get repository
	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		h.log.Error("Failed to get repository",
			logger.Error(err),
			logger.String("owner", owner),
			logger.String("repo", repoName),
		)
		handleError(c, h.log, err)
		return
	}

	// Check if user can access this repository
	var userID *uuid.UUID
	if user != nil {
		userID = &user.ID
	}
	canAccess := h.repoService.CanUserAccessRepository(c.Request.Context(), userID, repo, "read")

	if !canAccess {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Repository not found",
		})
		return
	}

	// Verify mirror is enabled
	if !repo.MirrorEnabled {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "Repository mirror is not enabled",
		})
		return
	}

	// Get sync status
	status, err := h.mirrorSyncService.GetSyncStatus(c.Request.Context(), repo.ID)
	if err != nil {
		h.log.Error("Failed to get sync status",
			logger.Error(err),
			logger.String("repo_id", repo.ID.String()),
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to get sync status",
		})
		return
	}

	c.JSON(http.StatusOK, status)
}

func (h *RepoHandler) GetFileCommit(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")
	ref := c.Param("ref")
	path := strings.TrimPrefix(c.Param("path"), "/")

	if ref == "_" || ref == "" {
		if queryRef := c.Query("ref"); queryRef != "" {
			ref = queryRef
		}
	}

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	user := middleware.GetUserFromContext(c)
	if repo.IsPrivate && (user == nil || (user.ID != repo.OwnerID && !user.IsAdmin)) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "Repository not found"})
		return
	}

	commit, err := h.repoService.GetLastCommitForPath(c.Request.Context(), repo, ref, path)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "No commit found for path"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"hash":         commit.Hash,
		"message":      commit.Message,
		"author":       commit.Author,
		"author_email": commit.AuthorEmail,
		"date":         commit.Date,
	})
}

func (h *RepoHandler) GetRepoActivity(c *gin.Context) {
	owner := c.Param("owner")
	repoName := c.Param("repo")

	repo, err := h.repoService.GetRepository(c.Request.Context(), owner, repoName)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	user := middleware.GetUserFromContext(c)
	if repo.IsPrivate && (user == nil || (user.ID != repo.OwnerID && !user.IsAdmin)) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "Repository not found"})
		return
	}

	now := time.Now()
	year := now.Year()

	if y := c.Query("year"); y != "" {
		if parsed, err := strconv.Atoi(y); err == nil && parsed >= 2000 && parsed <= now.Year() {
			year = parsed
		}
	}

	var startDate, endDate time.Time
	if year == now.Year() {
		startDate = time.Date(year, 1, 1, 0, 0, 0, 0, now.Location())
		endDate = now
	} else {
		startDate = time.Date(year, 1, 1, 0, 0, 0, 0, now.Location())
		endDate = time.Date(year, 12, 31, 23, 59, 59, 0, now.Location())
	}

	activity, err := h.repoService.GetCommitActivityInRange(c.Request.Context(), repo, startDate, endDate)
	if err != nil {
		handleError(c, h.log, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"days":       activity.Days,
		"total":      activity.Total,
		"year":       year,
		"streak":     activity.Streak,
		"longest":    activity.Longest,
	})
}

