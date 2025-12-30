---
domain: deployment
description: Kubernetes deployment patterns including manifests, Helm charts, health checks, and GitOps workflows
---

# Deployment Implementer

This implementer defines patterns for deploying Go microservices to Kubernetes, including deployment manifests, service configuration, ingress setup, and GitOps workflows.

## Core Patterns

### Kubernetes Deployment

Define deployment with proper resource management:

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myservice
  namespace: production
  labels:
    app: myservice
    version: v1
    tier: backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: myservice
  template:
    metadata:
      labels:
        app: myservice
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: myservice
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: myservice
          image: gcr.io/myproject/myservice:v1.0.0
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 8080
              protocol: TCP
            - name: grpc
              containerPort: 9090
              protocol: TCP
          env:
            - name: ENV
              value: "production"
            - name: LOG_LEVEL
              value: "info"
            - name: SERVER_PORT
              value: "8080"
            - name: GRPC_PORT
              value: "9090"
          envFrom:
            - configMapRef:
                name: myservice-config
            - secretRef:
                name: myservice-secrets
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          livenessProbe:
            httpGet:
              path: /health/live
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            successThreshold: 1
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            successThreshold: 1
            failureThreshold: 3
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: cache
              mountPath: /cache
      volumes:
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}
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
                        - myservice
                topologyKey: kubernetes.io/hostname
```

### Service Configuration

Define Kubernetes service for load balancing:

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myservice
  namespace: production
  labels:
    app: myservice
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 80
      targetPort: http
      protocol: TCP
    - name: grpc
      port: 9090
      targetPort: grpc
      protocol: TCP
  selector:
    app: myservice
---
# Headless service for StatefulSet if needed
apiVersion: v1
kind: Service
metadata:
  name: myservice-headless
  namespace: production
spec:
  clusterIP: None
  ports:
    - name: http
      port: 8080
      targetPort: http
  selector:
    app: myservice
```

### Ingress Configuration

Configure ingress for external access:

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myservice
  namespace: production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "30"
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: myservice-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myservice
                port:
                  name: http
```

### ConfigMap and Secrets

Manage configuration and secrets:

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myservice-config
  namespace: production
data:
  SERVER_PORT: "8080"
  GRPC_PORT: "9090"
  LOG_LEVEL: "info"
  MONGODB_DATABASE: "myapp"
  MONGODB_MAX_POOL_SIZE: "100"
  KAFKA_CONSUMER_GROUP: "myservice-prod"
  FEATURE_METRICS: "true"
  FEATURE_TRACING: "true"
---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: myservice-secrets
  namespace: production
type: Opaque
stringData:
  MONGODB_URI: mongodb+srv://user:pass@cluster.mongodb.net/
  REDIS_PASSWORD: secretpassword
  JWT_SECRET: supersecretjwtkey
  KAFKA_BROKERS: kafka-0.kafka:9092,kafka-1.kafka:9092
```

### HorizontalPodAutoscaler

Configure auto-scaling:

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myservice
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myservice
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
        - type: Pods
          value: 2
          periodSeconds: 30
      selectPolicy: Max
```

### PodDisruptionBudget

Ensure availability during disruptions:

```yaml
# k8s/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myservice
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: myservice
```

### ServiceAccount and RBAC

Configure service permissions:

```yaml
# k8s/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myservice
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: myservice
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: myservice
  namespace: production
subjects:
  - kind: ServiceAccount
    name: myservice
    namespace: production
roleRef:
  kind: Role
  name: myservice
  apiGroup: rbac.authorization.k8s.io
```

### NetworkPolicy

Restrict network access:

```yaml
# k8s/networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: myservice
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: myservice
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              role: frontend
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
        - protocol: TCP
          port: 9090
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: mongodb
      ports:
        - protocol: TCP
          port: 27017
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
    - to:
        - podSelector:
            matchLabels:
              app: kafka
      ports:
        - protocol: TCP
          port: 9092
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 53
        - protocol: UDP
          port: 53
```

### Monitoring with ServiceMonitor

Configure Prometheus monitoring:

```yaml
# k8s/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: myservice
  namespace: production
  labels:
    app: myservice
spec:
  selector:
    matchLabels:
      app: myservice
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
      scrapeTimeout: 10s
```

### Kustomization

Manage environment-specific configurations:

```yaml
# k8s/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
  - secret.yaml
  - hpa.yaml
  - pdb.yaml
  - rbac.yaml

