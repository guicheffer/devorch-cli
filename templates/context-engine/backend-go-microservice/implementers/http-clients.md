---
domain: http-clients
description: HTTP client patterns with wrappers, retry logic, circuit breakers, and observability
---

# HTTP Clients Implementer

This implementer defines patterns for building resilient HTTP clients with retry logic, circuit breakers, timeouts, and comprehensive observability.

## Core Patterns

### Base HTTP Client with Retry

Create resilient HTTP clients with automatic retry:

```go
import (
    "github.com/hashicorp/go-retryablehttp"
)

type HTTPClient struct {
    client  *retryablehttp.Client
    baseURL string
    logger  *zap.Logger
    metrics *Metrics
}

func NewHTTPClient(baseURL string, logger *zap.Logger) *HTTPClient {
    retryClient := retryablehttp.NewClient()
    retryClient.RetryMax = 3
    retryClient.RetryWaitMin = 1 * time.Second
    retryClient.RetryWaitMax = 10 * time.Second
    retryClient.Logger = &retryLogger{logger: logger}

    // Custom retry policy
    retryClient.CheckRetry = func(ctx context.Context, resp *http.Response, err error) (bool, error) {
        // Don't retry on context cancellation
        if ctx.Err() != nil {
            return false, ctx.Err()
        }

        // Retry on network errors
        if err != nil {
            return true, err
        }

        // Retry on 5xx errors and 429 (rate limit)
        if resp.StatusCode >= 500 || resp.StatusCode == 429 {
            return true, nil
        }

        return false, nil
    }

    // Backoff strategy
    retryClient.Backoff = retryablehttp.ExponentialJitterBackoff

    return &HTTPClient{
        client:  retryClient,
        baseURL: baseURL,
        logger:  logger,
    }
}

type retryLogger struct {
    logger *zap.Logger
}

func (l *retryLogger) Printf(format string, v ...interface{}) {
    l.logger.Debug(fmt.Sprintf(format, v...))
}

func (c *HTTPClient) Do(ctx context.Context, method, path string, body interface{}, result interface{}) error {
    url := c.baseURL + path

    var bodyReader io.Reader
    if body != nil {
        data, err := json.Marshal(body)
        if err != nil {
            return fmt.Errorf("marshal request body: %w", err)
        }
        bodyReader = bytes.NewReader(data)
    }

    req, err := retryablehttp.NewRequestWithContext(ctx, method, url, bodyReader)
    if err != nil {
        return fmt.Errorf("create request: %w", err)
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Accept", "application/json")

    // Add trace context
    if span := trace.SpanFromContext(ctx); span.SpanContext().IsValid() {
        req.Header.Set("X-Trace-ID", span.SpanContext().TraceID().String())
    }

    start := time.Now()
    resp, err := c.client.Do(req)
    duration := time.Since(start)

    c.logger.Debug("http request completed",
        zap.String("method", method),
        zap.String("url", url),
        zap.Duration("duration", duration),
        zap.Int("status", resp.StatusCode),
    )

    if err != nil {
        c.logger.Error("http request failed",
            zap.Error(err),
            zap.String("method", method),
            zap.String("url", url),
        )
        return fmt.Errorf("execute request: %w", err)
    }
    defer resp.Body.Close()

    // Read response body
    respBody, err := io.ReadAll(resp.Body)
    if err != nil {
        return fmt.Errorf("read response body: %w", err)
    }

    // Check status code
    if resp.StatusCode >= 400 {
        return &HTTPError{
            StatusCode: resp.StatusCode,
            Message:    string(respBody),
        }
    }

    // Decode response
    if result != nil && len(respBody) > 0 {
        if err := json.Unmarshal(respBody, result); err != nil {
            return fmt.Errorf("unmarshal response: %w", err)
        }
    }

    return nil
}

type HTTPError struct {
    StatusCode int
    Message    string
}

func (e *HTTPError) Error() string {
    return fmt.Sprintf("HTTP %d: %s", e.StatusCode, e.Message)
}
```

### Service Client with Circuit Breaker

Implement circuit breaker pattern for external services:

```go
import (
    "github.com/sony/gobreaker"
)

type PaymentServiceClient struct {
    client  *HTTPClient
    breaker *gobreaker.CircuitBreaker
    logger  *zap.Logger
}

func NewPaymentServiceClient(baseURL string, logger *zap.Logger) *PaymentServiceClient {
    httpClient := NewHTTPClient(baseURL, logger)

    settings := gobreaker.Settings{
        Name:        "payment-service",
        MaxRequests: 3,
        Interval:    time.Minute,
        Timeout:     30 * time.Second,
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
            return counts.Requests >= 10 && failureRatio >= 0.6
        },
        OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
            logger.Info("circuit breaker state changed",
                zap.String("service", name),
                zap.String("from", from.String()),
                zap.String("to", to.String()),
            )
        },
    }

    return &PaymentServiceClient{
        client:  httpClient,
        breaker: gobreaker.NewCircuitBreaker(settings),
        logger:  logger,
    }
}

type ProcessPaymentRequest struct {
    OrderID      string `json:"order_id"`
    Amount       int64  `json:"amount"`
    Currency     string `json:"currency"`
    CardToken    string `json:"card_token"`
    CustomerID   string `json:"customer_id"`
}

type ProcessPaymentResponse struct {
    PaymentID     string `json:"payment_id"`
    TransactionID string `json:"transaction_id"`
    Status        string `json:"status"`
}

func (c *PaymentServiceClient) ProcessPayment(ctx context.Context, req *ProcessPaymentRequest) (*ProcessPaymentResponse, error) {
    result, err := c.breaker.Execute(func() (interface{}, error) {
        var resp ProcessPaymentResponse
        if err := c.client.Do(ctx, "POST", "/payments", req, &resp); err != nil {
            return nil, err
        }
        return &resp, nil
    })

    if err != nil {
        if err == gobreaker.ErrOpenState {
            c.logger.Warn("circuit breaker is open",
                zap.String("service", "payment-service"),
            )
            return nil, ErrServiceUnavailable
        }
        return nil, err
    }

    return result.(*ProcessPaymentResponse), nil
}

func (c *PaymentServiceClient) GetPaymentStatus(ctx context.Context, paymentID string) (*ProcessPaymentResponse, error) {
    result, err := c.breaker.Execute(func() (interface{}, error) {
        var resp ProcessPaymentResponse
        path := fmt.Sprintf("/payments/%s", paymentID)
        if err := c.client.Do(ctx, "GET", path, nil, &resp); err != nil {
            return nil, err
        }
        return &resp, nil
    })

    if err != nil {
        return nil, err
    }

    return result.(*ProcessPaymentResponse), nil
}
```

### Request/Response Middleware

Add observability and common functionality:

```go
type Middleware func(RoundTripper) RoundTripper

type RoundTripper interface {
    RoundTrip(*http.Request) (*http.Response, error)
}

// Logging middleware
func LoggingMiddleware(logger *zap.Logger) Middleware {
    return func(next RoundTripper) RoundTripper {
        return RoundTripperFunc(func(req *http.Request) (*http.Response, error) {
            start := time.Now()

            logger.Debug("outgoing request",
                zap.String("method", req.Method),
                zap.String("url", req.URL.String()),
            )

            resp, err := next.RoundTrip(req)

            duration := time.Since(start)
            if err != nil {
                logger.Error("request failed",
                    zap.Error(err),
                    zap.String("method", req.Method),
                    zap.String("url", req.URL.String()),
                    zap.Duration("duration", duration),
                )
            } else {
                logger.Debug("request completed",
                    zap.String("method", req.Method),
                    zap.String("url", req.URL.String()),
                    zap.Int("status", resp.StatusCode),
                    zap.Duration("duration", duration),
                )
            }

            return resp, err
        })
    }
}

// Metrics middleware
func MetricsMiddleware(metrics *Metrics) Middleware {
    return func(next RoundTripper) RoundTripper {
        return RoundTripperFunc(func(req *http.Request) (*http.Response, error) {
            start := time.Now()

            resp, err := next.RoundTrip(req)

            duration := time.Since(start).Seconds()
            status := "error"
            if resp != nil {
                status = strconv.Itoa(resp.StatusCode)
            }

            metrics.httpClientRequestDuration.WithLabelValues(
                req.Method,
                req.URL.Host,
                status,
            ).Observe(duration)

            metrics.httpClientRequestsTotal.WithLabelValues(
                req.Method,
                req.URL.Host,
                status,
            ).Inc()

            return resp, err
        })
    }
}

// Tracing middleware
func TracingMiddleware(tracer trace.Tracer) Middleware {
    return func(next RoundTripper) RoundTripper {
        return RoundTripperFunc(func(req *http.Request) (*http.Response, error) {
            ctx := req.Context()
            ctx, span := tracer.Start(ctx, fmt.Sprintf("HTTP %s", req.Method),
                trace.WithSpanKind(trace.SpanKindClient),
                trace.WithAttributes(
                    semconv.HTTPMethodKey.String(req.Method),
                    semconv.HTTPURLKey.String(req.URL.String()),
                    semconv.NetPeerNameKey.String(req.URL.Host),
                ),
            )
            defer span.End()

            req = req.WithContext(ctx)

            // Inject trace context into headers
            otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(req.Header))

            resp, err := next.RoundTrip(req)

            if err != nil {
                span.RecordError(err)
                span.SetStatus(codes.Error, err.Error())
            } else {
                span.SetAttributes(semconv.HTTPStatusCodeKey.Int(resp.StatusCode))
                if resp.StatusCode >= 400 {
                    span.SetStatus(codes.Error, fmt.Sprintf("HTTP %d", resp.StatusCode))
                }
            }

            return resp, err
        })
    }
}

// Authentication middleware
func AuthMiddleware(token string) Middleware {
    return func(next RoundTripper) RoundTripper {
        return RoundTripperFunc(func(req *http.Request) (*http.Response, error) {
            req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
            return next.RoundTrip(req)
        })
    }
}

// Rate limiting middleware
func RateLimitMiddleware(limiter *rate.Limiter) Middleware {
    return func(next RoundTripper) RoundTripper {
        return RoundTripperFunc(func(req *http.Request) (*http.Response, error) {
            if err := limiter.Wait(req.Context()); err != nil {
                return nil, fmt.Errorf("rate limit: %w", err)
            }
            return next.RoundTrip(req)
        })
    }
}

type RoundTripperFunc func(*http.Request) (*http.Response, error)

func (f RoundTripperFunc) RoundTrip(req *http.Request) (*http.Response, error) {
    return f(req)
}

// Chain middlewares
func Chain(middlewares ...Middleware) Middleware {
    return func(next RoundTripper) RoundTripper {
        for i := len(middlewares) - 1; i >= 0; i-- {
            next = middlewares[i](next)
        }
        return next
    }
}

// Usage
func NewInstrumentedClient(baseURL string, token string, logger *zap.Logger, metrics *Metrics) *http.Client {
    transport := Chain(
        LoggingMiddleware(logger),
        MetricsMiddleware(metrics),
        TracingMiddleware(otel.Tracer("http-client")),
        AuthMiddleware(token),
        RateLimitMiddleware(rate.NewLimiter(rate.Limit(100), 10)),
    )(http.DefaultTransport)

    return &http.Client{
        Transport: transport,
        Timeout:   30 * time.Second,
    }
}
```

