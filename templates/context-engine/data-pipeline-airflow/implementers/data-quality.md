---
domain: data-quality
description: Data quality checks with Soda and Great Expectations for validation and monitoring
---

# Data Quality

Implement data quality checks using Soda or Great Expectations for validation, monitoring, and anomaly detection.

## Core Patterns

### 1. Soda Data Quality Checks

**Pattern:** Run Soda data quality checks after data processing.

**Example from PR #2115:**
```python
from utils.internal.data_quality import run_data_quality_check

with dag:
    # Process data
    process_intermediate = spark_job_submit(
        config=cm,
        dag=dag,
        entry_point=cm.read("entrypoint_path"),
        task_id="process_intermediate",
    )

    # Run data quality checks
    dq_check = run_data_quality_check(
        dag=dag,
        table=cm.read("intermediate_conversions"),
        main_dataset=cm.read("data_quality.main_dataset.intermediate_conversions"),
        config_manager=cm,
        variables=cm.read("data_quality.soda_variables"),
        fail_on_dq=True,  # Fail task if DQ fails
        task_name_suffix="intermediate",
        livy_url=cm.read("livy_url"),
        pool=cm.read("airflow_pool"),
    )

    process_intermediate >> dq_check
```

**Frequency:** 36% of DAGs include data quality checks

### 2. Soda Configuration

**Pattern:** Define Soda checks in YAML configuration files.

**Example from PR #1940:**
```yaml
# File: dq_config/development/marketing_data_product_plans_main.conversions_v1.yml
checks for ${main_conversions}:
  - row_count > 0:
      identity: check_${main_conversions}_row_count
      name: main_conversions - row_count > 0

  - missing_percent(subscription_id) = 0:
      identity: check_${main_conversions}_subscription_id_missing
      name: main_conversions - missing percent subscription_id = 0

  - missing_percent(customer_id) = 0:
      identity: check_${main_conversions}_customer_id_missing
      name: main_conversions - missing percent customer_id = 0

  - duplicate_count(event_id) = 0:
      identity: check_${main_conversions}_event_id_duplicates
      name: main_conversions - duplicate count event_id = 0

  # Custom SQL check
  - failed rows:
      identity: check_${main_conversions}_customers_missing_activation
      name: main_conversions - customers with missing activation
      fail query: |
        WITH distinct_customer_conversions AS (
          SELECT customer_id, bob_entity_code,
            array_distinct(collect_list(conversion_type)) AS distinct_conversion_types,
            array_contains(array_distinct(collect_list(conversion_type)), 'ACTIVATION') AS contains_activation
          FROM ${main_conversions}
          GROUP BY customer_id, bob_entity_code
        )
        SELECT *
        FROM distinct_customer_conversions
        WHERE NOT contains_activation
```

**Frequency:** 90% of DQ checks use Soda YAML config

### 3. Soda Variables

**Pattern:** Pass variables to Soda checks for dynamic table names.

**Example from PR #2115:**
```yaml
# Configuration
global:
  data_quality:
    soda_variables:
      gross_conversion: marketing_data_product_plans_intermediate.conversions_v1
      conversion_vouchers: marketing_data_product_plans_intermediate.conversions_vouchers_v1
      event_sequence: marketing_data_product_plans_intermediate.event_sequence_v1
      main_conversions: marketing_data_product_plans_main.conversions_v1

    soda_check_files:
      - marketing_data_product_plans_intermediate.conversions_v1.yml
      - marketing_data_product_plans_main.conversions_v1.yml

    fail_on_warning: false
    fail_on_error: true
```

```python
# Usage in DAG
soda_variables = cm.read("data_quality.soda_variables").copy()
soda_variables["bob_entity_code"] = bob_entity_code  # Add runtime variable

dq_check = run_data_quality_check(
    dag=dag,
    table=cm.read("main_conversions"),
    config_manager=cm,
    variables=soda_variables,  # Pass variables
    fail_on_dq=cm.read("data_quality.fail_on_error"),
)
```

**Frequency:** 72% of DQ checks use Soda variables

### 4. Multiple DQ Check Stages

**Pattern:** Run data quality checks at multiple pipeline stages.

**Example:**
```python
with dag:
    # Stage 1: Process raw
    process_raw = spark_job_submit(config=cm, dag=dag, task_id="raw")

    # DQ check after raw processing
    dq_raw = run_data_quality_check(
        dag=dag,
        table="raw_table",
        config_manager=cm,
        fail_on_dq=False,  # Warning only
        task_name_suffix="raw",
    )

    # Stage 2: Process intermediate
    process_intermediate = spark_job_submit(config=cm, dag=dag, task_id="intermediate")

    # DQ check after intermediate processing
    dq_intermediate = run_data_quality_check(
        dag=dag,
        table="intermediate_table",
        config_manager=cm,
        fail_on_dq=True,  # Fail if DQ fails
        task_name_suffix="intermediate",
    )

    # Stage 3: Process main
    process_main = spark_job_submit(config=cm, dag=dag, task_id="main")

    # DQ check after main processing
    dq_main = run_data_quality_check(
        dag=dag,
        table="main_table",
        config_manager=cm,
        fail_on_dq=True,
        task_name_suffix="main",
    )

    process_raw >> dq_raw >> process_intermediate >> dq_intermediate >> process_main >> dq_main
```

**Frequency:** 60% of complex pipelines have multi-stage DQ

### 5. Common Soda Checks

**Pattern:** Use standard Soda checks for common data quality validations.

**Common checks:**
```yaml
checks for ${table}:
  # Row count check
  - row_count > 0

  # Missing value checks
  - missing_percent(column_name) = 0
  - missing_count(column_name) < 10

  # Duplicate checks
  - duplicate_count(id_column) = 0

  # Value checks
  - invalid_count(status) = 0:
      valid values: ['active', 'inactive', 'pending']

  # Range checks
  - min(price) >= 0
  - max(price) <= 10000

  # Freshness check
  - freshness(updated_at) < 24h

  # Schema checks
  - schema:
      fail:
        when required column missing: [id, name, created_at]
        when wrong column type:
          id: integer
          name: varchar
```

**Frequency:** 88% of DQ configs use these standard checks

## Related Implementers

- **task-dependencies.md** - DQ check orchestration
- **data-warehouse-integration.md** - DQ on warehouse tables
- **error-handling.md** - DQ failure handling
