---
domain: configuration
description: Configuration management using envconfig, Helm charts, feature flags, and secrets management
---

# Configuration Implementer

This implementer defines patterns for managing application configuration through environment variables, Helm charts, feature flags, and secure secrets management.

## Core Patterns

### Environment-Based Configuration

Use envconfig for type-safe environment variable configuration:

```go
import (
    "github.com/kelseyhightower/envconfig"
)

type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
    Cache    CacheConfig
    Kafka    KafkaConfig
    Auth     AuthConfig
    Features FeatureFlags
}

type ServerConfig struct {
    Port            int           `envconfig:"SERVER_PORT" default:"8080"`
    GRPCPort        int           `envconfig:"GRPC_PORT" default:"9090"`
    ReadTimeout     time.Duration `envconfig:"SERVER_READ_TIMEOUT" default:"30s"`
    WriteTimeout    time.Duration `envconfig:"SERVER_WRITE_TIMEOUT" default:"30s"`
    ShutdownTimeout time.Duration `envconfig:"SERVER_SHUTDOWN_TIMEOUT" default:"30s"`
    Env             string        `envconfig:"ENV" default:"development"`
}

type DatabaseConfig struct {
    URI             string        `envconfig:"MONGODB_URI" required:"true"`
    Database        string        `envconfig:"MONGODB_DATABASE" default:"myapp"`
    MaxPoolSize     int           `envconfig:"MONGODB_MAX_POOL_SIZE" default:"100"`
    MinPoolSize     int           `envconfig:"MONGODB_MIN_POOL_SIZE" default:"10"`
    ConnectTimeout  time.Duration `envconfig:"MONGODB_CONNECT_TIMEOUT" default:"10s"`
    SocketTimeout   time.Duration `envconfig:"MONGODB_SOCKET_TIMEOUT" default:"30s"`
}

type CacheConfig struct {
    Addresses    []string      `envconfig:"REDIS_ADDRESSES" required:"true"`
    Password     string        `envconfig:"REDIS_PASSWORD"`
    DB           int           `envconfig:"REDIS_DB" default:"0"`
    MaxRetries   int           `envconfig:"REDIS_MAX_RETRIES" default:"3"`
    PoolSize     int           `envconfig:"REDIS_POOL_SIZE" default:"10"`
    DialTimeout  time.Duration `envconfig:"REDIS_DIAL_TIMEOUT" default:"5s"`
    ReadTimeout  time.Duration `envconfig:"REDIS_READ_TIMEOUT" default:"3s"`
    WriteTimeout time.Duration `envconfig:"REDIS_WRITE_TIMEOUT" default:"3s"`
}

type KafkaConfig struct {
    Brokers       []string `envconfig:"KAFKA_BROKERS" required:"true"`
    ConsumerGroup string   `envconfig:"KAFKA_CONSUMER_GROUP" default:"myapp"`
    Version       string   `envconfig:"KAFKA_VERSION" default:"2.8.0"`
}

type AuthConfig struct {
    JWTSecret         string        `envconfig:"JWT_SECRET" required:"true"`
    JWTExpiry         time.Duration `envconfig:"JWT_EXPIRY" default:"24h"`
    RefreshTokenTTL   time.Duration `envconfig:"REFRESH_TOKEN_TTL" default:"168h"`
    PasswordMinLength int           `envconfig:"PASSWORD_MIN_LENGTH" default:"8"`
}

type FeatureFlags struct {
    EnableNewUserFlow bool `envconfig:"FEATURE_NEW_USER_FLOW" default:"false"`
    EnableMetrics     bool `envconfig:"FEATURE_METRICS" default:"true"`
    EnableTracing     bool `envconfig:"FEATURE_TRACING" default:"true"`
    EnableProfiling   bool `envconfig:"FEATURE_PROFILING" default:"false"`
}

// Load configuration from environment
func LoadConfig() (*Config, error) {
    var config Config
    if err := envconfig.Process("", &config); err != nil {
        return nil, fmt.Errorf("process config: %w", err)
    }

    if err := validateConfig(&config); err != nil {
        return nil, fmt.Errorf("validate config: %w", err)
    }

    return &config, nil
}

func validateConfig(config *Config) error {
    if config.Server.Port <= 0 || config.Server.Port > 65535 {
        return fmt.Errorf("invalid server port: %d", config.Server.Port)
    }

    if config.Database.MaxPoolSize < config.Database.MinPoolSize {
        return fmt.Errorf("max pool size must be >= min pool size")
    }

    if config.Auth.JWTSecret == "" {
        return fmt.Errorf("jwt secret is required")
    }

    return nil
}

// Configuration with defaults
func DefaultConfig() *Config {
    return &Config{
        Server: ServerConfig{
            Port:            8080,
            GRPCPort:        9090,
            ReadTimeout:     30 * time.Second,
            WriteTimeout:    30 * time.Second,
            ShutdownTimeout: 30 * time.Second,
            Env:             "development",
        },
        Database: DatabaseConfig{
            Database:       "myapp",
            MaxPoolSize:    100,
            MinPoolSize:    10,
            ConnectTimeout: 10 * time.Second,
            SocketTimeout:  30 * time.Second,
        },
        Features: FeatureFlags{
            EnableNewUserFlow: false,
            EnableMetrics:     true,
            EnableTracing:     true,
            EnableProfiling:   false,
        },
    }
}
```

