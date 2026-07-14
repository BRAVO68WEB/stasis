package handler

import (
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/bravo68web/stasis/internal/application/dto"
	"github.com/bravo68web/stasis/internal/application/service"
	"github.com/bravo68web/stasis/internal/domain/models"
	"github.com/bravo68web/stasis/internal/transport/http/middleware"
	apperrors "github.com/bravo68web/stasis/pkg/errors"
)

var mastodonUsernameRegex = regexp.MustCompile(`^@[a-zA-Z0-9_-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

func isValidSocialLink(value string) bool {
	if mastodonUsernameRegex.MatchString(value) {
		return true
	}
	u, err := url.Parse(value)
	return err == nil && u.Scheme != "" && u.Host != ""
}

// UserHandler handles user HTTP requests
type UserHandler struct {
	userService *service.UserService
}

// NewUserHandler creates a new UserHandler instance
func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// Update current user's username
func (h *UserHandler) UpdateCurrentUsername(c *gin.Context) {
	user := middleware.GetUserFromContext(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "Authentication required",
		})
		return
	}

	var req dto.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "Invalid request body",
		})
		return
	}

	resp, err := h.userService.UpdateUser(c.Request.Context(), user.ID, service.UpdateUserRequest{
		Username: req.Username,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": resp,
	})
}

// GetUserProfile returns a user's public profile by username
func (h *UserHandler) GetUserProfile(c *gin.Context) {
	username := c.Param("username")

	user, err := h.userService.GetUserByUsername(c.Request.Context(), username)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "User not found"})
		return
	}

	socialLinks := make([]dto.SocialLinkResponse, 0)
	for _, link := range user.GetSocialLinks() {
		socialLinks = append(socialLinks, dto.SocialLinkResponse{
			URL:  link.URL,
			Name: link.Name,
		})
	}

	c.JSON(http.StatusOK, dto.UserProfileResponse{
		ID:          user.ID,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Bio:         user.Bio,
		Company:     user.Company,
		Location:    user.Location,
		Website:     user.Website,
		AvatarURL:   user.AvatarURL,
		SocialLinks: socialLinks,
		CreatedAt:   user.CreatedAt,
	})
}

// UpdateProfile updates the authenticated user's profile
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	user := middleware.GetUserFromContext(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.userService.UpdateUser(c.Request.Context(), user.ID, service.UpdateUserRequest{
		DisplayName: req.DisplayName,
		Bio:         req.Bio,
		Company:     req.Company,
		Location:    req.Location,
		Website:     req.Website,
		AvatarURL:   req.AvatarURL,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.UserProfileResponse{
		ID:          resp.ID,
		Username:    resp.Username,
		DisplayName: resp.DisplayName,
		Bio:         resp.Bio,
		Company:     resp.Company,
		Location:    resp.Location,
		Website:     resp.Website,
		AvatarURL:   resp.AvatarURL,
		CreatedAt:   resp.CreatedAt,
	})
}

// handleError handles errors and returns appropriate HTTP responses
func (h *UserHandler) handleError(c *gin.Context, err error) {
	if apperrors.IsNotFound(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": err.Error(),
		})
		return
	}
	if apperrors.IsBadRequest(err) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": err.Error(),
		})
		return
	}
	if apperrors.IsConflict(err) {
		c.JSON(http.StatusConflict, gin.H{
			"error":   "conflict",
			"message": err.Error(),
		})
		return
	}
	if apperrors.IsForbidden(err) {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusInternalServerError, gin.H{
		"error":   "internal_error",
		"message": "An unexpected error occurred",
	})
}

// GetUserByEmail returns a user by their linked email
func (h *UserHandler) GetUserByEmail(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "message": "Email is required"})
		return
	}

	user, err := h.userService.GetUserByLinkedEmail(c.Request.Context(), email)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "No user found with this email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"username":     user.Username,
		"display_name": user.DisplayName,
		"avatar_url":   user.AvatarURL,
	})
}

// UpdateLinkedEmails updates the authenticated user's linked emails
func (h *UserHandler) UpdateLinkedEmails(c *gin.Context) {
	user := middleware.GetUserFromContext(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.UpdateLinkedEmailsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for _, email := range req.Emails {
		if !strings.Contains(email, "@") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "message": "Invalid email: " + email})
			return
		}
	}

	if err := user.SetLinkedEmails(req.Emails); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update emails"})
		return
	}

	if _, err := h.userService.UpdateUser(c.Request.Context(), user.ID, service.UpdateUserRequest{
		LinkedEmails: &req.Emails,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	c.JSON(http.StatusOK, dto.LinkedEmailsResponse{Emails: req.Emails})
}

// GetLinkedEmails returns the authenticated user's linked emails
func (h *UserHandler) GetLinkedEmails(c *gin.Context) {
	user := middleware.GetUserFromContext(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	c.JSON(http.StatusOK, dto.LinkedEmailsResponse{Emails: user.GetLinkedEmails()})
}

// GetSocialLinks returns the authenticated user's social links
func (h *UserHandler) GetSocialLinks(c *gin.Context) {
	user := middleware.GetUserFromContext(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	links := make([]dto.SocialLinkResponse, 0)
	for _, link := range user.GetSocialLinks() {
		links = append(links, dto.SocialLinkResponse{
			URL:  link.URL,
			Name: link.Name,
		})
	}

	c.JSON(http.StatusOK, dto.SocialLinksResponse{Links: links})
}

// UpdateSocialLinks updates the authenticated user's social links
func (h *UserHandler) UpdateSocialLinks(c *gin.Context) {
	user := middleware.GetUserFromContext(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.UpdateSocialLinksRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for _, link := range req.Links {
		if !isValidSocialLink(link.URL) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid URL or Mastodon username: " + link.URL})
			return
		}
	}

	socialLinks := make([]models.SocialLink, len(req.Links))
	for i, link := range req.Links {
		socialLinks[i] = models.SocialLink{
			URL:  link.URL,
			Name: link.Name,
		}
	}

	if _, err := h.userService.UpdateUser(c.Request.Context(), user.ID, service.UpdateUserRequest{
		SocialLinks: &socialLinks,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update social links"})
		return
	}

	resp := make([]dto.SocialLinkResponse, len(socialLinks))
	for i, link := range socialLinks {
		resp[i] = dto.SocialLinkResponse{
			URL:  link.URL,
			Name: link.Name,
		}
	}

	c.JSON(http.StatusOK, dto.SocialLinksResponse{Links: resp})
}
