---
domain: build-system
description: Bazel build system patterns for Go microservices including BUILD.bazel files, gazelle, and remote caching
---

# Build System Implementer

This implementer defines patterns for using Bazel as the build system for Go microservices, including BUILD.bazel file structure, dependency management with gazelle, and optimization strategies.

## Core Patterns

### Root BUILD.bazel

Define root-level build configuration:

```python
# BUILD.bazel
load("@bazel_gazelle//:def.bzl", "gazelle")
load("@com_github_bazelbuild_buildtools//buildifier:def.bzl", "buildifier")

# Gazelle configuration
# gazelle:prefix github.com/example/myservice
# gazelle:proto disable_global
gazelle(
    name = "gazelle",
    prefix = "github.com/example/myservice",
)

# Update Bazel build files
gazelle(
    name = "gazelle-update-repos",
    args = [
        "-from_file=go.mod",
        "-to_macro=deps.bzl%go_dependencies",
        "-prune",
    ],
    command = "update-repos",
)

# Format build files
buildifier(
    name = "buildifier",
)

# Format check in CI
buildifier(
    name = "buildifier-check",
    diff_command = "diff -u",
    mode = "diff",
)
```

### WORKSPACE Configuration

Configure Bazel workspace with dependencies:

```python
# WORKSPACE
workspace(name = "myservice")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# Go rules
http_archive(
    name = "io_bazel_rules_go",
    sha256 = "...",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/rules_go/releases/download/v0.39.1/rules_go-v0.39.1.zip",
        "https://github.com/bazelbuild/rules_go/releases/download/v0.39.1/rules_go-v0.39.1.zip",
    ],
)

http_archive(
    name = "bazel_gazelle",
    sha256 = "...",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/bazel-gazelle/releases/download/v0.31.0/bazel-gazelle-v0.31.0.tar.gz",
        "https://github.com/bazelbuild/bazel-gazelle/releases/download/v0.31.0/bazel-gazelle-v0.31.0.tar.gz",
    ],
)

# Load Go rules
load("@io_bazel_rules_go//go:deps.bzl", "go_register_toolchains", "go_rules_dependencies")
load("@bazel_gazelle//:deps.bzl", "gazelle_dependencies")
load("//:deps.bzl", "go_dependencies")

# gazelle:repository_macro deps.bzl%go_dependencies
go_dependencies()

go_rules_dependencies()

go_register_toolchains(version = "1.21.0")

gazelle_dependencies()

# Docker rules
http_archive(
    name = "io_bazel_rules_docker",
    sha256 = "...",
    strip_prefix = "rules_docker-0.25.0",
    urls = ["https://github.com/bazelbuild/rules_docker/releases/download/v0.25.0/rules_docker-v0.25.0.tar.gz"],
)

load(
    "@io_bazel_rules_docker//repositories:repositories.bzl",
    container_repositories = "repositories",
)
container_repositories()

load("@io_bazel_rules_docker//repositories:deps.bzl", container_deps = "deps")
container_deps()

load(
    "@io_bazel_rules_docker//go:image.bzl",
    _go_image_repos = "repositories",
)
_go_image_repos()

# Protobuf rules
http_archive(
    name = "rules_proto",
    sha256 = "...",
    strip_prefix = "rules_proto-5.3.0-21.7",
    urls = [
        "https://github.com/bazelbuild/rules_proto/archive/refs/tags/5.3.0-21.7.tar.gz",
    ],
)

load("@rules_proto//proto:repositories.bzl", "rules_proto_dependencies", "rules_proto_toolchains")
rules_proto_dependencies()
rules_proto_toolchains()
```

### Service BUILD.bazel

Define build targets for a service:

```python
# cmd/api/BUILD.bazel
load("@io_bazel_rules_go//go:def.bzl", "go_binary", "go_library")
load("@io_bazel_rules_docker//go:image.bzl", "go_image")
load("@io_bazel_rules_docker//container:container.bzl", "container_push")

go_library(
    name = "api_lib",
    srcs = ["main.go"],
    importpath = "github.com/example/myservice/cmd/api",
    visibility = ["//visibility:private"],
    deps = [
        "//internal/config",
        "//internal/server",
        "//internal/service",
        "//internal/repository",
        "@com_github_gin_gonic_gin//:gin",
        "@org_uber_go_zap//:zap",
        "@io_opentelemetry_go_otel//:otel",
    ],
)

go_binary(
    name = "api",
    embed = [":api_lib"],
    visibility = ["//visibility:public"],
)

# Docker image
go_image(
    name = "image",
    embed = [":api_lib"],
    base = "@distroless_base//image",
    goarch = "amd64",
    goos = "linux",
    pure = "on",
)

# Push to registry
container_push(
    name = "push",
    format = "Docker",
    image = ":image",
    registry = "gcr.io",
    repository = "myproject/myservice",
    tag = "{BUILD_USER}",
)
```

