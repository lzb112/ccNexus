package main

import (
	"embed"
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/lich0821/ccNexus/internal/logger"
	"github.com/lich0821/ccNexus/internal/server"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Parse command line flags
	port := flag.Int("port", 8080, "Port to listen on")
	host := flag.String("host", "127.0.0.1", "Host to listen on")
	flag.Parse()

	// Initialize logger
	logger.GetLogger() // Initialize the logger
	defer logger.GetLogger().Close()

	// Create app instance
	app := NewApp()

	// Startup
	if err := app.Startup(); err != nil {
		logger.Error("Failed to startup: %v", err)
		os.Exit(1)
	}

	// Create HTTP server
	httpServer := server.NewServer(app)

	// Setup static files
	if err := httpServer.SetupStaticFiles(assets); err != nil {
		logger.Error("Failed to setup static files: %v", err)
		os.Exit(1)
	}

	// Start server in background
	addr := fmt.Sprintf("%s:%d", *host, *port)
	go func() {
		if err := httpServer.Start(addr); err != nil && err != http.ErrServerClosed {
			logger.Error("Server error: %v", err)
		}
	}()

	// Print startup message
	fmt.Printf("🚀 Server running at http://%s:%d\n", *host, *port)
	fmt.Printf("📝 API documentation at http://%s:%d/api\n", *host, *port)

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	// Shutdown
	logger.Info("Shutting down...")
	app.Shutdown()
	if err := httpServer.Shutdown(); err != nil {
		logger.Error("Error shutting down server: %v", err)
	}

	logger.Info("Goodbye!")
}