### Feature Flags

Implement feature flag system for gradual rollouts:

```go
type FeatureFlagService struct {
    flags  map[string]*FeatureFlag
    mu     sync.RWMutex
    logger *zap.Logger
}

type FeatureFlag struct {
    Name        string
    Enabled     bool
    Rollout     float64 // 0.0 to 1.0
    Whitelist   []string
    Blacklist   []string
    StartDate   *time.Time
    EndDate     *time.Time
}

func NewFeatureFlagService(logger *zap.Logger) *FeatureFlagService {
    return &FeatureFlagService{
        flags:  make(map[string]*FeatureFlag),
        logger: logger,
    }
}

func (s *FeatureFlagService) RegisterFlag(flag *FeatureFlag) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.flags[flag.Name] = flag
}

func (s *FeatureFlagService) IsEnabled(ctx context.Context, flagName string, userID string) bool {
    s.mu.RLock()
    flag, exists := s.flags[flagName]
    s.mu.RUnlock()

    if !exists {
        s.logger.Warn("feature flag not found", zap.String("flag", flagName))
        return false
    }

    // Check if flag is enabled globally
    if !flag.Enabled {
        return false
    }

    // Check date range
    now := time.Now()
    if flag.StartDate != nil && now.Before(*flag.StartDate) {
        return false
    }
    if flag.EndDate != nil && now.After(*flag.EndDate) {
        return false
    }

    // Check blacklist
    for _, id := range flag.Blacklist {
        if id == userID {
            return false
        }
    }

    // Check whitelist
    for _, id := range flag.Whitelist {
        if id == userID {
            return true
        }
    }

    // Check rollout percentage
    if flag.Rollout >= 1.0 {
        return true
    }
    if flag.Rollout <= 0.0 {
        return false
    }

    // Deterministic rollout based on user ID hash
    hash := hashString(userID)
    return (hash % 100) < int(flag.Rollout*100)
}

func hashString(s string) int {
    h := 0
    for _, c := range s {
        h = 31*h + int(c)
    }
    if h < 0 {
        h = -h
    }
    return h
}

// Usage in service
func (s *UserService) CreateUser(ctx context.Context, input CreateUserInput) (*User, error) {
    // Check feature flag
    if s.features.IsEnabled(ctx, "new_user_flow", input.UserID) {
        return s.createUserV2(ctx, input)
    }
    return s.createUserV1(ctx, input)
}

// Dynamic feature flags from database/config service
type DynamicFeatureFlags struct {
    repo   FeatureFlagRepository
    cache  *sync.Map
    ttl    time.Duration
    logger *zap.Logger
}

func NewDynamicFeatureFlags(repo FeatureFlagRepository, ttl time.Duration, logger *zap.Logger) *DynamicFeatureFlags {
    return &DynamicFeatureFlags{
        repo:   repo,
        cache:  &sync.Map{},
        ttl:    ttl,
        logger: logger,
    }
}

func (f *DynamicFeatureFlags) IsEnabled(ctx context.Context, flagName string, userID string) bool {
    // Check cache first
    if cached, ok := f.cache.Load(flagName); ok {
        cachedFlag := cached.(*cachedFeatureFlag)
        if time.Since(cachedFlag.cachedAt) < f.ttl {
            return f.evaluateFlag(cachedFlag.flag, userID)
        }
    }

    // Fetch from repository
    flag, err := f.repo.GetFlag(ctx, flagName)
    if err != nil {
        f.logger.Error("failed to get feature flag",
            zap.Error(err),
            zap.String("flag", flagName),
        )
        return false
    }

    // Update cache
    f.cache.Store(flagName, &cachedFeatureFlag{
        flag:     flag,
        cachedAt: time.Now(),
    })

    return f.evaluateFlag(flag, userID)
}

type cachedFeatureFlag struct {
    flag     *FeatureFlag
    cachedAt time.Time
}
```