### Timeout and Cancellation

Implement proper timeout handling:

```go
type TimeoutConfig struct {
    ConnectionTimeout time.Duration
    RequestTimeout    time.Duration
    KeepAlive         time.Duration
    IdleConnTimeout   time.Duration
    MaxIdleConns      int
}

func NewClientWithTimeouts(config TimeoutConfig) *http.Client {
    transport := &http.Transport{
        DialContext: (&net.Dialer{
            Timeout:   config.ConnectionTimeout,
            KeepAlive: config.KeepAlive,
        }).DialContext,
        MaxIdleConns:        config.MaxIdleConns,
        MaxIdleConnsPerHost: config.MaxIdleConns,
        IdleConnTimeout:     config.IdleConnTimeout,
        TLSHandshakeTimeout: 10 * time.Second,
    }

    return &http.Client{
        Transport: transport,
        Timeout:   config.RequestTimeout,
    }
}

// Context-aware request
func (c *HTTPClient) GetWithTimeout(ctx context.Context, url string, timeout time.Duration) (*Response, error) {
    ctx, cancel := context.WithTimeout(ctx, timeout)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, err
    }

    resp, err := c.client.Do(req)
    if err != nil {
        if ctx.Err() == context.DeadlineExceeded {
            return nil, ErrRequestTimeout
        }
        return nil, err
    }

    return resp, nil
}
```

### Connection Pooling

Optimize connection management:

```go
type ClientPool struct {
    clients map[string]*http.Client
    mu      sync.RWMutex
    config  ClientPoolConfig
}

type ClientPoolConfig struct {
    MaxIdleConnsPerHost int
    MaxConnsPerHost     int
    IdleConnTimeout     time.Duration
}

func NewClientPool(config ClientPoolConfig) *ClientPool {
    return &ClientPool{
        clients: make(map[string]*http.Client),
        config:  config,
    }
}

func (p *ClientPool) GetClient(host string) *http.Client {
    p.mu.RLock()
    if client, exists := p.clients[host]; exists {
        p.mu.RUnlock()
        return client
    }
    p.mu.RUnlock()

    p.mu.Lock()
    defer p.mu.Unlock()

    // Double-check after acquiring write lock
    if client, exists := p.clients[host]; exists {
        return client
    }

    transport := &http.Transport{
        MaxIdleConnsPerHost: p.config.MaxIdleConnsPerHost,
        MaxConnsPerHost:     p.config.MaxConnsPerHost,
        IdleConnTimeout:     p.config.IdleConnTimeout,
    }

    client := &http.Client{
        Transport: transport,
        Timeout:   30 * time.Second,
    }

    p.clients[host] = client
    return client
}
```

