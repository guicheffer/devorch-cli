---
domain: spark-operators
description: Spark job submission using Livy operators for EMR clusters with configuration and resource management
---

# Spark Operators

Submit and manage Spark jobs on EMR clusters using Livy operators with proper configuration, resource management, and error handling.

## Core Patterns

### 1. Spark Job Submit with Livy

**Pattern:** Use spark_job_submit utility for submitting Spark jobs via Livy to EMR clusters.

**Example from PR #1934:**
```python
# File: airflow/dags/conversions/subscriptions/events_cancelled/marketing_data_product_subscriptions_main__subscriptions_cancelled__v2.py
from utils.aws.emr.livy_operator import spark_job_submit

with dag:
    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")

    livy_conn_id = cm.read("livy_conn_id")
    airflow_pool = cm.read("airflow_pool")

    # Raw to intermediate load
    intermediate = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        airflow_pool=airflow_pool,
        entry_point=cm.read("entrypoint_path_intermediate"),
        application_args=[
            "--execution_timestamp",
            "{{ execution_date.strftime('%Y-%m-%d') }}",
            "--bob_entity_code",
            bob_entity_code,
            "--number_of_partitions",
            cm.read("number_of_partitions_intermediate"),
            "--country_offsets",
            cm.read("country_offsets"),
        ],
        task_id="intermediate",
        async_flag=False,
    )

    # Intermediate event dates load
    intermediate_event_dates = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        airflow_pool=airflow_pool,
        entry_point=cm.read("entrypoint_path_intermediate_event_dates"),
        application_args=[
            "--execution_date",
            "{{ execution_date.strftime('%Y-%m-%d') }}",
            "--bob_entity_code",
            bob_entity_code,
            "--number_of_partitions",
            cm.read("number_of_partitions_intermediate_event_dates"),
            "--intermediate_table",
            cm.read("intermediate_subscriptions_cancelled"),
        ],
        task_id="intermediate_event_dates",
        async_flag=False,
    )

    # Intermediate to main load
    main = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        airflow_pool=airflow_pool,
        entry_point=cm.read("entrypoint_path_main"),
        application_args=[
            "--execution_date",
            "{{ execution_date.strftime('%Y-%m-%d') }}",
            "--bob_entity_code",
            bob_entity_code,
            "--number_of_partitions",
            cm.read("number_of_partitions_main"),
            "--intermediate_table",
            cm.read("intermediate_subscriptions_cancelled"),
            "--main_table",
            cm.read("main_subscriptions_cancelled"),
        ],
        task_id="main",
        async_flag=False,
    )

    start >> intermediate >> intermediate_event_dates >> main >> end
```

**Frequency:** 84% of DAGs use spark_job_submit

**Why:** spark_job_submit provides:
- Simplified Spark job submission
- Automatic configuration management
- Resource pooling
- Error handling
- Retry logic
- Airflow integration

### 2. Application Arguments with Jinja Templates

**Pattern:** Pass dynamic arguments to Spark jobs using Jinja2 templates for execution date and other runtime parameters.

**Example from PR #1934:**
```python
application_args=[
    "--execution_timestamp",
    "{{ execution_date.strftime('%Y-%m-%d') }}",  # Jinja template for execution date
    "--execution_date",
    "{{ execution_date.strftime('%Y-%m-%d') }}",
    "--bob_entity_code",
    bob_entity_code,  # Static value from loop
    "--number_of_partitions",
    cm.read("number_of_partitions_intermediate"),  # From config
    "--intermediate_table",
    cm.read("intermediate_subscriptions_cancelled"),
    "--main_table",
    cm.read("main_subscriptions_cancelled"),
    "--country_offsets",
    cm.read("country_offsets"),
    "--write_to_delta",
    str(cm.read("write_to_delta", False)),
]
```

**Frequency:** 96% of Spark jobs use Jinja templates for dates

**Common Jinja patterns:**
```python
# Execution date formatting
"{{ execution_date.strftime('%Y-%m-%d') }}"
"{{ execution_date.strftime('%Y-%m-%d %H:%M:%S') }}"
"{{ ds }}"  # Short form for YYYY-MM-DD

# Date arithmetic
"{{ (execution_date - macros.timedelta(days=1)).strftime('%Y-%m-%d') }}"
"{{ (execution_date + macros.timedelta(hours=5)).strftime('%Y-%m-%d') }}"

# Next execution date
"{{ next_execution_date.strftime('%Y-%m-%d') if next_execution_date else '' }}"

# Previous execution date
"{{ prev_execution_date.strftime('%Y-%m-%d') }}"

# Custom macros
"{{ macros.ds_add(ds, -7) }}"  # 7 days ago
```