### Library BUILD.bazel

Define build targets for libraries:

```python
# internal/service/BUILD.bazel
load("@io_bazel_rules_go//go:def.bzl", "go_library", "go_test")

go_library(
    name = "service",
    srcs = [
        "user_service.go",
        "order_service.go",
    ],
    importpath = "github.com/example/myservice/internal/service",
    visibility = ["//visibility:public"],
    deps = [
        "//internal/domain",
        "//internal/repository",
        "//pkg/logger",
        "@com_github_google_uuid//:uuid",
        "@org_uber_go_zap//:zap",
    ],
)

go_test(
    name = "service_test",
    srcs = [
        "user_service_test.go",
        "order_service_test.go",
    ],
    embed = [":service"],
    deps = [
        "//internal/domain",
        "//internal/repository/mocks",
        "@com_github_stretchr_testify//assert",
        "@com_github_stretchr_testify//mock",
        "@com_github_stretchr_testify//require",
    ],
)
```

### Protobuf BUILD.bazel

Define protobuf compilation:

```python
# api/proto/BUILD.bazel
load("@rules_proto//proto:defs.bzl", "proto_library")
load("@io_bazel_rules_go//proto:def.bzl", "go_proto_library")
load("@io_bazel_rules_go//go:def.bzl", "go_library")

proto_library(
    name = "user_proto",
    srcs = ["user.proto"],
    visibility = ["//visibility:public"],
    deps = [
        "@com_google_protobuf//:timestamp_proto",
        "@com_google_protobuf//:empty_proto",
    ],
)

go_proto_library(
    name = "user_go_proto",
    compilers = ["@io_bazel_rules_go//proto:go_grpc"],
    importpath = "github.com/example/myservice/api/proto/user",
    proto = ":user_proto",
    visibility = ["//visibility:public"],
)

go_library(
    name = "user",
    embed = [":user_go_proto"],
    importpath = "github.com/example/myservice/api/proto/user",
    visibility = ["//visibility:public"],
)
```

### Test Configuration

Configure test execution:

```python
# BUILD.bazel
load("@io_bazel_rules_go//go:def.bzl", "go_test")

go_test(
    name = "integration_test",
    srcs = glob(["*_integration_test.go"]),
    tags = ["integration"],
    deps = [
        "//internal/config",
        "//internal/server",
        "@com_github_stretchr_testify//suite",
        "@com_github_testcontainers_testcontainers_go//:testcontainers-go",
    ],
)

# Test suite
test_suite(
    name = "all_tests",
    tests = [
        "//internal/service:service_test",
        "//internal/repository:repository_test",
        "//internal/handler:handler_test",
    ],
)

# Integration tests
test_suite(
    name = "integration_tests",
    tags = ["integration"],
    tests = [
        ":integration_test",
        "//test/integration:all",
    ],
)
```

### .bazelrc Configuration

Configure Bazel behavior:

```bash
# .bazelrc

# Common flags
build --incompatible_strict_action_env
build --watchfs
build --symlink_prefix=/

# Go specific
build --@io_bazel_rules_go//go/config:pure
build --@io_bazel_rules_go//go/config:static

# Test configuration
test --test_output=errors
test --test_timeout=300
test --test_env=GO_TEST_WRAP_TESTV=1

# Remote cache
build:remote --remote_cache=grpc://cache.example.com:9092
build:remote --remote_timeout=3600

# CI configuration
build:ci --remote_cache=grpc://cache.example.com:9092
build:ci --experimental_remote_cache_async
build:ci --jobs=50
build:ci --flaky_test_attempts=3

# Local development
build:local --disk_cache=~/.cache/bazel

# Release configuration
build:release --compilation_mode=opt
build:release --stamp
build:release --workspace_status_command=./tools/workspace_status.sh

# Debug configuration
build:debug --compilation_mode=dbg
build:debug --strip=never

# Try import user-specific configuration
try-import %workspace%/.bazelrc.user
```

### Workspace Status Script

Define version stamping:

```bash
#!/bin/bash
# tools/workspace_status.sh

# Git commit
echo "STABLE_GIT_COMMIT $(git rev-parse HEAD)"

# Git tag
echo "STABLE_GIT_TAG $(git describe --tags --always --dirty)"

# Build timestamp
echo "STABLE_BUILD_TIME $(date -u +%Y%m%d-%H%M%S)"

# Build user
echo "BUILD_USER ${USER:-unknown}"

# Branch name
echo "STABLE_GIT_BRANCH $(git rev-parse --abbrev-ref HEAD)"
```

### Dependency Management

Define external Go dependencies:

```python
# deps.bzl
load("@bazel_gazelle//:deps.bzl", "go_repository")

def go_dependencies():
    go_repository(
        name = "com_github_gin_gonic_gin",
        importpath = "github.com/gin-gonic/gin",
        sum = "h1:...",
        version = "v1.9.1",
    )

    go_repository(
        name = "org_uber_go_zap",
        importpath = "go.uber.org/zap",
        sum = "h1:...",
        version = "v1.26.0",
    )

    go_repository(
        name = "com_github_stretchr_testify",
        importpath = "github.com/stretchr/testify",
        sum = "h1:...",
        version = "v1.8.4",
    )

    # ... more dependencies
```

### Makefile Wrapper

Provide convenient Make targets:

```makefile
# Makefile
.PHONY: build test clean gazelle

# Build all targets
build:
	bazel build //...

# Build specific service
build-api:
	bazel build //cmd/api:api

# Run tests
test:
	bazel test //...

# Run integration tests
test-integration:
	bazel test --test_tag_filters=integration //...

# Update BUILD files
gazelle:
	bazel run //:gazelle

# Update dependencies
gazelle-update-repos:
	bazel run //:gazelle-update-repos

# Format BUILD files
buildifier:
	bazel run //:buildifier

# Build Docker image
image:
	bazel build //cmd/api:image

# Push Docker image
push:
	bazel run //cmd/api:push

# Clean build artifacts
clean:
	bazel clean

# Clean everything including external deps
clean-all:
	bazel clean --expunge

# Run specific test
test-service:
	bazel test //internal/service:service_test

# Coverage
coverage:
	bazel coverage //...

# Generate dependency graph
graph:
	bazel query --output=graph //... | dot -Tpng > deps.png
```

## Implementation Guidelines

### BUILD File Organization

1. **Granular targets**: Create fine-grained targets for better caching
2. **Visibility**: Use appropriate visibility (private by default)
3. **Dependencies**: Declare all dependencies explicitly
4. **Tags**: Use tags for filtering (integration, manual, etc.)
5. **Naming**: Use consistent naming conventions

### Performance Optimization

1. **Remote caching**: Use remote cache for CI/CD
2. **Incremental builds**: Structure code for maximum caching
3. **Parallel execution**: Configure appropriate job count
4. **Test sharding**: Shard large test suites
5. **Action caching**: Enable action caching

### Dependency Management

1. **Gazelle**: Use gazelle to auto-generate BUILD files
2. **Version pinning**: Pin all external dependencies
3. **Vendoring**: Consider vendoring for reproducibility
4. **Updates**: Regularly update dependencies
5. **Pruning**: Remove unused dependencies

### CI/CD Integration

1. **Remote cache**: Share cache between CI runs
2. **Bazelisk**: Use bazelisk for version management
3. **Build stamping**: Include version info in binaries
4. **Artifacts**: Publish build artifacts
5. **Reproducibility**: Ensure hermetic builds

## Anti-Patterns to Avoid

### Don't Commit Generated Files

```python
# Bad: Manually written BUILD file that should be generated
# internal/service/BUILD.bazel

# Good: Let gazelle generate it
# Run: bazel run //:gazelle
```

### Don't Use Wildcard Dependencies

```python
# Bad
deps = [
    "//internal/...",  # Too broad
]

# Good
deps = [
    "//internal/service",
    "//internal/repository",
]
```

### Don't Skip Visibility Declarations

```python
# Bad: Everything public
go_library(
    name = "lib",
    visibility = ["//visibility:public"],  # Too permissive
)

# Good: Explicit visibility
go_library(
    name = "lib",
    visibility = ["//cmd:__subpackages__"],
)
```

### Don't Mix Source and Generated Files

```python
# Bad
go_library(
    name = "lib",
    srcs = glob(["*.go"]) + [":generated"],  # Mixed
)

# Good
go_library(
    name = "lib",
    srcs = glob(["*.go"], exclude = ["*_generated.go"]),
    embed = [":generated"],
)
```

## Related Implementers

- **deployment.md**: Deploying Bazel-built artifacts
- **configuration.md**: Build-time configuration
- **testing.md**: Running tests with Bazel
- **code-organization.md**: Project structure for Bazel
