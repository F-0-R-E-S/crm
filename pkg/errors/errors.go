package errors

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type AppError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	Detail     string `json:"detail,omitempty"`
	HTTPStatus int    `json:"-"`
}

func (e *AppError) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *AppError) WriteJSON(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(e.HTTPStatus)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error": e,
	})
}

var (
	ErrNotFound = &AppError{Code: "NOT_FOUND", Message: "resource not found", HTTPStatus: http.StatusNotFound}
	ErrUnauthorized = &AppError{Code: "UNAUTHORIZED", Message: "authentication required", HTTPStatus: http.StatusUnauthorized}
	ErrForbidden = &AppError{Code: "FORBIDDEN", Message: "insufficient permissions", HTTPStatus: http.StatusForbidden}
	ErrBadRequest = &AppError{Code: "BAD_REQUEST", Message: "invalid request", HTTPStatus: http.StatusBadRequest}
	ErrConflict = &AppError{Code: "CONFLICT", Message: "resource conflict", HTTPStatus: http.StatusConflict}
	ErrDuplicate = &AppError{Code: "DUPLICATE", Message: "duplicate entry", HTTPStatus: http.StatusConflict}
	ErrRateLimit = &AppError{Code: "RATE_LIMITED", Message: "too many requests", HTTPStatus: http.StatusTooManyRequests}
	ErrInternal = &AppError{Code: "INTERNAL", Message: "internal server error", HTTPStatus: http.StatusInternalServerError}
)

func NewValidationError(detail string) *AppError {
	return &AppError{Code: "VALIDATION_ERROR", Message: "validation failed", Detail: detail, HTTPStatus: http.StatusUnprocessableEntity}
}

func NewBadRequest(detail string) *AppError {
	return &AppError{Code: "BAD_REQUEST", Message: "invalid request", Detail: detail, HTTPStatus: http.StatusBadRequest}
}

func NewForbiddenError(detail string) *AppError {
	return &AppError{Code: "FORBIDDEN", Message: "access denied", Detail: detail, HTTPStatus: http.StatusForbidden}
}