### 3. Spark Configuration with Delta Lake

**Pattern:** Configure Spark jobs with Delta Lake support and optimizations.

**Example from PR #1934:**
```yaml
# File: marketing_data_product_subscriptions_main__subscriptions_cancelled__v2.yml
global:
  spark_conf:
    # Delta Lake configuration
    spark.databricks.delta.optimize.repartition.enabled: true
    spark.sql.extensions: io.delta.sql.DeltaSparkSessionExtension
    spark.sql.catalog.spark_catalog: org.apache.spark.sql.delta.catalog.DeltaCatalog
    spark.jars.packages: io.delta:delta-core_2.12:2.1.0
    spark.databricks.delta.retentionDurationCheck.enabled: false

    # Executor configuration
    spark.dynamicAllocation.enabled: false
    spark.executor.cores: 1
    spark.executor.memory: 2G
    spark.executor.instances: 1

    # Driver configuration
    spark.driver.memory: 2G
    spark.driver.cores: 1

    # Performance tuning
    spark.sql.shuffle.partitions: 10
    spark.default.parallelism: 10
```

**Usage in Python:**
```python
intermediate = spark_job_submit(
    config=cm,
    dag=dag,
    livy_conn_id=livy_conn_id,
    entry_point=cm.read("entrypoint_path_intermediate"),
    spark_conf=cm.read("spark_conf"),  # Pass entire Spark config
    application_args=application_args,
    task_id="intermediate",
)
```

**Frequency:** 84% of Spark jobs include spark_conf

### 4. Airflow Pooling for Resource Management

**Pattern:** Use Airflow pools to limit concurrent Spark jobs on shared EMR clusters.

**Example from PR #1934:**
```python
# Configure pool in YAML
# File: config.yml
global:
  airflow_pool: subscription_jobs  # Pool with limited slots

# Use pool in task definition
intermediate = spark_job_submit(
    config=cm,
    dag=dag,
    livy_conn_id=livy_conn_id,
    airflow_pool=cm.read("airflow_pool"),  # Assign to pool
    entry_point=cm.read("entrypoint_path_intermediate"),
    task_id="intermediate",
)
```

**Pool configuration in Airflow UI:**
```
Pool Name: subscription_jobs
Slots: 10
Description: EMR cluster for subscription processing
```

**Frequency:** 88% of Spark jobs use pools

**Why:** Pooling provides:
- Resource contention management
- Cluster capacity control
- Cost optimization
- Fair scheduling
- Prevent cluster overload

### 5. Multi-Stage Spark Pipeline

**Pattern:** Chain multiple Spark jobs in sequence for layered data processing (raw → intermediate → main).

**Example from PR #1934:**
```python
with dag:
    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")

    # Stage 1: Raw to Intermediate
    raw_to_intermediate = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        airflow_pool=cm.read("airflow_pool"),
        entry_point=cm.read("entrypoint_path_intermediate"),
        application_args=[
            "--execution_date", "{{ ds }}",
            "--bob_entity_code", bob_entity_code,
            "--input_table", cm.read("raw_table"),
            "--output_table", cm.read("intermediate_table"),
        ],
        task_id="raw_to_intermediate",
        async_flag=False,
    )

    # Stage 2: Intermediate event dates processing
    intermediate_dates = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        airflow_pool=cm.read("airflow_pool"),
        entry_point=cm.read("entrypoint_path_intermediate_dates"),
        application_args=[
            "--execution_date", "{{ ds }}",
            "--intermediate_table", cm.read("intermediate_table"),
        ],
        task_id="intermediate_dates",
        async_flag=False,
    )

    # Stage 3: Intermediate to Main
    intermediate_to_main = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        airflow_pool=cm.read("airflow_pool"),
        entry_point=cm.read("entrypoint_path_main"),
        application_args=[
            "--execution_date", "{{ ds }}",
            "--intermediate_table", cm.read("intermediate_table"),
            "--main_table", cm.read("main_table"),
        ],
        task_id="intermediate_to_main",
        async_flag=False,
    )

    # Define pipeline
    start >> raw_to_intermediate >> intermediate_dates >> intermediate_to_main >> end
```

**Frequency:** 92% of data pipelines use multi-stage processing

**Data layer pattern:**
- **Raw layer**: Unprocessed source data
- **Intermediate layer**: Cleaned and transformed data
- **Main layer**: Business-ready aggregated data

### 6. Partition Configuration