commonLabels:
  app: myservice
  managed-by: kustomize

namespace: production
```

```yaml
# k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
  - ../../base

replicas:
  - name: myservice
    count: 5

images:
  - name: myservice
    newName: gcr.io/myproject/myservice
    newTag: v1.0.0

patchesStrategicMerge:
  - resources.yaml

configMapGenerator:
  - name: myservice-config
    behavior: merge
    literals:
      - LOG_LEVEL=info
      - FEATURE_METRICS=true

secretGenerator:
  - name: myservice-secrets
    behavior: replace
    envs:
      - secrets.env
```

### GitOps with ArgoCD

Define ArgoCD application:

```yaml
# argocd/application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myservice
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myservice
    targetRevision: main
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### CI/CD Pipeline

GitHub Actions deployment workflow:

```yaml
# .github/workflows/deploy.yaml
name: Deploy

on:
  push:
    branches:
      - main

env:
  REGISTRY: gcr.io
  IMAGE_NAME: myproject/myservice

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_CREDENTIALS }}

      - name: Configure Docker
        run: gcloud auth configure-docker

      - name: Build image
        run: |
          docker build -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} .
          docker tag ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest

      - name: Push image
        run: |
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest

      - name: Update kustomization
        run: |
          cd k8s/overlays/production
          kustomize edit set image myservice=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

      - name: Commit and push
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add k8s/overlays/production/kustomization.yaml
          git commit -m "Update image to ${{ github.sha }}"
          git push
```

### Dockerfile for Production

Optimized multi-stage Dockerfile:

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Copy dependency files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.version=${VERSION} -X main.commit=${COMMIT}" \
    -o /bin/myservice \
    ./cmd/api

# Final stage
FROM scratch

# Copy CA certificates
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy timezone data
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy binary
COPY --from=builder /bin/myservice /bin/myservice

# Non-root user
USER 1000:1000

# Expose ports
EXPOSE 8080 9090

# Run binary
ENTRYPOINT ["/bin/myservice"]
```

## Implementation Guidelines

### Deployment Best Practices

1. **Rolling updates**: Use rolling updates with proper health checks
2. **Resource limits**: Always set resource requests and limits
3. **Health checks**: Implement liveness and readiness probes
4. **Graceful shutdown**: Handle SIGTERM for clean shutdowns
5. **Pod disruption budgets**: Ensure availability during updates

### Security Best Practices

1. **Non-root user**: Run containers as non-root user
2. **Read-only filesystem**: Use read-only root filesystem
3. **Network policies**: Restrict network access
4. **RBAC**: Minimal permissions for service accounts
5. **Secret management**: Use external secret managers

### Monitoring and Observability

1. **Metrics**: Expose Prometheus metrics
2. **Logging**: Structured JSON logging to stdout
3. **Tracing**: Implement distributed tracing
4. **Alerting**: Define SLOs and alert rules
5. **Dashboards**: Create Grafana dashboards

### High Availability

1. **Multiple replicas**: Run at least 3 replicas
2. **Pod anti-affinity**: Spread pods across nodes
3. **Auto-scaling**: Configure HPA for traffic spikes
4. **Circuit breakers**: Implement circuit breakers
5. **Graceful degradation**: Handle dependency failures

## Anti-Patterns to Avoid

### Don't Use Latest Tag

```yaml
# Bad
image: myservice:latest

# Good
image: myservice:v1.0.0
```

### Don't Skip Resource Limits

```yaml
# Bad: No limits
resources:
  requests:
    cpu: 100m

# Good: Both requests and limits
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

### Don't Ignore Health Checks

```yaml
# Bad: No health checks
spec:
  containers:
    - name: myservice
      image: myservice:v1.0.0

# Good: Proper health checks
spec:
  containers:
    - name: myservice
      image: myservice:v1.0.0
      livenessProbe:
        httpGet:
          path: /health/live
          port: 8080
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 8080
```

### Don't Run as Root

```yaml
# Bad: Running as root
spec:
  containers:
    - name: myservice
      image: myservice:v1.0.0

# Good: Non-root user
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  containers:
    - name: myservice
      image: myservice:v1.0.0
```

## Related Implementers

- **configuration.md**: Configuration management for deployments
- **logging-observability.md**: Monitoring deployed services
- **build-system.md**: Building deployment artifacts
- **testing.md**: Testing before deployment
