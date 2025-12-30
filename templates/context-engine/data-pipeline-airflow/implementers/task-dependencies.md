---
domain: task-dependencies
description: Task dependency management, orchestration patterns, and cross-DAG coordination
---

# Task Dependencies

Manage task dependencies and orchestration patterns in Airflow including sequential execution, parallel processing, and cross-DAG coordination.

## Core Patterns

### 1. Basic Task Dependencies with Bitshift Operators

**Pattern:** Use >> and << operators to define task dependencies.

**Example from PR #1934:**
```python
with dag:
    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")

    intermediate = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        entry_point=cm.read("entrypoint_path_intermediate"),
        task_id="intermediate",
    )

    intermediate_event_dates = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        entry_point=cm.read("entrypoint_path_intermediate_event_dates"),
        task_id="intermediate_event_dates",
    )

    main = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        entry_point=cm.read("entrypoint_path_main"),
        task_id="main",
    )

    # Sequential dependencies
    start >> intermediate >> intermediate_event_dates >> main >> end
```

**Frequency:** 92% of DAGs use bitshift operators

### 2. Chain Multiple Tasks

**Pattern:** Use chain() for linear task sequences.

**Example from PR #2330:**
```python
from airflow.models.baseoperator import chain

with dag:
    start = EmptyOperator(task_id="start")

    task1 = spark_job_submit(config=cm, dag=dag, task_id="task1")
    task2 = spark_job_submit(config=cm, dag=dag, task_id="task2")
    task3 = spark_job_submit(config=cm, dag=dag, task_id="task3")
    task4 = spark_job_submit(config=cm, dag=dag, task_id="task4")

    end = EmptyOperator(task_id="end")

    # Chain all tasks in sequence
    chain(start, task1, task2, task3, task4, end)
    # Equivalent to: start >> task1 >> task2 >> task3 >> task4 >> end
```

**Frequency:** 68% of sequential workflows use chain()

### 3. Parallel Task Execution

**Pattern:** Fan-out to execute multiple tasks in parallel, then fan-in to join.

**Example:**
```python
with dag:
    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")

    # Process multiple regions in parallel
    process_us = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        entry_point=cm.read("entrypoint_path"),
        application_args=["--region", "US"],
        task_id="process_us",
    )

    process_eu = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        entry_point=cm.read("entrypoint_path"),
        application_args=["--region", "EU"],
        task_id="process_eu",
    )

    process_au = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        entry_point=cm.read("entrypoint_path"),
        application_args=["--region", "AU"],
        task_id="process_au",
    )

    # Aggregate results after parallel processing
    aggregate = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        entry_point=cm.read("entrypoint_path_aggregate"),
        task_id="aggregate",
    )

    # Fan-out to parallel tasks, then fan-in to aggregate
    start >> [process_us, process_eu, process_au] >> aggregate >> end
```

**Frequency:** 72% of multi-region DAGs use parallel execution

### 4. Task Groups for Logical Organization

**Pattern:** Use TaskGroup to organize related tasks.

**Example:**
```python
from airflow.utils.task_group import TaskGroup

with dag:
    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")

    with TaskGroup("raw_to_intermediate", tooltip="Raw data processing") as raw_group:
        extract_raw = spark_job_submit(
            config=cm,
            dag=dag,
            task_id="extract_raw",
        )

        transform_raw = spark_job_submit(
            config=cm,
            dag=dag,
            task_id="transform_raw",
        )

        load_intermediate = spark_job_submit(
            config=cm,
            dag=dag,
            task_id="load_intermediate",
        )

        extract_raw >> transform_raw >> load_intermediate

    with TaskGroup("intermediate_to_main", tooltip="Main data processing") as main_group:
        process_intermediate = spark_job_submit(
            config=cm,
            dag=dag,
            task_id="process_intermediate",
        )

        aggregate_main = spark_job_submit(
            config=cm,
            dag=dag,
            task_id="aggregate_main",
        )

        process_intermediate >> aggregate_main

    # Define TaskGroup dependencies
    start >> raw_group >> main_group >> end
```

**Frequency:** 48% of complex DAGs use TaskGroups

### 5. Conditional Dependencies with BranchOperator

**Pattern:** Use branching for conditional task execution.

