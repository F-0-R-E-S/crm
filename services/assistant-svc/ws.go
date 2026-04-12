package main

// WebSocket handler is implemented as SSE fallback in handler.go (websocket method).
// This file contains WebSocket-specific types and upgrade logic for future native WS support.
//
// Current implementation uses SSE-over-HTTP for real-time event push (handler.go:websocket),
// which is simpler and works through the api-gateway reverse proxy without special config.
// A native WebSocket upgrade can be added here when the api-gateway supports WS proxying.
