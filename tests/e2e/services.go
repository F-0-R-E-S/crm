//go:build e2e

package e2e

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"time"
)

type ServiceProcess struct {
	Name    string
	Cmd     *exec.Cmd
	Port    int
	BaseURL string
}

type ServiceCluster struct {
	Intake     *ServiceProcess
	Routing    *ServiceProcess
	Broker     *ServiceProcess
	StatusSync *ServiceProcess

	pgDSN    string
	redisURL string
	natsURL  string
}

func StartServiceCluster(ctx context.Context, pgDSN, redisURL, natsURL string) (*ServiceCluster, error) {
	sc := &ServiceCluster{
		pgDSN:    pgDSN,
		redisURL: redisURL,
		natsURL:  natsURL,
	}

	var err error

	sc.Intake, err = sc.startService(ctx, "lead-intake-svc", "services/lead-intake-svc")
	if err != nil {
		return nil, fmt.Errorf("start lead-intake: %w", err)
	}

	sc.Routing, err = sc.startService(ctx, "routing-engine-svc", "services/routing-engine-svc")
	if err != nil {
		sc.Stop()
		return nil, fmt.Errorf("start routing-engine: %w", err)
	}

	sc.Broker, err = sc.startService(ctx, "broker-adapter-svc", "services/broker-adapter-svc")
	if err != nil {
		sc.Stop()
		return nil, fmt.Errorf("start broker-adapter: %w", err)
	}

	sc.StatusSync, err = sc.startService(ctx, "status-sync-svc", "services/status-sync-svc")
	if err != nil {
		sc.Stop()
		return nil, fmt.Errorf("start status-sync: %w", err)
	}

	// Wait for all services to be healthy
	services := []*ServiceProcess{sc.Intake, sc.Routing, sc.Broker, sc.StatusSync}
	for _, svc := range services {
		if err := waitForHealth(svc, 15*time.Second); err != nil {
			sc.Stop()
			return nil, fmt.Errorf("health check %s: %w", svc.Name, err)
		}
	}

	return sc, nil
}

func (sc *ServiceCluster) startService(ctx context.Context, name, pkgPath string) (*ServiceProcess, error) {
	port, err := getFreePort()
	if err != nil {
		return nil, fmt.Errorf("get free port for %s: %w", name, err)
	}

	// Build the service first
	binary := fmt.Sprintf("/tmp/e2e_%s", name)
	build := exec.CommandContext(ctx, "go", "build", "-o", binary, fmt.Sprintf("./%s", pkgPath))
	build.Dir = "../../" // from tests/e2e → project root
	build.Stdout = os.Stdout
	build.Stderr = os.Stderr
	if err := build.Run(); err != nil {
		return nil, fmt.Errorf("build %s: %w", name, err)
	}

	cmd := exec.CommandContext(ctx, binary)
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("PORT=%d", port),
		fmt.Sprintf("DB_URL=%s", sc.pgDSN),
		fmt.Sprintf("REDIS_URL=%s", sc.redisURL),
		fmt.Sprintf("NATS_URL=%s", sc.natsURL),
		"MAXMIND_ACCOUNT_ID=",
		"MAXMIND_LICENSE_KEY=",
		fmt.Sprintf("DELIVERY_TIMEOUT=15s"),
		fmt.Sprintf("MAX_RETRIES=3"),
	)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start %s: %w", name, err)
	}

	svc := &ServiceProcess{
		Name:    name,
		Cmd:     cmd,
		Port:    port,
		BaseURL: fmt.Sprintf("http://127.0.0.1:%d", port),
	}

	return svc, nil
}

func (sc *ServiceCluster) Stop() {
	for _, svc := range []*ServiceProcess{sc.StatusSync, sc.Broker, sc.Routing, sc.Intake} {
		if svc != nil && svc.Cmd != nil && svc.Cmd.Process != nil {
			svc.Cmd.Process.Signal(os.Interrupt)
			done := make(chan error, 1)
			go func() { done <- svc.Cmd.Wait() }()
			select {
			case <-done:
			case <-time.After(5 * time.Second):
				svc.Cmd.Process.Kill()
			}
		}
	}
}

func waitForHealth(svc *ServiceProcess, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	healthURL := svc.BaseURL + "/health"

	for time.Now().Before(deadline) {
		resp, err := http.Get(healthURL)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
		}
		time.Sleep(200 * time.Millisecond)
	}
	return fmt.Errorf("service %s did not become healthy within %v", svc.Name, timeout)
}

func getFreePort() (int, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	port := l.Addr().(*net.TCPAddr).Port
	l.Close()
	return port, nil
}
