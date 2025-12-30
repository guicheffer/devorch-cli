---
domain: kubernetes-operators
description: Kubernetes pod operators for containerized workloads with resource management and configuration
---

# Kubernetes Operators

Execute containerized workloads on Kubernetes using KubernetesPodOperator with proper configuration, resource limits, and error handling.

## Core Patterns

### 1. Basic Kubernetes Pod Operator

**Pattern:** Use KubernetesPodOperator to run Docker containers on Kubernetes clusters.

**Example:**
```python
from airflow.providers.cncf.kubernetes.operators.kubernetes_pod import KubernetesPodOperator

with dag:
    run_container = KubernetesPodOperator(
        task_id="run_data_processing",
        name="data-processing-pod",
        namespace="data-pipelines",
        image="my-registry.com/data-processing:v1.2.3",
        cmds=["python"],
        arguments=[
            "/app/process_data.py",
            "--date", "{{ ds }}",
            "--bucket", "s3://my-data-bucket",
        ],
        env_vars={
            "AWS_REGION": "us-east-1",
            "ENVIRONMENT": "production",
        },
        resources={
            "request_memory": "4Gi",
            "request_cpu": "2",
            "limit_memory": "8Gi",
            "limit_cpu": "4",
        },
        is_delete_operator_pod=True,
        get_logs=True,
        dag=dag,
    )
```

**Frequency:** 56% of containerized workloads use KubernetesPodOperator

**Why:** Kubernetes operators provide:
- Container orchestration
- Resource isolation
- Scalability
- Custom runtime environments
- Multi-language support

### 2. ConfigMap and Secret Management

**Pattern:** Use ConfigMaps for configuration and Secrets for sensitive data.

**Example:**
```python
from kubernetes.client import models as k8s

with dag:
    run_with_config = KubernetesPodOperator(
        task_id="run_with_config",
        name="processing-with-config",
        namespace="data-pipelines",
        image="my-registry.com/processor:latest",
        # Load environment variables from ConfigMap
        env_vars=[
            k8s.V1EnvVar(
                name="DATABASE_URL",
                value_from=k8s.V1EnvVarSource(
                    config_map_key_ref=k8s.V1ConfigMapKeySelector(
                        name="app-config",
                        key="database_url",
                    )
                ),
            ),
            k8s.V1EnvVar(
                name="DB_PASSWORD",
                value_from=k8s.V1EnvVarSource(
                    secret_key_ref=k8s.V1SecretKeySelector(
                        name="db-secrets",
                        key="password",
                    )
                ),
            ),
        ],
        dag=dag,
    )
```

**Frequency:** 44% of K8s operators use ConfigMaps/Secrets

### 3. Volume Mounts

**Pattern:** Mount volumes for persistent storage or shared data.

**Example:**
```python
from kubernetes.client import models as k8s

with dag:
    process_with_volumes = KubernetesPodOperator(
        task_id="process_with_volumes",
        name="data-processing",
        namespace="data-pipelines",
        image="my-registry.com/processor:latest",
        volumes=[
            k8s.V1Volume(
                name="data-volume",
                persistent_volume_claim=k8s.V1PersistentVolumeClaimVolumeSource(
                    claim_name="data-pvc",
                ),
            ),
        ],
        volume_mounts=[
            k8s.V1VolumeMount(
                name="data-volume",
                mount_path="/data",
                read_only=False,
            ),
        ],
        dag=dag,
    )
```

**Frequency:** 32% of K8s operators use volumes

### 4. Service Account and RBAC

**Pattern:** Assign service accounts for pod-level permissions.

**Example:**
```python
with dag:
    secure_task = KubernetesPodOperator(
        task_id="secure_processing",
        name="secure-pod",
        namespace="data-pipelines",
        image="my-registry.com/processor:latest",
        service_account_name="data-pipeline-sa",
        dag=dag,
    )
```

**Frequency:** 40% of K8s operators specify service accounts

### 5. Node Selectors and Affinity

**Pattern:** Control pod placement on specific nodes.

**Example:**
```python
from kubernetes.client import models as k8s

with dag:
    gpu_task = KubernetesPodOperator(
        task_id="gpu_processing",
        name="gpu-pod",
        namespace="data-pipelines",
        image="my-registry.com/ml-processor:latest",
        node_selector={"gpu": "true", "instance-type": "p3.2xlarge"},
        affinity=k8s.V1Affinity(
            node_affinity=k8s.V1NodeAffinity(
                required_during_scheduling_ignored_during_execution=k8s.V1NodeSelector(
                    node_selector_terms=[
                        k8s.V1NodeSelectorTerm(
                            match_expressions=[
                                k8s.V1NodeSelectorRequirement(
                                    key="node.kubernetes.io/instance-type",
                                    operator="In",
                                    values=["p3.2xlarge", "p3.8xlarge"],
                                )
                            ]
                        )
                    ]
                )
            )
        ),
        dag=dag,
    )
```

**Frequency:** 24% of K8s operators use node selection

## Related Implementers

- **dag-definition.md** - DAG setup for Kubernetes workloads
- **task-dependencies.md** - Kubernetes task orchestration
- **spark-operators.md** - Comparison with Spark operators
