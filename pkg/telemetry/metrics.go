package telemetry

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type Metrics struct {
	RequestDuration *prometheus.HistogramVec
	RequestCount    *prometheus.CounterVec
	LeadsProcessed  *prometheus.CounterVec
	LeadsRouted     *prometheus.CounterVec
	ErrorCount      *prometheus.CounterVec
}

func NewMetrics(service string) *Metrics {
	m := &Metrics{
		RequestDuration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    service + "_request_duration_seconds",
				Help:    "HTTP request duration in seconds",
				Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1},
			},
			[]string{"method", "path", "status"},
		),
		RequestCount: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: service + "_request_total",
				Help: "Total HTTP requests",
			},
			[]string{"method", "path", "status"},
		),
		LeadsProcessed: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: service + "_leads_processed_total",
				Help: "Total leads processed",
			},
			[]string{"status"},
		),
		LeadsRouted: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: service + "_leads_routed_total",
				Help: "Total leads routed",
			},
			[]string{"broker", "country"},
		),
		ErrorCount: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: service + "_errors_total",
				Help: "Total errors",
			},
			[]string{"type"},
		),
	}

	prometheus.MustRegister(m.RequestDuration, m.RequestCount, m.LeadsProcessed, m.LeadsRouted, m.ErrorCount)
	return m
}

func MetricsHandler() http.Handler {
	return promhttp.Handler()
}