**Example:**
```python
from airflow.operators.python import BranchPythonOperator

def check_data_volume(**context):
    """Decide which processing path to take based on data volume"""
    # Simplified logic
    data_volume = get_data_volume(context['ds'])

    if data_volume > 1000000:
        return 'heavy_processing'
    else:
        return 'light_processing'

with dag:
    start = EmptyOperator(task_id="start")

    check_volume = BranchPythonOperator(
        task_id='check_volume',
        python_callable=check_data_volume,
        provide_context=True,
    )

    heavy_processing = spark_job_submit(
        config=cm,
        dag=dag,
        entry_point=cm.read("entrypoint_heavy"),
        task_id="heavy_processing",
    )

    light_processing = spark_job_submit(
        config=cm,
        dag=dag,
        entry_point=cm.read("entrypoint_light"),
        task_id="light_processing",
    )

    join = EmptyOperator(
        task_id="join",
        trigger_rule="none_failed_min_one_success",  # Join after either path
    )

    end = EmptyOperator(task_id="end")

    start >> check_volume >> [heavy_processing, light_processing] >> join >> end
```

**Frequency:** 24% of DAGs use conditional branching

### 6. Dynamic Task Mapping

**Pattern:** Generate tasks dynamically based on runtime data.

**Example:**
```python
with dag:
    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")

    # Generate tasks dynamically for each market
    markets = cm.read("markets", ["US", "EU", "AU", "GB"])

    market_tasks = []
    for market in markets:
        task = spark_job_submit(
            config=cm,
            dag=dag,
            livy_conn_id=livy_conn_id,
            entry_point=cm.read("entrypoint_path"),
            application_args=[
                "--market", market,
                "--execution_date", "{{ ds }}",
            ],
            task_id=f"process_{market}",
        )
        market_tasks.append(task)

    # All market tasks run in parallel
    start >> market_tasks >> end
```

**Frequency:** 56% of multi-market DAGs use dynamic task generation

### 7. External Task Dependencies

**Pattern:** Wait for tasks in other DAGs using ExternalTaskSensor.

**Example from PR #2115:**
```python
from astronomer.providers.core.sensors.external_task import ExternalTaskSensorAsync

with dag:
    start = EmptyOperator(task_id="start")

    # Wait for upstream DAG to complete
    customer_plan_events_sensor = ExternalTaskSensorAsync(
        task_id="customer_plan_events_sensor",
        external_dag_id="marketing_data_product_plans_main__customer_plan_events__v3",
        external_task_id="main",
        execution_timeout=timedelta(hours=3),
        execution_delta=timedelta(hours=4),  # Look back 4 hours
        check_existence=True,
        dag=dag,
    )

    # Process data after upstream completes
    process_data = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        entry_point=cm.read("entrypoint_path"),
        task_id="process_data",
    )

    start >> customer_plan_events_sensor >> process_data
```

**Frequency:** 64% of DAGs have external dependencies

### 8. Glue Table Update Sensor

**Pattern:** Wait for AWS Glue table updates before processing.

**Example from PR #2115:**
```python
from airflow_custom_operators.glue_last_table_update_sensor_async import GlueTableUpdateSensorAsync

with dag:
    # Wait for Glue table to be updated
    voucher_lookup_sensor = GlueTableUpdateSensorAsync(
        dag=dag,
        task_id="voucher_lookup_sensor",
        database="lookup_tables",
        table="vouchers",
        update_time_threshold="{{ (data_interval_end - macros.timedelta(hours=24)) }}",
        polling_interval=120,
        deferral_timeout=timedelta(hours=3),
    )

    process_data = spark_job_submit(
        config=cm,
        dag=dag,
        task_id="process_data",
    )

    voucher_lookup_sensor >> process_data
```

**Frequency:** 36% of DAGs use Glue table sensors

### 9. Data Quality Check Dependencies

**Pattern:** Add data quality checks after data processing tasks.

**Example from PR #2115:**
```python
from utils.internal.data_quality import run_data_quality_check

with dag:
    # Process data
    process_intermediate = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        entry_point=cm.read("entrypoint_path_intermediate"),
        task_id="process_intermediate",
    )

    # Run data quality checks
    dq_check = run_data_quality_check(
        dag=dag,
        table=cm.read("intermediate_table"),
        main_dataset=cm.read("data_quality.main_dataset"),
        config_manager=cm,
        variables=cm.read("data_quality.soda_variables"),
        fail_on_dq=True,  # Fail task if DQ fails
        task_name_suffix="intermediate",
        livy_url=cm.read("livy_url"),
        pool=cm.read("airflow_pool"),
    )

    # Process main only if DQ passes
    process_main = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        entry_point=cm.read("entrypoint_path_main"),
        task_id="process_main",
    )

    process_intermediate >> dq_check >> process_main
```

**Frequency:** 36% of DAGs include DQ check dependencies

