package server

import (
	"embed"
	"fmt"
	"io/fs"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/lich0821/ccNexus/internal/logger"
)

// Server represents the HTTP server
type Server struct {
	e   *echo.Echo
	app interface{} // App instance that implements the API endpoints
}

// NewServer creates a new HTTP server instance
func NewServer(app interface{}) *Server {
	e := echo.New()

	// Disable default logger
	e.HideBanner = true
	e.HidePort = true

	// Add CORS middleware
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{echo.GET, echo.POST, echo.PUT, echo.DELETE, echo.OPTIONS},
		AllowHeaders: []string{echo.HeaderContentType},
	}))

	// Add request logging middleware
	e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
		Format: "${method} ${uri} ${status}\n",
	}))

	s := &Server{
		e:   e,
		app: app,
	}

	// Register API routes
	s.registerRoutes()

	return s
}

// registerRoutes registers all API routes
func (s *Server) registerRoutes() {
	app, ok := s.app.(AppAPI)
	if !ok {
		logger.Error("Invalid app type")
		return
	}

	// Config endpoints
	s.e.GET("/api/config", func(c echo.Context) error {
		return c.String(http.StatusOK, app.GetConfig())
	})

	s.e.POST("/api/config", func(c echo.Context) error {
		var req struct {
			Config string `json:"config"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		if err := app.UpdateConfig(req.Config); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]string{"message": "success"})
	})

	// Version endpoint
	s.e.GET("/api/version", func(c echo.Context) error {
		return c.String(http.StatusOK, app.GetVersion())
	})

	// Stats endpoint
	s.e.GET("/api/stats", func(c echo.Context) error {
		return c.String(http.StatusOK, app.GetStats())
	})

	// Endpoints management
	s.e.POST("/api/endpoints", func(c echo.Context) error {
		var req struct {
			Name        string `json:"name"`
			APIUrl      string `json:"apiUrl"`
			APIKey      string `json:"apiKey"`
			Transformer string `json:"transformer"`
			Model       string `json:"model"`
			Remark      string `json:"remark"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		if err := app.AddEndpoint(req.Name, req.APIUrl, req.APIKey, req.Transformer, req.Model, req.Remark); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]string{"message": "success"})
	})

	s.e.DELETE("/api/endpoints/:index", func(c echo.Context) error {
		var index int
		if _, err := fmt.Sscanf(c.Param("index"), "%d", &index); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid index"})
		}
		if err := app.RemoveEndpoint(index); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]string{"message": "success"})
	})

	s.e.PUT("/api/endpoints/:index", func(c echo.Context) error {
		var index int
		if _, err := fmt.Sscanf(c.Param("index"), "%d", &index); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid index"})
		}
		var req struct {
			Name        string `json:"name"`
			APIUrl      string `json:"apiUrl"`
			APIKey      string `json:"apiKey"`
			Transformer string `json:"transformer"`
			Model       string `json:"model"`
			Remark      string `json:"remark"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		if err := app.UpdateEndpoint(index, req.Name, req.APIUrl, req.APIKey, req.Transformer, req.Model, req.Remark); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]string{"message": "success"})
	})

	s.e.POST("/api/endpoints/:index/toggle", func(c echo.Context) error {
		var index int
		if _, err := fmt.Sscanf(c.Param("index"), "%d", &index); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid index"})
		}
		var req struct {
			Enabled bool `json:"enabled"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		if err := app.ToggleEndpoint(index, req.Enabled); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]string{"message": "success"})
	})

	s.e.POST("/api/endpoints/test/:index", func(c echo.Context) error {
		var index int
		if _, err := fmt.Sscanf(c.Param("index"), "%d", &index); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid index"})
		}
		return c.String(http.StatusOK, app.TestEndpoint(index))
	})

	s.e.POST("/api/endpoints/reorder", func(c echo.Context) error {
		var req struct {
			Names []string `json:"names"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		if err := app.ReorderEndpoints(req.Names); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]string{"message": "success"})
	})

	s.e.POST("/api/endpoints/switch", func(c echo.Context) error {
		var req struct {
			Name string `json:"name"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		if err := app.SwitchToEndpoint(req.Name); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]string{"message": "success"})
	})

	s.e.GET("/api/endpoints/current", func(c echo.Context) error {
		return c.String(http.StatusOK, app.GetCurrentEndpoint())
	})

	// Port management
	s.e.POST("/api/port", func(c echo.Context) error {
		var req struct {
			Port int `json:"port"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		if err := app.UpdatePort(req.Port); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]string{"message": "success"})
	})

	// Logs endpoints
	s.e.GET("/api/logs", func(c echo.Context) error {
		return c.String(http.StatusOK, app.GetLogs())
	})

	s.e.GET("/api/logs/level/:level", func(c echo.Context) error {
		var level int
		if _, err := fmt.Sscanf(c.Param("level"), "%d", &level); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid level"})
		}
		return c.String(http.StatusOK, app.GetLogsByLevel(level))
	})

	s.e.POST("/api/logs/level", func(c echo.Context) error {
		var req struct {
			Level int `json:"level"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		app.SetLogLevel(req.Level)
		return c.JSON(http.StatusOK, map[string]string{"message": "success"})
	})

	s.e.GET("/api/logs/level", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]int{"level": app.GetLogLevel()})
	})

	s.e.DELETE("/api/logs", func(c echo.Context) error {
		app.ClearLogs()
		return c.JSON(http.StatusOK, map[string]string{"message": "success"})
	})

	// Language endpoints
	s.e.GET("/api/language", func(c echo.Context) error {
		return c.String(http.StatusOK, app.GetLanguage())
	})

	s.e.POST("/api/language", func(c echo.Context) error {
		var req struct {
			Language string `json:"language"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		if err := app.SetLanguage(req.Language); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]string{"message": "success"})
	})

	s.e.GET("/api/language/system", func(c echo.Context) error {
		return c.String(http.StatusOK, app.GetSystemLanguage())
	})

	// WebDAV endpoints
	s.e.POST("/api/webdav/config", func(c echo.Context) error {
		var req struct {
			URL      string `json:"url"`
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		if err := app.UpdateWebDAVConfig(req.URL, req.Username, req.Password); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]string{"message": "success"})
	})

	s.e.POST("/api/webdav/test", func(c echo.Context) error {
		var req struct {
			URL      string `json:"url"`
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.String(http.StatusOK, app.TestWebDAVConnection(req.URL, req.Username, req.Password))
	})

	s.e.GET("/api/webdav/backups", func(c echo.Context) error {
		return c.String(http.StatusOK, app.ListWebDAVBackups())
	})

	s.e.POST("/api/webdav/backup", func(c echo.Context) error {
		var req struct {
			Filename string `json:"filename"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		if err := app.BackupToWebDAV(req.Filename); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]string{"message": "success"})
	})

	s.e.POST("/api/webdav/restore", func(c echo.Context) error {
		var req struct {
			Filename string `json:"filename"`
			Choice   string `json:"choice"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		if err := app.RestoreFromWebDAV(req.Filename, req.Choice); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]string{"message": "success"})
	})
}

// SetupStaticFiles configures static file serving for embedded assets
func (s *Server) SetupStaticFiles(fsys embed.FS) error {
	// Serve static files from frontend/dist
	subFS, err := fs.Sub(fsys, "frontend/dist")
	if err != nil {
		return fmt.Errorf("failed to create sub filesystem: %w", err)
	}

	s.e.FileFS("/*", "index.html", echo.MustSubFS(subFS, ""))
	s.e.StaticFS("/", echo.MustSubFS(subFS, ""))

	return nil
}

// Start starts the HTTP server on the given address
func (s *Server) Start(addr string) error {
	logger.Info("Starting HTTP server on %s", addr)
	return s.e.Start(addr)
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown() error {
	return s.e.Shutdown(nil)
}

// AppAPI defines the interface for app methods exposed via HTTP
type AppAPI interface {
	GetConfig() string
	UpdateConfig(configJSON string) error
	GetVersion() string
	GetStats() string
	AddEndpoint(name, apiUrl, apiKey, transformer, model, remark string) error
	RemoveEndpoint(index int) error
	UpdateEndpoint(index int, name, apiUrl, apiKey, transformer, model, remark string) error
	ToggleEndpoint(index int, enabled bool) error
	TestEndpoint(index int) string
	ReorderEndpoints(names []string) error
	SwitchToEndpoint(endpointName string) error
	GetCurrentEndpoint() string
	UpdatePort(port int) error
	GetLogs() string
	GetLogsByLevel(level int) string
	SetLogLevel(level int)
	GetLogLevel() int
	ClearLogs()
	GetLanguage() string
	SetLanguage(language string) error
	GetSystemLanguage() string
	UpdateWebDAVConfig(url, username, password string) error
	TestWebDAVConnection(url, username, password string) string
	ListWebDAVBackups() string
	BackupToWebDAV(filename string) error
	RestoreFromWebDAV(filename, choice string) error
}
