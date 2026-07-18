package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	apperrors "github.com/bravo68web/stasis/pkg/errors"
	"github.com/bravo68web/stasis/pkg/logger"
)

// handleError handles errors and returns appropriate HTTP responses
func handleError(c *gin.Context, log *logger.Logger, err error) {
	// Handle AppError types
	if apperrors.IsNotFound(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": err.Error(),
		})
		return
	}

	if apperrors.IsUnauthorized(err) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
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

	if apperrors.IsConflict(err) {
		c.JSON(http.StatusConflict, gin.H{
			"error":   "conflict",
			"message": err.Error(),
		})
		return
	}

	// Check for AppError with custom HTTP status
	if e, ok := err.(*apperrors.AppError); ok {
		c.JSON(e.HTTPStatus(), gin.H{
			"error":   "error",
			"message": e.Message,
		})
		return
	}

	// Default to internal server error
	c.JSON(http.StatusInternalServerError, gin.H{
		"error":   "internal_error",
		"message": "An internal error occurred",
	})
}
