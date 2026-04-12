package middleware

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

// TraceID ensures every request has an X-Trace-ID header. Generates one if absent.
func TraceID() fiber.Handler {
	return func(c fiber.Ctx) error {
		traceID := c.Get("X-Trace-ID")
		if traceID == "" {
			traceID = uuid.New().String()
		}
		c.Locals("trace_id", traceID)
		c.Set("X-Trace-ID", traceID)
		return c.Next()
	}
}