### Error Handling and Retries

Implement sophisticated error handling:

```go
type RetryPolicy struct {
    MaxRetries      int
    InitialInterval time.Duration
    MaxInterval     time.Duration
    Multiplier      float64
    Jitter          bool
}

func (p *RetryPolicy) ShouldRetry(attempt int, err error) bool {
    if attempt >= p.MaxRetries {
        return false
    }

    // Check if error is retryable
    var httpErr *HTTPError
    if errors.As(err, &httpErr) {
        // Retry on 5xx and 429
        return httpErr.StatusCode >= 500 || httpErr.StatusCode == 429
    }

    // Retry on network errors
    var netErr net.Error
    if errors.As(err, &netErr) {
        return netErr.Timeout() || netErr.Temporary()
    }

    // Don't retry on other errors
    return false
}

func (p *RetryPolicy) NextBackoff(attempt int) time.Duration {
    interval := p.InitialInterval * time.Duration(math.Pow(p.Multiplier, float64(attempt)))

    if interval > p.MaxInterval {
        interval = p.MaxInterval
    }

    if p.Jitter {
        // Add jitter: 50%-150% of calculated interval
        jitter := interval / 2
        interval = interval - jitter + time.Duration(rand.Int63n(int64(2*jitter)))
    }

    return interval
}

func (c *HTTPClient) DoWithRetry(ctx context.Context, req *http.Request, policy *RetryPolicy) (*http.Response, error) {
    var lastErr error

    for attempt := 0; attempt <= policy.MaxRetries; attempt++ {
        if attempt > 0 {
            backoff := policy.NextBackoff(attempt - 1)
            c.logger.Debug("retrying request",
                zap.Int("attempt", attempt),
                zap.Duration("backoff", backoff),
            )

            select {
            case <-ctx.Done():
                return nil, ctx.Err()
            case <-time.After(backoff):
            }
        }

        resp, err := c.client.Do(req)
        if err == nil && resp.StatusCode < 500 && resp.StatusCode != 429 {
            return resp, nil
        }

        lastErr = err
        if !policy.ShouldRetry(attempt, err) {
            break
        }
    }

    return nil, fmt.Errorf("max retries exceeded: %w", lastErr)
}
```

## Implementation Guidelines

### Client Configuration

1. **Timeouts**: Always set connection and request timeouts
2. **Connection pooling**: Configure appropriate pool sizes
3. **Keep-alive**: Use keep-alive connections for better performance
4. **TLS**: Configure TLS settings for secure connections
5. **Retries**: Implement exponential backoff with jitter

### Observability

1. **Logging**: Log all requests with method, URL, status, duration
2. **Metrics**: Track request count, duration, error rate
3. **Tracing**: Propagate trace context across service boundaries
4. **Circuit breakers**: Monitor circuit breaker state changes
5. **Alerts**: Alert on high error rates or circuit breaker trips

### Error Handling

1. **Typed errors**: Use typed errors for different failure scenarios
2. **Retry logic**: Only retry idempotent operations
3. **Timeout handling**: Distinguish between timeout and other errors
4. **Graceful degradation**: Implement fallbacks when services are unavailable
5. **Error context**: Include relevant context in errors

## Anti-Patterns to Avoid

### Don't Use http.DefaultClient

```go
// Bad: No timeouts, no configuration
resp, err := http.Get(url)

// Good: Configured client with timeouts
client := &http.Client{Timeout: 10 * time.Second}
resp, err := client.Get(url)
```

### Don't Ignore Response Bodies

```go
// Bad: Resource leak
resp, err := client.Get(url)
if err != nil {
    return err
}

// Good: Always close response body
resp, err := client.Get(url)
if err != nil {
    return err
}
defer resp.Body.Close()
```

### Don't Retry Non-Idempotent Operations

```go
// Bad: Retrying POST without idempotency
for i := 0; i < 3; i++ {
    resp, err := client.Post(url, body)
    if err == nil {
        break
    }
}

// Good: Use idempotency key for retryable operations
req.Header.Set("Idempotency-Key", uuid.New().String())
for i := 0; i < 3; i++ {
    resp, err := client.Do(req)
    if err == nil {
        break
    }
}
```

### Don't Share http.Client Without Configuration

```go
// Bad: Unbounded connection pool
var globalClient = &http.Client{}

// Good: Configure connection limits
var globalClient = &http.Client{
    Transport: &http.Transport{
        MaxIdleConnsPerHost: 100,
        MaxConnsPerHost:     100,
    },
}
```

## Related Implementers

- **error-handling.md**: Error types and handling strategies
- **logging-observability.md**: Client-side observability
- **testing.md**: Testing HTTP clients with mocks
- **grpc-api.md**: Alternative RPC communication