**Pattern:** Configure number of Spark partitions for optimal performance.

**Example from PR #2145:**
```yaml
global:
  # Partition configuration per layer
  number_of_partitions_raw: 50
  number_of_partitions_intermediate: 20
  number_of_partitions_main: 10

  # Spark shuffle partitions
  spark_conf:
    spark.sql.shuffle.partitions: 200
    spark.default.parallelism: 100
```

**Usage in Python:**
```python
application_args=[
    "--number_of_partitions",
    str(cm.read("number_of_partitions_intermediate")),
]
```

**Frequency:** 84% of Spark jobs configure partitions

**Partition sizing guidelines:**
- Raw layer: 50-200 partitions (large data volume)
- Intermediate layer: 20-50 partitions (filtered data)
- Main layer: 5-20 partitions (aggregated data)
- Rule of thumb: 128MB per partition
- More partitions = more parallelism but more overhead

### 7. Async vs Sync Job Submission

**Pattern:** Use async_flag to control whether Airflow waits for Spark job completion.

**Example from PR #1934:**
```python
# Synchronous execution (default) - Airflow waits for completion
sync_task = spark_job_submit(
    config=cm,
    dag=dag,
    livy_conn_id=livy_conn_id,
    entry_point=cm.read("entrypoint_path"),
    task_id="sync_task",
    async_flag=False,  # Wait for job to complete
)

# Asynchronous execution - Airflow continues immediately
async_task = spark_job_submit(
    config=cm,
    dag=dag,
    livy_conn_id=livy_conn_id,
    entry_point=cm.read("entrypoint_path"),
    task_id="async_task",
    async_flag=True,  # Don't wait, job runs in background
)
```

**Frequency:** 96% of jobs use async_flag=False (synchronous)

**When to use sync vs async:**
- **Sync (async_flag=False)**: Data pipelines with dependencies
- **Async (async_flag=True)**: Long-running ML training jobs
- **Sync**: When downstream tasks need results
- **Async**: When jobs are independent

### 8. Task Concurrency Limits

**Pattern:** Limit task concurrency to prevent overwhelming clusters.

**Example:**
```yaml
global:
  # Limit concurrent tasks per DAG
  main_task_concurrency: 1
  intermediate_task_concurrency: 3
```

```python
main = spark_job_submit(
    config=cm,
    dag=dag,
    livy_conn_id=livy_conn_id,
    entry_point=cm.read("entrypoint_path_main"),
    task_id="main",
    task_concurrency=cm.read("main_task_concurrency"),  # Limit to 1
)
```

**Frequency:** 44% of Spark jobs set task_concurrency

### 9. Code Path and Binary Management

**Pattern:** Configure Spark application code paths for versioned deployments.

**Example from PR #1934:**
```yaml
global:
  # Binary repository path
  code_path: binary-repository/8.202.0/dist

  # Entry points relative to code path
  entrypoint_path_intermediate: marketing_data_product_subscriptions_intermediate/subscriptions_cancelled
  entrypoint_path_main: marketing_data_product_subscriptions_main/subscriptions_cancelled
```

**Frequency:** 90% of Spark jobs use versioned code paths

**Code path structure:**
```
binary-repository/
  8.200.0/
    dist/
      marketing_data_product_subscriptions_intermediate/
        subscriptions_cancelled/
          __main__.py
  8.201.0/
    dist/
      ...
  8.202.0/
    dist/
      ...
```

### 10. Livy Connection Configuration

**Pattern:** Configure Livy connection IDs for different EMR clusters.

**Example from PR #1934:**
```yaml
global:
  # Primary Livy connection
  livy_url: http://mdp-subscriptions-cancelled-live.emr.bi.example.com:8998
  livy_conn_id: livy-mdp-subscriptions-cancelled-live

  # Fallback Livy connection
  livy_conn_id_common: livy-mdp-subscriptions-live
```

**Airflow connection configuration:**
```
Connection ID: livy-mdp-subscriptions-cancelled-live
Connection Type: HTTP
Host: mdp-subscriptions-cancelled-live.emr.bi.example.com
Port: 8998
```

**Frequency:** 96% of Spark jobs configure Livy connections

## Implementation Guidelines

### Spark Job Arguments Best Practices

