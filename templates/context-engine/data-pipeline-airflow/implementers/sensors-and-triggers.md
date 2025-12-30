---
domain: sensors-and-triggers
description: External task sensors, Glue sensors, and cross-DAG dependency coordination
---

# Sensors and Triggers

Coordinate cross-DAG dependencies and wait for external resources using sensors with proper timeout and polling configuration.

## Core Patterns

### 1. External Task Sensor Async

**Pattern:** Wait for tasks in other DAGs using ExternalTaskSensorAsync for non-blocking execution.

**Example from PR #2330:**
```python
from astronomer.providers.core.sensors.external_task import ExternalTaskSensorAsync

with dag:
    # Wait for upstream DAG with execution time offset
    mac_sensor = ExternalTaskSensorAsync(
        task_id="mac_sensor",
        external_dag_id="eu_cluster_marketing_data_product_plans_main__mac__v4",
        external_task_id="marketing_attribution_conversions",
        execution_timeout=timedelta(hours=2),
        execution_delta=timedelta(hours=2),  # Look back 2 hours
        check_existence=True,
        dag=dag,
    )

    process_data = spark_job_submit(config=cm, dag=dag, task_id="process_data")

    mac_sensor >> process_data
```

**Frequency:** 64% of DAGs use external task sensors

**Why:** Async sensors provide:
- Non-blocking execution
- Cross-DAG coordination
- Execution time offsets
- Existence checking
- Resource efficiency

### 2. Glue Table Update Sensor

**Pattern:** Wait for AWS Glue catalog table updates before processing.

**Example from PR #2115:**
```python
from airflow_custom_operators.glue_last_table_update_sensor_async import GlueTableUpdateSensorAsync

with dag:
    voucher_lookup_sensor = GlueTableUpdateSensorAsync(
        dag=dag,
        task_id="voucher_lookup_sensor",
        database="lookup_tables",
        table="vouchers",
        update_time_threshold="{{ (data_interval_end - macros.timedelta(hours=24)) }}",
        polling_interval=120,  # Check every 2 minutes
        deferral_timeout=timedelta(hours=3),
        poke_interval=60,
    )

    process_data >> voucher_lookup_sensor >> downstream_task
```

**Frequency:** 36% of DAGs use Glue sensors

### 3. Multiple Dependency Sensors

**Pattern:** Wait for multiple upstream DAGs before proceeding.

**Example:**
```python
with dag:
    start = EmptyOperator(task_id="start")

    # Create sensors for each dependency
    subscriptions_sensor = ExternalTaskSensorAsync(
        task_id="subscriptions_sensor",
        external_dag_id="marketing_data_product_subscriptions_main__v2",
        external_task_id="main",
        execution_delta=timedelta(hours=1),
    )

    vouchers_sensor = ExternalTaskSensorAsync(
        task_id="vouchers_sensor",
        external_dag_id="marketing_data_product_vouchers_main__v1",
        external_task_id="main",
        execution_delta=timedelta(hours=2),
    )

    customers_sensor = ExternalTaskSensorAsync(
        task_id="customers_sensor",
        external_dag_id="marketing_data_product_customers_main__v1",
        external_task_id="main",
        execution_delta=timedelta(hours=3),
    )

    # Wait for all sensors before processing
    process_conversions = spark_job_submit(config=cm, dag=dag, task_id="conversions")

    start >> [subscriptions_sensor, vouchers_sensor, customers_sensor] >> process_conversions
```

**Frequency:** 48% of complex DAGs have multiple dependencies

### 4. Regional Sensor Coordination

**Pattern:** Coordinate sensors across regional schedules with different execution deltas.

**Example from PR #2330:**
```python
for group_nm, group_info in cm.read("schedule_groups").items():
    dag_id = f"{dag_name}__{group_nm}"
    dag = DAG(dag_id, default_args=default_args, **dag_config)

    with dag:
        markets = group_info.get("markets")
        dependency_dag = group_info["dependency_dag"]
        execution_delta = group_info["execution_delta"]

        for timing_delta, market_list in markets.items():
            # Create group sensor with regional offset
            group_sensor = ExternalTaskSensorAsync(
                task_id=f"group_{timing_delta}_mac_sensor",
                external_dag_id=dependency_dag,
                external_task_id=f"group_{timing_delta}_marketing_attribution_conversions",
                execution_delta=timedelta(hours=int(execution_delta)),
                check_existence=True,
            )

            # Process markets after sensor completes
            for market in market_list:
                process_task = spark_job_submit(
                    config=cm,
                    dag=dag,
                    application_args=["--market", market],
                    task_id=f"process_{market}",
                )
                group_sensor >> process_task

    globals()[dag_id] = dag
```

**Frequency:** 56% of multi-region DAGs use regional sensor patterns

### 5. Sensor Timeout Configuration

**Pattern:** Configure appropriate timeouts and polling intervals.

**Example:**
```python
# Short timeout for frequently updating tables
fast_sensor = ExternalTaskSensorAsync(
    task_id="fast_sensor",
    external_dag_id="hourly_pipeline",
    external_task_id="complete",
    execution_timeout=timedelta(minutes=30),
    poke_interval=30,  # Check every 30 seconds
    mode="reschedule",  # Free up worker slot
)

# Long timeout for daily pipelines
slow_sensor = ExternalTaskSensorAsync(
    task_id="slow_sensor",
    external_dag_id="daily_pipeline",
    external_task_id="complete",
    execution_timeout=timedelta(hours=8),
    poke_interval=300,  # Check every 5 minutes
    mode="reschedule",
)
```

**Frequency:** 64% of sensors configure timeouts

## Related Implementers

- **task-dependencies.md** - Task coordination patterns
- **dag-definition.md** - DAG scheduling and dependencies
- **error-handling.md** - Sensor failure handling