### Helm Charts Configuration

Define Helm values for Kubernetes deployment:

```yaml
# values.yaml
replicaCount: 3

image:
  repository: myapp
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8080
  grpcPort: 9090

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: api-tls
      hosts:
        - api.example.com

resources:
  limits:
    cpu: 1000m
    memory: 512Mi
  requests:
    cpu: 500m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

env:
  - name: SERVER_PORT
    value: "8080"
  - name: GRPC_PORT
    value: "9090"
  - name: ENV
    value: "production"
  - name: LOG_LEVEL
    value: "info"

envFrom:
  - configMapRef:
      name: myapp-config
  - secretRef:
      name: myapp-secrets

mongodb:
  enabled: true
  architecture: replicaset
  replicaCount: 3
  auth:
    enabled: true
    rootPassword: changeme
    databases:
      - myapp
    usernames:
      - myappuser

redis:
  enabled: true
  architecture: replicaset
  master:
    persistence:
      enabled: true
      size: 8Gi
  replica:
    replicaCount: 2
    persistence:
      enabled: true
      size: 8Gi

kafka:
  enabled: true
  replicaCount: 3
  persistence:
    enabled: true
    size: 10Gi

serviceMonitor:
  enabled: true
  interval: 30s
  path: /metrics

podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8080"
  prometheus.io/path: "/metrics"

podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000

securityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
  readOnlyRootFilesystem: true

livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3

nodeSelector: {}

tolerations: []

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - myapp
          topologyKey: kubernetes.io/hostname
```

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
        {{- with .Values.podAnnotations }}
        {{- toYaml . | nindent 8 }}
        {{- end }}
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "myapp.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
        - name: {{ .Chart.Name }}
          securityContext:
            {{- toYaml .Values.securityContext | nindent 12 }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.port }}
              protocol: TCP
            - name: grpc
              containerPort: {{ .Values.service.grpcPort }}
              protocol: TCP
          {{- if .Values.env }}
          env:
            {{- toYaml .Values.env | nindent 12 }}
          {{- end }}
          {{- if .Values.envFrom }}
          envFrom:
            {{- toYaml .Values.envFrom | nindent 12 }}
          {{- end }}
          livenessProbe:
            {{- toYaml .Values.livenessProbe | nindent 12 }}
          readinessProbe:
            {{- toYaml .Values.readinessProbe | nindent 12 }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

### Secrets Management

Implement secure secrets handling:

```go
import (
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/service/secretsmanager"
)

type SecretsManager struct {
    client *secretsmanager.SecretsManager
    cache  *sync.Map
    ttl    time.Duration
    logger *zap.Logger
}

func NewSecretsManager(region string, ttl time.Duration, logger *zap.Logger) (*SecretsManager, error) {
    sess, err := session.NewSession(&aws.Config{
        Region: aws.String(region),
    })
    if err != nil {
        return nil, err
    }

    return &SecretsManager{
        client: secretsmanager.New(sess),
        cache:  &sync.Map{},
        ttl:    ttl,
        logger: logger,
    }, nil
}

type cachedSecret struct {
    value     string
    cachedAt  time.Time
}

func (m *SecretsManager) GetSecret(ctx context.Context, secretName string) (string, error) {
    // Check cache
    if cached, ok := m.cache.Load(secretName); ok {
        cs := cached.(*cachedSecret)
        if time.Since(cs.cachedAt) < m.ttl {
            return cs.value, nil
        }
    }

    // Fetch from AWS Secrets Manager
    input := &secretsmanager.GetSecretValueInput{
        SecretId: aws.String(secretName),
    }

    result, err := m.client.GetSecretValueWithContext(ctx, input)
    if err != nil {
        m.logger.Error("failed to get secret",
            zap.Error(err),
            zap.String("secret", secretName),
        )
        return "", err
    }

    secret := aws.StringValue(result.SecretString)

    // Update cache
    m.cache.Store(secretName, &cachedSecret{
        value:    secret,
        cachedAt: time.Now(),
    })

    return secret, nil
}

// Kubernetes secrets
type K8sSecretsProvider struct {
    secretsPath string
    cache       map[string]string
    mu          sync.RWMutex
}

func NewK8sSecretsProvider(secretsPath string) *K8sSecretsProvider {
    return &K8sSecretsProvider{
        secretsPath: secretsPath,
        cache:       make(map[string]string),
    }
}

func (p *K8sSecretsProvider) GetSecret(key string) (string, error) {
    p.mu.RLock()
    if value, exists := p.cache[key]; exists {
        p.mu.RUnlock()
        return value, nil
    }
    p.mu.RUnlock()

    path := filepath.Join(p.secretsPath, key)
    data, err := os.ReadFile(path)
    if err != nil {
        return "", fmt.Errorf("read secret: %w", err)
    }

    value := string(data)

    p.mu.Lock()
    p.cache[key] = value
    p.mu.Unlock()

    return value, nil
}
```

## Implementation Guidelines

### Configuration Best Practices

1. **Environment variables**: Use environment variables for all configuration
2. **Defaults**: Provide sensible defaults for all non-critical settings
3. **Validation**: Validate configuration on startup
4. **Type safety**: Use structs with proper types
5. **Documentation**: Document all configuration options

### Feature Flag Guidelines

1. **Gradual rollout**: Start with small percentage rollout
2. **Monitoring**: Monitor metrics for flagged features
3. **Cleanup**: Remove flags after full rollout
4. **Testing**: Test both enabled and disabled states
5. **Documentation**: Document purpose and timeline of flags

### Secrets Management

1. **Never commit secrets**: Use secret managers or environment variables
2. **Rotation**: Support secret rotation without downtime
3. **Minimal access**: Follow principle of least privilege
4. **Encryption**: Encrypt secrets at rest and in transit
5. **Audit logging**: Log secret access for security audits

## Anti-Patterns to Avoid

### Don't Hardcode Configuration

```go
// Bad
const DatabaseURI = "mongodb://localhost:27017"

// Good
type Config struct {
    DatabaseURI string `envconfig:"MONGODB_URI" required:"true"`
}
```

### Don't Skip Validation

```go
// Bad
config := LoadConfig()
db := Connect(config.DatabaseURI)

// Good
config, err := LoadConfig()
if err != nil {
    log.Fatal(err)
}
if err := ValidateConfig(config); err != nil {
    log.Fatal(err)
}
```

### Don't Mix Environments

```go
// Bad
if os.Getenv("ENV") == "prod" {
    // production code
} else {
    // dev code
}

// Good: Use configuration
if config.Server.Env == "production" {
    // production code
}
```

## Related Implementers

- **deployment.md**: Kubernetes deployment configuration
- **logging-observability.md**: Configuration for observability
- **testing.md**: Testing with different configurations
- **build-system.md**: Build-time configuration