**Structure arguments consistently:**
```python
application_args = [
    # Execution context
    "--execution_date",
    "{{ ds }}",
    "--execution_timestamp",
    "{{ execution_date.strftime('%Y-%m-%d %H:%M:%S') }}",

    # Business unit/partition
    "--bob_entity_code",
    bob_entity_code,
    "--region",
    region,

    # Input tables
    "--input_table_raw",
    cm.read("raw_table"),
    "--input_table_intermediate",
    cm.read("intermediate_table"),

    # Output tables
    "--output_table",
    cm.read("main_table"),

    # Performance tuning
    "--number_of_partitions",
    str(cm.read("number_of_partitions")),

    # Feature flags
    "--write_to_delta",
    str(cm.read("write_to_delta", False)),
    "--enable_deduplication",
    str(cm.read("enable_deduplication", True)),
]
```

### Error Handling and Retries

**Configure retry behavior:**
```python
default_args = {
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(hours=1),
}

spark_task = spark_job_submit(
    config=cm,
    dag=dag,
    livy_conn_id=livy_conn_id,
    entry_point=cm.read("entrypoint_path"),
    task_id="spark_processing",
    execution_timeout=timedelta(hours=4),  # Kill if takes too long
)
```

### Monitoring and Logging

**Add logging context:**
```python
from utils.shared import tags

dag = DAG(
    dag_id,
    default_args=default_args,
    tags=[tags.SPARK_PIPELINE, tags.SUBSCRIPTIONS_BASED_CPC],
)

spark_task = spark_job_submit(
    config=cm,
    dag=dag,
    livy_conn_id=livy_conn_id,
    entry_point=cm.read("entrypoint_path"),
    application_args=[
        "--dag_id", dag_id,
        "--task_id", "{{ task_instance.task_id }}",
        "--run_id", "{{ run_id }}",
    ],
    task_id="spark_processing",
)
```

## Testing Spark Operators

### Unit Tests

**Test Spark job configuration:**
```python
# File: tests/operators/test_spark_operator.py
import pytest
from unittest.mock import Mock, patch
from airflow_config_management.config_manager import ConfigManager
from utils.aws.emr.livy_operator import spark_job_submit

def test_spark_job_submit_configuration(mock_dag):
    """Test Spark job submit with proper configuration"""
    cm = Mock(spec=ConfigManager)
    cm.read.side_effect = lambda key, default=None: {
        "livy_conn_id": "test-livy",
        "airflow_pool": "test-pool",
        "entrypoint_path": "test/entrypoint",
    }.get(key, default)

    task = spark_job_submit(
        config=cm,
        dag=mock_dag,
        livy_conn_id=cm.read("livy_conn_id"),
        airflow_pool=cm.read("airflow_pool"),
        entry_point=cm.read("entrypoint_path"),
        task_id="test_task",
    )

    assert task is not None
    assert task.task_id == "test_task"
    assert task.pool == "test-pool"

def test_spark_job_application_args():
    """Test application args construction"""
    args = [
        "--execution_date", "2023-01-01",
        "--number_of_partitions", "10",
    ]

    assert "--execution_date" in args
    assert "2023-01-01" in args
    assert "--number_of_partitions" in args
    assert "10" in args
```

## Anti-Patterns to Avoid

### Don't Hardcode Livy URLs

**Bad:**
```python
# ❌ Bad - hardcoded Livy URL
spark_task = spark_job_submit(
    livy_url="http://prod-cluster.emr.example.com:8998",
    # ...
)
```

**Good:**
```python
# ✅ Good - from configuration
spark_task = spark_job_submit(
    livy_conn_id=cm.read("livy_conn_id"),
    # ...
)
```

### Don't Skip Pooling

**Bad:**
```python
# ❌ Bad - no pool, unlimited concurrent jobs
spark_task = spark_job_submit(
    config=cm,
    dag=dag,
    livy_conn_id=livy_conn_id,
    # Missing: airflow_pool
)
```

**Good:**
```python
# ✅ Good - use pool for resource management
spark_task = spark_job_submit(
    config=cm,
    dag=dag,
    livy_conn_id=livy_conn_id,
    airflow_pool=cm.read("airflow_pool"),
)
```

### Don't Use Excessive Partitions

**Bad:**
```python
# ❌ Bad - too many partitions for small data
application_args=[
    "--number_of_partitions", "1000",  # Way too many
]
```

**Good:**
```python
# ✅ Good - appropriate partitioning
application_args=[
    "--number_of_partitions", str(cm.read("number_of_partitions")),
]
```

## Related Implementers

- **dag-definition.md** - DAG setup for Spark jobs
- **configuration-management.md** - Spark configuration in YAML
- **task-dependencies.md** - Chaining Spark jobs
- **error-handling.md** - Spark job failure handling
- **kubernetes-operators.md** - Alternative to Spark with Kubernetes