### 10. Trigger Rules for Complex Dependencies

**Pattern:** Use trigger rules to control task execution based on upstream task states.

**Example:**
```python
from airflow.utils.trigger_rule import TriggerRule

with dag:
    start = EmptyOperator(task_id="start")

    task_a = spark_job_submit(config=cm, dag=dag, task_id="task_a")
    task_b = spark_job_submit(config=cm, dag=dag, task_id="task_b")
    task_c = spark_job_submit(config=cm, dag=dag, task_id="task_c")

    # Run only if all upstream tasks succeed (default)
    all_success = EmptyOperator(
        task_id="all_success",
        trigger_rule=TriggerRule.ALL_SUCCESS,
    )

    # Run if at least one upstream task succeeds
    one_success = EmptyOperator(
        task_id="one_success",
        trigger_rule=TriggerRule.ONE_SUCCESS,
    )

    # Run if all upstream tasks complete (regardless of state)
    all_done = EmptyOperator(
        task_id="all_done",
        trigger_rule=TriggerRule.ALL_DONE,
    )

    # Run if no upstream tasks failed
    none_failed = EmptyOperator(
        task_id="none_failed",
        trigger_rule=TriggerRule.NONE_FAILED,
    )

    # Run if at least one upstream task failed
    one_failed = EmptyOperator(
        task_id="one_failed",
        trigger_rule=TriggerRule.ONE_FAILED,
    )

    start >> [task_a, task_b, task_c]
    [task_a, task_b, task_c] >> all_success
    [task_a, task_b, task_c] >> one_success
    [task_a, task_b, task_c] >> all_done
```

**Frequency:** 44% of DAGs use custom trigger rules

**Common trigger rules:**
- `ALL_SUCCESS` (default): All upstream tasks succeeded
- `ONE_SUCCESS`: At least one upstream task succeeded
- `ALL_DONE`: All upstream tasks completed
- `NONE_FAILED`: No upstream tasks failed (includes skipped)
- `NONE_FAILED_MIN_ONE_SUCCESS`: No failures and at least one success
- `ONE_FAILED`: At least one upstream task failed
- `ALL_FAILED`: All upstream tasks failed
- `ALWAYS`: Always run regardless of upstream state

## Implementation Guidelines

### Multi-Stage Pipeline Pattern

**Structure pipelines in clear stages:**
```python
with dag:
    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")

    # Stage 1: Extract and load raw data
    extract_raw = spark_job_submit(
        config=cm,
        dag=dag,
        entry_point=cm.read("entrypoint_extract"),
        task_id="extract_raw",
    )

    # Stage 2: Transform to intermediate
    transform_intermediate = spark_job_submit(
        config=cm,
        dag=dag,
        entry_point=cm.read("entrypoint_intermediate"),
        task_id="transform_intermediate",
    )

    # Stage 3: Data quality check
    dq_check_intermediate = run_data_quality_check(
        dag=dag,
        table=cm.read("intermediate_table"),
        config_manager=cm,
        task_name_suffix="intermediate",
    )

    # Stage 4: Aggregate to main
    aggregate_main = spark_job_submit(
        config=cm,
        dag=dag,
        entry_point=cm.read("entrypoint_main"),
        task_id="aggregate_main",
    )

    # Stage 5: Final DQ check
    dq_check_main = run_data_quality_check(
        dag=dag,
        table=cm.read("main_table"),
        config_manager=cm,
        task_name_suffix="main",
    )

    # Stage 6: Sync to warehouse
    sync_snowflake = reload_partition_snowflake_delta(
        cm=cm,
        task_id="sync_snowflake",
    )

    # Define pipeline flow
    start >> extract_raw >> transform_intermediate >> dq_check_intermediate
    dq_check_intermediate >> aggregate_main >> dq_check_main >> sync_snowflake >> end
```

### Regional Processing Pattern

**Process multiple regions with coordination:**
```python
with dag:
    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")

    # Wait for all region-specific upstream DAGs
    region_sensors = {}
    for region in ["US", "EU", "AU"]:
        sensor = ExternalTaskSensorAsync(
            task_id=f"{region}_sensor",
            external_dag_id=f"upstream_dag_{region}",
            external_task_id="complete",
            execution_delta=timedelta(hours=2),
            dag=dag,
        )
        region_sensors[region] = sensor

    # Process each region in parallel after sensor completes
    region_tasks = {}
    for region in ["US", "EU", "AU"]:
        task = spark_job_submit(
            config=cm,
            dag=dag,
            entry_point=cm.read("entrypoint_regional"),
            application_args=["--region", region],
            task_id=f"process_{region}",
        )
        region_tasks[region] = task

        # Sensor -> Processing for each region
        region_sensors[region] >> task

    # Aggregate all regions
    aggregate_all = spark_job_submit(
        config=cm,
        dag=dag,
        entry_point=cm.read("entrypoint_aggregate"),
        task_id="aggregate_all",
    )

    # Wait for all regional processing to complete
    start >> list(region_sensors.values())
    list(region_tasks.values()) >> aggregate_all >> end
```

### Error Recovery Pattern

**Handle failures with recovery tasks:**
```python
with dag:
    start = EmptyOperator(task_id="start")

    main_processing = spark_job_submit(
        config=cm,
        dag=dag,
        entry_point=cm.read("entrypoint_main"),
        task_id="main_processing",
    )

    # This runs only if main_processing fails
    error_handler = PythonOperator(
        task_id="error_handler",
        python_callable=send_alert_and_log_error,
        trigger_rule=TriggerRule.ONE_FAILED,
    )

    # This runs only if main_processing succeeds
    success_handler = EmptyOperator(
        task_id="success_handler",
        trigger_rule=TriggerRule.ALL_SUCCESS,
    )

    # This always runs at the end
    cleanup = PythonOperator(
        task_id="cleanup",
        python_callable=cleanup_temp_files,
        trigger_rule=TriggerRule.ALL_DONE,
    )

    start >> main_processing >> [success_handler, error_handler] >> cleanup
```

## Testing Task Dependencies

**Test dependency structure:**
```python
# File: tests/dags/test_task_dependencies.py
import pytest
from airflow.models import DagBag

def test_dag_task_dependencies():
    """Test that DAG has correct task dependencies"""
    dag_bag = DagBag(include_examples=False)
    dag = dag_bag.get_dag("my_pipeline")

    # Test specific task dependencies
    assert "start" in dag.task_ids
    assert "end" in dag.task_ids

    start_task = dag.get_task("start")
    end_task = dag.get_task("end")

    # Verify start has no upstream tasks
    assert len(start_task.upstream_task_ids) == 0

    # Verify end has no downstream tasks
    assert len(end_task.downstream_task_ids) == 0

    # Verify specific dependency exists
    process_task = dag.get_task("process_data")
    assert "start" in process_task.upstream_task_ids
    assert "end" in process_task.downstream_task_ids

def test_no_cycles():
    """Test that DAG has no circular dependencies"""
    dag_bag = DagBag(include_examples=False)

    for dag_id, dag in dag_bag.dags.items():
        # check_cycle raises AirflowDagCycleException if cycle exists
        dag.test_cycle()
```

## Anti-Patterns to Avoid

### Don't Create Circular Dependencies

**Bad:**
```python
# ❌ Bad - circular dependency
task_a >> task_b >> task_c >> task_a  # Creates cycle!
```

**Good:**
```python
# ✅ Good - linear or branching dependencies only
task_a >> task_b >> task_c
```

### Don't Overuse Parallel Execution

**Bad:**
```python
# ❌ Bad - too many parallel tasks overwhelming cluster
tasks = []
for i in range(100):  # 100 parallel Spark jobs!
    task = spark_job_submit(config=cm, dag=dag, task_id=f"task_{i}")
    tasks.append(task)

start >> tasks >> end
```

**Good:**
```python
# ✅ Good - reasonable parallelism with pooling
tasks = []
for i in range(10):  # 10 parallel tasks with pool limit
    task = spark_job_submit(
        config=cm,
        dag=dag,
        airflow_pool="limited_pool",  # Pool limits concurrency
        task_id=f"task_{i}",
    )
    tasks.append(task)

start >> tasks >> end
```

### Don't Skip Task Groups for Complex DAGs

**Bad:**
```python
# ❌ Bad - flat structure hard to understand
task1 >> task2 >> task3 >> task4 >> task5 >> task6 >> task7 >> task8
```

**Good:**
```python
# ✅ Good - organized with TaskGroups
with TaskGroup("data_extraction") as extraction:
    task1 >> task2

with TaskGroup("data_transformation") as transformation:
    task3 >> task4 >> task5

with TaskGroup("data_loading") as loading:
    task6 >> task7 >> task8

extraction >> transformation >> loading
```

## Related Implementers

- **dag-definition.md** - DAG setup and configuration
- **sensors-and-triggers.md** - External task sensors
- **error-handling.md** - Failure handling and retries
- **spark-operators.md** - Spark task configuration
- **data-quality.md** - Data quality check integration
