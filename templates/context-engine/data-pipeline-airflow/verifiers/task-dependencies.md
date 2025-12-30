---
domain: task-dependencies
description: Verify task ordering, trigger rules, sensor timeouts, cross-DAG dependencies, and proper dependency patterns in Airflow pipelines
---

# Task Dependencies Verification

Verify that Airflow task dependencies are properly configured with correct ordering, trigger rules, sensors, and cross-DAG dependencies.

## Verification Checklist

### 1. Task Dependency Patterns

**Requirement:** Task dependencies must be clearly defined with appropriate operators and patterns for sequential, parallel, and conditional execution.

**Verification Steps:**

✅ **Check basic dependency patterns:**
```python
# ✅ Correct - clear sequential dependencies
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

dag = DAG(
    dag_id='customer_analytics_pipeline',
    start_date=datetime(2024, 1, 1),
    schedule_interval='@daily',
    catchup=False,
)

# Sequential pipeline
extract_customers = PythonOperator(task_id='extract_customers', ...)
validate_customers = PythonOperator(task_id='validate_customers', ...)
transform_customers = PythonOperator(task_id='transform_customers', ...)
load_customers = PythonOperator(task_id='load_customers', ...)

# Chain operator for sequential tasks
extract_customers >> validate_customers >> transform_customers >> load_customers

# Alternative: chain() function
from airflow.models.baseoperator import chain
chain(extract_customers, validate_customers, transform_customers, load_customers)

# ❌ Incorrect - unclear dependencies
task1 = PythonOperator(task_id='task1', ...)
task2 = PythonOperator(task_id='task2', ...)
task3 = PythonOperator(task_id='task3', ...)
# No dependencies defined! Execution order undefined
```

✅ **Check parallel execution patterns:**
```python
# ✅ Correct - parallel task execution
from airflow.operators.python import PythonOperator

start = PythonOperator(task_id='start', ...)

# Parallel extraction
extract_customers = PythonOperator(task_id='extract_customers', ...)
extract_orders = PythonOperator(task_id='extract_orders', ...)
extract_products = PythonOperator(task_id='extract_products', ...)

# Parallel transformation
transform_customers = PythonOperator(task_id='transform_customers', ...)
transform_orders = PythonOperator(task_id='transform_orders', ...)
transform_products = PythonOperator(task_id='transform_products', ...)

end = PythonOperator(task_id='end', ...)

# Fan-out: one task to multiple parallel tasks
start >> [extract_customers, extract_orders, extract_products]

# Parallel processing
extract_customers >> transform_customers
extract_orders >> transform_orders
extract_products >> transform_products

# Fan-in: multiple tasks to one task
[transform_customers, transform_orders, transform_products] >> end

# ❌ Incorrect - unnecessary sequential execution
start >> extract_customers >> extract_orders >> extract_products  # Should be parallel!
transform_customers >> transform_orders >> transform_products  # Should be parallel!
```

✅ **Check complex dependency patterns:**
```python
# ✅ Correct - diamond dependency pattern
from airflow.operators.python import PythonOperator

start = PythonOperator(task_id='start', ...)

# Parallel branches
branch_a = PythonOperator(task_id='branch_a', ...)
branch_b = PythonOperator(task_id='branch_b', ...)

# Independent processing in each branch
process_a1 = PythonOperator(task_id='process_a1', ...)
process_a2 = PythonOperator(task_id='process_a2', ...)
process_b1 = PythonOperator(task_id='process_b1', ...)
process_b2 = PythonOperator(task_id='process_b2', ...)

end = PythonOperator(task_id='end', ...)

# Diamond pattern
start >> [branch_a, branch_b]
branch_a >> process_a1 >> process_a2
branch_b >> process_b1 >> process_b2
[process_a2, process_b2] >> end

# ✅ Correct - using cross_downstream for many-to-many
from airflow.models.baseoperator import cross_downstream

extract_tasks = [extract_customers, extract_orders, extract_products]
validate_tasks = [validate_customers, validate_orders, validate_products]

# Each extract task triggers all validate tasks
cross_downstream(extract_tasks, validate_tasks)

# ✅ Correct - using chain for complex linear flows
from airflow.models.baseoperator import chain

chain(
    start,
    [extract_customers, extract_orders],
    [transform_customers, transform_orders],
    [load_customers, load_orders],
    end
)
# Equivalent to:
# start >> extract_customers >> transform_customers >> load_customers >> end
# start >> extract_orders >> transform_orders >> load_orders >> end

# ❌ Incorrect - circular dependency
task_a >> task_b >> task_c >> task_a  # Circular! Will fail
```

✅ **Check dependency setup pattern:**
```python
# ✅ Correct - dependencies defined at end of DAG file
# File: dags/customer_pipeline.py

dag = DAG(dag_id='customer_pipeline', ...)

# Task definitions
extract = PythonOperator(task_id='extract', ...)
validate = PythonOperator(task_id='validate', ...)
transform = PythonOperator(task_id='transform', ...)
load = PythonOperator(task_id='load', ...)
notify = PythonOperator(task_id='notify', ...)

# Dependencies section (at end of file)
# fmt: off
extract >> validate >> transform >> load >> notify
# fmt: on

# ❌ Incorrect - dependencies scattered throughout file
extract = PythonOperator(task_id='extract', ...)
extract >> validate  # Dependency here

validate = PythonOperator(task_id='validate', ...)

transform = PythonOperator(task_id='transform', ...)
validate >> transform  # Dependency here

# Dependencies split up, hard to visualize
```

**How to Verify:**
```bash
# Visualize DAG structure
airflow dags show <dag_id>

# Generate visual graph
airflow dags show <dag_id> --save graph.png

# Check for circular dependencies
python -c "from dags.customer_pipeline import dag; print('No circular deps')"

# List all task dependencies
airflow tasks list <dag_id> --tree

# Verify specific task dependencies
airflow tasks show <dag_id> <task_id>
```

**Expected Result:**
- Clear sequential chains using >>
- Parallel execution using lists []
- Fan-out/fan-in patterns for parallel processing
- Dependencies defined in dedicated section
- No circular dependencies
- chain() or cross_downstream() for complex patterns

---

### 2. Trigger Rules

**Requirement:** Tasks must have appropriate trigger rules to handle upstream failures, skips, and conditional execution.

**Verification Steps:**

✅ **Check default trigger rule (all_success):**
```python
# ✅ Correct - default all_success trigger rule
from airflow.operators.python import PythonOperator
from airflow.utils.trigger_rule import TriggerRule

extract = PythonOperator(task_id='extract', ...)
transform = PythonOperator(task_id='transform', ...)
load = PythonOperator(task_id='load', ...)

# Default: transform runs only if extract succeeds
extract >> transform >> load

# Explicit (same as default)
transform = PythonOperator(
    task_id='transform',
    trigger_rule=TriggerRule.ALL_SUCCESS,  # Default
    ...
)
```

✅ **Check cleanup with all_done:**
```python
# ✅ Correct - cleanup task always runs
from airflow.utils.trigger_rule import TriggerRule
from airflow.operators.python import PythonOperator

process_data = PythonOperator(task_id='process_data', ...)
validate_output = PythonOperator(task_id='validate_output', ...)
load_warehouse = PythonOperator(task_id='load_warehouse', ...)

cleanup_temp_files = PythonOperator(
    task_id='cleanup_temp_files',
    python_callable=cleanup_func,
    trigger_rule=TriggerRule.ALL_DONE,  # Run regardless of success/failure
    dag=dag,
)

# Cleanup runs whether tasks succeed or fail
[process_data, validate_output, load_warehouse] >> cleanup_temp_files

# ✅ Correct - send notification always
send_status_notification = PythonOperator(
    task_id='send_status_notification',
    python_callable=send_notification,
    trigger_rule=TriggerRule.ALL_DONE,
    dag=dag,
)

[process_data, validate_output] >> send_status_notification

# ❌ Incorrect - cleanup with default trigger rule
cleanup = PythonOperator(
    task_id='cleanup',
    # Default all_success means cleanup won't run if upstream fails!
)
```

✅ **Check failure handling with one_failed:**
```python
# ✅ Correct - alert only on failures
from airflow.utils.trigger_rule import TriggerRule
from airflow.operators.email import EmailOperator

critical_process = PythonOperator(task_id='critical_process', ...)
validate_data = PythonOperator(task_id='validate_data', ...)
load_data = PythonOperator(task_id='load_data', ...)

send_failure_alert = EmailOperator(
    task_id='send_failure_alert',
    to='data-team@company.com',
    subject='Pipeline Failed: {{ dag.dag_id }}',
    html_content='''
    Pipeline failed at {{ ts }}
    Failed tasks: {{ task_instance.task_id }}
    Logs: {{ task_instance.log_url }}
    ''',
    trigger_rule=TriggerRule.ONE_FAILED,  # Run only if something fails
    dag=dag,
)

send_success_notification = EmailOperator(
    task_id='send_success_notification',
    to='data-team@company.com',
    subject='Pipeline Succeeded: {{ dag.dag_id }}',
    trigger_rule=TriggerRule.ALL_SUCCESS,  # Run only if all succeed
    dag=dag,
)

[critical_process, validate_data, load_data] >> send_failure_alert
[critical_process, validate_data, load_data] >> send_success_notification

# ❌ Incorrect - alert with wrong trigger rule
alert = EmailOperator(
    task_id='alert',
    trigger_rule=TriggerRule.ALL_SUCCESS,  # Won't run on failure!
)
```

✅ **Check conditional execution with branching:**
```python
# ✅ Correct - branching with BranchPythonOperator
from airflow.operators.python import BranchPythonOperator
from airflow.utils.trigger_rule import TriggerRule

def decide_branch(**context):
    """Decide which branch to execute"""
    execution_date = context['ds']
    day_of_week = context['execution_date'].weekday()

    if day_of_week == 0:  # Monday
        return 'full_refresh'
    else:
        return 'incremental_update'

branch = BranchPythonOperator(
    task_id='decide_processing_mode',
    python_callable=decide_branch,
    dag=dag,
)

full_refresh = PythonOperator(task_id='full_refresh', ...)
incremental_update = PythonOperator(task_id='incremental_update', ...)

# Tasks after branch must use trigger rule to handle skipped tasks
validate_output = PythonOperator(
    task_id='validate_output',
    trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,  # Run if any branch succeeds
    dag=dag,
)

send_report = PythonOperator(
    task_id='send_report',
    trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
    dag=dag,
)

branch >> [full_refresh, incremental_update]
[full_refresh, incremental_update] >> validate_output >> send_report

# ❌ Incorrect - downstream task without proper trigger rule
validate = PythonOperator(
    task_id='validate',
    # Default all_success won't work with branching!
    # validate will be marked upstream_failed
)
[full_refresh, incremental_update] >> validate
```

✅ **Check none_failed trigger rule:**
```python
# ✅ Correct - continue if no failures (allow skips)
from airflow.utils.trigger_rule import TriggerRule

optional_validation = PythonOperator(
    task_id='optional_validation',
    trigger_rule=TriggerRule.NONE_FAILED,  # Run if no upstream failures (skips OK)
    dag=dag,
)

# ✅ Correct - comprehensive trigger rule example
from airflow.operators.python import PythonOperator, BranchPythonOperator
from airflow.utils.trigger_rule import TriggerRule

start = PythonOperator(task_id='start', ...)

# Branching
branch = BranchPythonOperator(task_id='branch', ...)
option_a = PythonOperator(task_id='option_a', ...)
option_b = PythonOperator(task_id='option_b', ...)

# Join after branch
join = PythonOperator(
    task_id='join',
    trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
    ...
)

# Cleanup always runs
cleanup = PythonOperator(
    task_id='cleanup',
    trigger_rule=TriggerRule.ALL_DONE,
    ...
)

# Alert on failure
alert = PythonOperator(
    task_id='alert',
    trigger_rule=TriggerRule.ONE_FAILED,
    ...
)

start >> branch >> [option_a, option_b] >> join >> cleanup
[start, branch, option_a, option_b, join] >> alert
```

**How to Verify:**
```bash
# Check trigger rules in DAG
grep -r "trigger_rule" dags/*.py

# Test branching behavior
airflow tasks test <dag_id> <task_id> <execution_date>

# Check task state after upstream skip
airflow tasks state <dag_id> <task_id> <execution_date>

# Verify cleanup tasks run on failure
# Trigger failure, check cleanup task runs
```

**Expected Result:**
- Default all_success for normal sequential tasks
- ALL_DONE for cleanup tasks
- ONE_FAILED for failure alerts
- NONE_FAILED_MIN_ONE_SUCCESS after branching
- NONE_FAILED for optional tasks
- Appropriate trigger rules documented

---

### 3. Sensor Usage and Configuration

**Requirement:** Sensors must be properly configured with timeouts, poke intervals, and appropriate modes to avoid blocking worker slots.

**Verification Steps:**

✅ **Check S3 sensor configuration:**
```python
# ✅ Correct - S3 sensor with proper configuration
from airflow.providers.amazon.aws.sensors.s3 import S3KeySensor
from airflow.utils.trigger_rule import TriggerRule

wait_for_input_file = S3KeySensor(
    task_id='wait_for_customer_data',
    bucket_key='s3://data-lake/raw/customers/date={{ ds }}/_SUCCESS',
    aws_conn_id='aws_default',
    timeout=60 * 60,  # 1 hour timeout
    poke_interval=60,  # Check every 60 seconds
    mode='reschedule',  # Free up worker slot while waiting
    soft_fail=False,  # Fail task if timeout
    exponential_backoff=True,  # Exponential backoff
    dag=dag,
)

process_data = PythonOperator(task_id='process_data', ...)

wait_for_input_file >> process_data

# ✅ Correct - multiple file sensor with wildcard
wait_for_files = S3KeySensor(
    task_id='wait_for_all_partitions',
    bucket_key='s3://data-lake/raw/orders/date={{ ds }}/*.parquet',
    wildcard_match=True,
    aws_conn_id='aws_default',
    timeout=60 * 30,  # 30 minutes
    poke_interval=120,  # Check every 2 minutes
    mode='reschedule',
    dag=dag,
)

# ❌ Incorrect - sensor with default poke mode
bad_sensor = S3KeySensor(
    task_id='bad_sensor',
    bucket_key='s3://bucket/file',
    mode='poke',  # Blocks worker slot!
    timeout=60 * 60 * 24,  # 24 hours!
    poke_interval=10,  # Pokes every 10 seconds for 24 hours!
)

# ❌ Incorrect - no timeout
infinite_sensor = S3KeySensor(
    task_id='infinite_wait',
    bucket_key='s3://bucket/file',
    # No timeout! Could wait forever
)
```

✅ **Check external task sensor:**
```python
# ✅ Correct - external task sensor for DAG dependencies
from airflow.sensors.external_task import ExternalTaskSensor
from datetime import timedelta

wait_for_upstream_dag = ExternalTaskSensor(
    task_id='wait_for_customer_processing',
    external_dag_id='daily_customer_extraction',
    external_task_id='load_customers',  # Specific task to wait for
    allowed_states=['success'],
    failed_states=['failed', 'skipped'],
    execution_delta=timedelta(hours=1),  # Upstream runs 1 hour earlier
    timeout=60 * 60,  # 1 hour timeout
    poke_interval=60,  # Check every minute
    mode='reschedule',
    dag=dag,
)

process_customer_analytics = PythonOperator(task_id='process', ...)

wait_for_upstream_dag >> process_customer_analytics

# ✅ Correct - external task sensor with execution_date_fn
def get_upstream_execution_date(dt):
    """Custom logic for upstream execution date"""
    # If this DAG runs at 3 AM, upstream ran at 2 AM
    return dt - timedelta(hours=1)

wait_for_upstream = ExternalTaskSensor(
    task_id='wait_for_upstream',
    external_dag_id='upstream_dag',
    external_task_id='final_task',
    execution_date_fn=get_upstream_execution_date,
    timeout=60 * 60,
    mode='reschedule',
    dag=dag,
)

# ❌ Incorrect - external task sensor without execution alignment
bad_external_sensor = ExternalTaskSensor(
    task_id='bad_external',
    external_dag_id='upstream_dag',
    external_task_id='task',
    # No execution_delta or execution_date_fn!
    # Assumes same execution time, likely wrong
)
```

✅ **Check SQL sensor:**
```python
# ✅ Correct - SQL sensor for database readiness
from airflow.providers.common.sql.sensors.sql import SqlSensor

wait_for_new_records = SqlSensor(
    task_id='wait_for_new_orders',
    conn_id='postgres_orders',
    sql='''
        SELECT COUNT(*)
        FROM orders
        WHERE DATE(created_at) = '{{ ds }}'
    ''',
    success=lambda result: result[0][0] > 0,  # Wait until count > 0
    timeout=60 * 60,  # 1 hour
    poke_interval=120,  # Check every 2 minutes
    mode='reschedule',
    dag=dag,
)

# ✅ Correct - SQL sensor for data quality
wait_for_quality_check = SqlSensor(
    task_id='wait_for_data_quality',
    conn_id='postgres_dwh',
    sql='''
        SELECT
            COUNT(*) as total_count,
            COUNT(CASE WHEN customer_id IS NULL THEN 1 END) as null_count
        FROM customer_summary
        WHERE date = '{{ ds }}'
    ''',
    success=lambda result: result[0][0] > 1000 and result[0][1] == 0,
    timeout=60 * 30,
    mode='reschedule',
    dag=dag,
)

# ❌ Incorrect - SQL sensor without success condition
bad_sql_sensor = SqlSensor(
    task_id='bad_sql',
    conn_id='postgres',
    sql='SELECT 1',
    # No success condition! Always succeeds
)
```

✅ **Check HTTP sensor:**
```python
# ✅ Correct - HTTP sensor for API availability
from airflow.providers.http.sensors.http import HttpSensor

wait_for_api = HttpSensor(
    task_id='wait_for_external_api',
    http_conn_id='external_api',
    endpoint='api/v1/data/status/{{ ds }}',
    request_params={'format': 'json'},
    response_check=lambda response: response.json()['status'] == 'ready',
    timeout=60 * 30,
    poke_interval=60,
    mode='reschedule',
    dag=dag,
)

call_api = PythonOperator(task_id='call_api', ...)

wait_for_api >> call_api

# ❌ Incorrect - HTTP sensor without response check
bad_http_sensor = HttpSensor(
    task_id='bad_http',
    http_conn_id='api',
    endpoint='status',
    # No response_check! Only checks HTTP 200
)
```

✅ **Check sensor timeout handling:**
```python
# ✅ Correct - sensor with soft_fail for non-critical data
from airflow.providers.amazon.aws.sensors.s3 import S3KeySensor

wait_for_optional_file = S3KeySensor(
    task_id='wait_for_optional_enrichment',
    bucket_key='s3://data-lake/enrichment/{{ ds }}/',
    timeout=60 * 10,  # 10 minutes
    poke_interval=60,
    mode='reschedule',
    soft_fail=True,  # Skip this task on timeout, don't fail DAG
    dag=dag,
)

process_with_enrichment = PythonOperator(
    task_id='process',
    trigger_rule=TriggerRule.NONE_FAILED,  # Run even if sensor skipped
    dag=dag,
)

wait_for_optional_file >> process_with_enrichment

# ✅ Correct - multiple sensors with timeout handling
wait_primary = S3KeySensor(
    task_id='wait_primary',
    bucket_key='s3://data/primary/{{ ds }}/',
    timeout=60 * 60,
    mode='reschedule',
    soft_fail=False,  # Critical data, fail on timeout
)

wait_secondary = S3KeySensor(
    task_id='wait_secondary',
    bucket_key='s3://data/secondary/{{ ds }}/',
    timeout=60 * 30,
    mode='reschedule',
    soft_fail=True,  # Optional data, skip on timeout
)

process = PythonOperator(
    task_id='process',
    trigger_rule=TriggerRule.NONE_FAILED,
)

[wait_primary, wait_secondary] >> process
```

**How to Verify:**
```bash
# Check sensor configuration
grep -r "Sensor" dags/*.py
grep -r "mode=" dags/*.py
grep -r "timeout=" dags/*.py

# Test sensor behavior
airflow tasks test <dag_id> <sensor_task_id> <execution_date>

# Check sensor task duration
airflow tasks list <dag_id> | grep -i sensor

# Verify reschedule mode
grep -r 'mode.*reschedule' dags/*.py

# Check for poke mode (anti-pattern)
grep -r 'mode.*poke' dags/*.py
```

**Expected Result:**
- Sensors use mode='reschedule' (not poke)
- Appropriate timeouts (30-60 minutes typical)
- Reasonable poke_interval (60-300 seconds)
- soft_fail=True for optional dependencies
- response_check or success condition for validation
- Exponential backoff for frequent checks

---

### 4. Cross-DAG Dependencies

**Requirement:** Dependencies between DAGs must be properly configured using ExternalTaskSensor or TriggerDagRunOperator with correct execution date alignment.

**Verification Steps:**

✅ **Check ExternalTaskSensor for dependencies:**
```python
# ✅ Correct - ExternalTaskSensor with proper alignment
# DAG 1: Upstream extraction (runs at 2 AM)
extraction_dag = DAG(
    dag_id='daily_customer_extraction',
    schedule_interval='0 2 * * *',  # 2 AM
    start_date=datetime(2024, 1, 1),
    catchup=False,
)

extract_customers = PythonOperator(task_id='extract_customers', dag=extraction_dag)
validate_customers = PythonOperator(task_id='validate_customers', dag=extraction_dag)
load_customers = PythonOperator(task_id='load_customers', dag=extraction_dag)

extract_customers >> validate_customers >> load_customers

# DAG 2: Downstream analytics (runs at 4 AM, waits for extraction)
from airflow.sensors.external_task import ExternalTaskSensor

analytics_dag = DAG(
    dag_id='daily_customer_analytics',
    schedule_interval='0 4 * * *',  # 4 AM (2 hours after extraction)
    start_date=datetime(2024, 1, 1),
    catchup=False,
)

wait_for_extraction = ExternalTaskSensor(
    task_id='wait_for_customer_extraction',
    external_dag_id='daily_customer_extraction',
    external_task_id='load_customers',  # Wait for specific task
    allowed_states=['success'],
    failed_states=['failed', 'skipped'],
    execution_delta=timedelta(hours=2),  # Upstream runs 2 hours earlier
    timeout=60 * 60,  # 1 hour timeout
    poke_interval=60,
    mode='reschedule',
    dag=analytics_dag,
)

process_analytics = PythonOperator(task_id='process_analytics', dag=analytics_dag)

wait_for_extraction >> process_analytics

# ✅ Correct - using execution_date_fn for complex scheduling
def get_last_sunday_execution_date(dt):
    """Get execution date of last Sunday"""
    days_since_sunday = (dt.weekday() + 1) % 7
    return dt - timedelta(days=days_since_sunday)

wait_for_weekly_report = ExternalTaskSensor(
    task_id='wait_for_weekly_report',
    external_dag_id='weekly_summary_report',
    external_task_id='generate_report',
    execution_date_fn=get_last_sunday_execution_date,
    timeout=60 * 60,
    mode='reschedule',
    dag=dag,
)

# ❌ Incorrect - ExternalTaskSensor without execution alignment
bad_sensor = ExternalTaskSensor(
    task_id='bad_external',
    external_dag_id='upstream_dag',
    external_task_id='task',
    # No execution_delta or execution_date_fn!
    # Will look for same execution_date, likely doesn't exist
)
```

✅ **Check TriggerDagRunOperator for triggering:**
```python
# ✅ Correct - TriggerDagRunOperator for on-demand triggering
from airflow.operators.trigger_dagrun import TriggerDagRunOperator

# DAG 1: Main processing pipeline
main_dag = DAG(
    dag_id='daily_order_processing',
    schedule_interval='@daily',
    start_date=datetime(2024, 1, 1),
    catchup=False,
)

process_orders = PythonOperator(task_id='process_orders', dag=main_dag)
validate_output = PythonOperator(task_id='validate_output', dag=main_dag)

# Trigger downstream analytics DAG after validation
trigger_analytics = TriggerDagRunOperator(
    task_id='trigger_customer_analytics',
    trigger_dag_id='customer_analytics_pipeline',
    wait_for_completion=True,  # Wait for triggered DAG to complete
    poke_interval=60,
    allowed_states=['success'],
    failed_states=['failed'],
    execution_date='{{ ds }}',  # Pass same execution date
    conf={
        'source': 'order_processing',
        'triggered_by': '{{ dag.dag_id }}',
    },
    dag=main_dag,
)

process_orders >> validate_output >> trigger_analytics

# DAG 2: Analytics pipeline (triggered by DAG 1)
analytics_dag = DAG(
    dag_id='customer_analytics_pipeline',
    schedule_interval=None,  # Manual/triggered only
    start_date=datetime(2024, 1, 1),
    catchup=False,
)

run_analytics = PythonOperator(
    task_id='run_analytics',
    python_callable=lambda **context: print(f"Triggered by: {context['dag_run'].conf}"),
    dag=analytics_dag,
)

# ✅ Correct - conditional triggering
def should_trigger_downstream(**context):
    """Decide whether to trigger downstream DAG"""
    task_instance = context['task_instance']
    records_processed = task_instance.xcom_pull(task_ids='process_orders')

    return records_processed > 1000  # Only trigger if > 1000 records

trigger_if_needed = TriggerDagRunOperator(
    task_id='trigger_if_threshold_met',
    trigger_dag_id='heavy_processing_dag',
    python_callable=should_trigger_downstream,
    dag=main_dag,
)

# ❌ Incorrect - TriggerDagRunOperator without wait_for_completion
no_wait_trigger = TriggerDagRunOperator(
    task_id='trigger_and_forget',
    trigger_dag_id='downstream_dag',
    wait_for_completion=False,  # Doesn't wait! Downstream failures undetected
)
```

✅ **Check Dataset-based dependencies (Airflow 2.4+):**
```python
# ✅ Correct - Dataset-based scheduling
from airflow.datasets import Dataset

# Define datasets
customer_dataset = Dataset('s3://data-lake/customers/')
order_dataset = Dataset('s3://data-lake/orders/')
analytics_dataset = Dataset('s3://data-lake/analytics/')

# DAG 1: Producer - processes customers and produces dataset
customer_dag = DAG(
    dag_id='customer_processing',
    schedule_interval='@daily',
    start_date=datetime(2024, 1, 1),
    catchup=False,
)

process_customers = PythonOperator(
    task_id='process_customers',
    outlets=[customer_dataset],  # Produces customer dataset
    dag=customer_dag,
)

# DAG 2: Consumer - waits for customer dataset
analytics_dag = DAG(
    dag_id='customer_analytics',
    schedule=[customer_dataset],  # Triggered when customer_dataset updates
    start_date=datetime(2024, 1, 1),
    catchup=False,
)

run_analytics = PythonOperator(
    task_id='run_analytics',
    outlets=[analytics_dataset],  # Produces analytics dataset
    dag=analytics_dag,
)

# DAG 3: Multi-dataset consumer - waits for multiple datasets
combined_dag = DAG(
    dag_id='combined_reporting',
    schedule=[customer_dataset, order_dataset],  # Waits for both
    start_date=datetime(2024, 1, 1),
    catchup=False,
)

generate_report = PythonOperator(
    task_id='generate_report',
    dag=combined_dag,
)

# ✅ Correct - conditional dataset update
from airflow.datasets import Dataset

def process_and_update_dataset(**context):
    """Process data and update dataset"""
    # Process data
    result = process_data()

    # Only update dataset if processing successful
    if result['success']:
        context['task_instance'].outlets = [customer_dataset]

    return result

conditional_update = PythonOperator(
    task_id='conditional_update',
    python_callable=process_and_update_dataset,
    dag=dag,
)
```

✅ **Check DAG dependency documentation:**
```python
# ✅ Correct - documented DAG dependencies
customer_analytics_dag = DAG(
    dag_id='customer_analytics',
    description='''
    Customer analytics pipeline.

    Dependencies:
    - Upstream: daily_customer_extraction (via ExternalTaskSensor)
      - Waits for: load_customers task
      - Execution delta: -2 hours (runs at 4 AM, waits for 2 AM run)
      - Timeout: 1 hour

    - Downstream: customer_reporting (triggered via TriggerDagRunOperator)
      - Triggered after: run_analytics task
      - Waits for completion: Yes

    Dataset dependencies:
    - Consumes: s3://data-lake/customers/
    - Produces: s3://data-lake/analytics/
    ''',
    schedule_interval='0 4 * * *',
    tags=['analytics', 'customer', 'dependent'],
)

# ❌ Incorrect - undocumented dependencies
dag = DAG(
    dag_id='some_pipeline',
    description='Process data',  # No dependency info!
)
```

**How to Verify:**
```bash
# Check ExternalTaskSensor usage
grep -r "ExternalTaskSensor" dags/*.py

# Verify execution_delta alignment
grep -A 5 "ExternalTaskSensor" dags/*.py | grep "execution_delta"

# Check TriggerDagRunOperator
grep -r "TriggerDagRunOperator" dags/*.py

# Verify wait_for_completion
grep -A 3 "TriggerDagRunOperator" dags/*.py | grep "wait_for_completion"

# Check dataset dependencies (Airflow 2.4+)
grep -r "Dataset" dags/*.py
airflow datasets list
airflow datasets list-dag-dependencies

# Visualize DAG dependencies
airflow dags show <dag_id> --save graph.png
```

**Expected Result:**
- ExternalTaskSensor with correct execution_delta
- TriggerDagRunOperator with wait_for_completion=True
- Dataset-based scheduling where appropriate
- Documented dependencies in DAG description
- Appropriate timeouts for cross-DAG dependencies
- Proper error handling for upstream failures

---

### 5. XCom for Task Communication

**Requirement:** XCom must be used appropriately for passing small amounts of data between tasks, with size limits and proper serialization.

**Verification Steps:**

✅ **Check XCom usage:**
```python
# ✅ Correct - XCom for small metadata
from airflow.operators.python import PythonOperator

def extract_metadata(**context):
    """Extract and return metadata"""
    metadata = {
        'record_count': 10000,
        'file_size_mb': 250,
        'processing_time': 120,
        'checksum': 'abc123',
    }

    # Push to XCom (automatically returned)
    return metadata

def process_with_metadata(**context):
    """Use metadata from previous task"""
    task_instance = context['task_instance']

    # Pull from XCom
    metadata = task_instance.xcom_pull(task_ids='extract_metadata')

    print(f"Processing {metadata['record_count']} records")
    print(f"File size: {metadata['file_size_mb']} MB")

    # Process data based on metadata
    process_data(metadata)

extract_task = PythonOperator(
    task_id='extract_metadata',
    python_callable=extract_metadata,
    dag=dag,
)

process_task = PythonOperator(
    task_id='process_with_metadata',
    python_callable=process_with_metadata,
    dag=dag,
)

extract_task >> process_task

# ✅ Correct - explicit XCom push/pull
def extract_stats(**context):
    """Extract statistics"""
    ti = context['task_instance']

    stats = calculate_stats()

    # Explicit push with key
    ti.xcom_push(key='daily_stats', value=stats)
    ti.xcom_push(key='record_count', value=stats['count'])

def generate_report(**context):
    """Generate report using stats"""
    ti = context['task_instance']

    # Pull specific keys
    stats = ti.xcom_pull(task_ids='extract_stats', key='daily_stats')
    count = ti.xcom_pull(task_ids='extract_stats', key='record_count')

    generate_report(stats, count)

# ✅ Correct - XCom with TaskFlow API (Airflow 2.0+)
from airflow.decorators import task

@task
def extract_data():
    """Extract and return data"""
    data = {'count': 10000, 'status': 'success'}
    return data

@task
def process_data(input_data):
    """Process data from previous task"""
    print(f"Processing {input_data['count']} records")
    result = {'processed': input_data['count'], 'status': 'completed'}
    return result

@task
def load_data(processed_data):
    """Load processed data"""
    print(f"Loading {processed_data['processed']} records")

# TaskFlow automatically handles XCom
data = extract_data()
processed = process_data(data)
load_data(processed)

# ❌ Incorrect - XCom for large data
def bad_xcom_usage(**context):
    # Don't use XCom for large data!
    large_dataframe = spark.read.parquet('s3://data/')  # Huge DataFrame!
    return large_dataframe  # Too large for XCom!

# ❌ Incorrect - XCom for binary data
def bad_binary_xcom(**context):
    with open('large_file.bin', 'rb') as f:
        binary_data = f.read()  # Large binary file
    return binary_data  # Should use S3/shared storage instead
```

✅ **Check XCom size limits:**
```python
# ✅ Correct - S3 for large data, XCom for path
from airflow.operators.python import PythonOperator
import json

def process_large_dataset(**context):
    """Process large dataset and save to S3"""
    df = spark.read.parquet(input_path)

    # Process data
    result_df = df.transform(apply_transformations)

    # Save result to S3
    output_path = f's3://bucket/results/{context["ds"]}/'
    result_df.write.parquet(output_path)

    # Return path and metadata via XCom (small)
    return {
        'output_path': output_path,
        'record_count': result_df.count(),
        'partition_count': result_df.rdd.getNumPartitions(),
    }

def load_from_path(**context):
    """Load data from path passed via XCom"""
    ti = context['task_instance']
    result_info = ti.xcom_pull(task_ids='process_large_dataset')

    # Read from S3 path
    df = spark.read.parquet(result_info['output_path'])
    print(f"Loaded {result_info['record_count']} records")

    # Load to warehouse
    load_to_warehouse(df)

process_task = PythonOperator(
    task_id='process_large_dataset',
    python_callable=process_large_dataset,
    dag=dag,
)

load_task = PythonOperator(
    task_id='load_from_path',
    python_callable=load_from_path,
    dag=dag,
)

process_task >> load_task

# ✅ Correct - XCom with size check
def safe_xcom_push(**context):
    """Push to XCom with size check"""
    ti = context['task_instance']

    result = calculate_result()
    result_json = json.dumps(result)

    # Check size before pushing
    size_kb = len(result_json.encode('utf-8')) / 1024

    if size_kb > 100:  # 100 KB limit
        # Too large, save to S3
        s3_path = f's3://xcom-overflow/{context["run_id"]}/result.json'
        save_to_s3(result_json, s3_path)
        ti.xcom_push(key='result', value={'type': 's3', 'path': s3_path})
    else:
        # Small enough for XCom
        ti.xcom_push(key='result', value={'type': 'inline', 'data': result})
```

**How to Verify:**
```bash
# Check XCom usage
grep -r "xcom_pull" dags/*.py
grep -r "xcom_push" dags/*.py
grep -r "return " dags/*.py | grep "def.*context"

# Check for large XCom values
airflow db shell
# SELECT task_id, LENGTH(value) as size_bytes
# FROM xcom
# ORDER BY size_bytes DESC
# LIMIT 10;

# Verify TaskFlow usage
grep -r "@task" dags/*.py

# Check XCom serialization
grep -r "pickle" dags/*.py
```

**Expected Result:**
- XCom for small metadata (<100 KB)
- S3/shared storage for large data
- XCom contains paths, not data
- TaskFlow API for clean XCom handling
- Proper serialization (JSON preferred)
- Size checks before XCom push

---

## Common Issues and Fixes

### Issue 1: Circular dependencies

**Problem:**
```python
task_a >> task_b >> task_c >> task_a  # Circular!
```

**Fix:**
```python
# Remove circular dependency
task_a >> task_b >> task_c
```

### Issue 2: Wrong trigger rule after branching

**Problem:**
```python
branch >> [option_a, option_b]
[option_a, option_b] >> join  # join uses default all_success, will fail!
```

**Fix:**
```python
join = PythonOperator(
    task_id='join',
    trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
)
branch >> [option_a, option_b] >> join
```

### Issue 3: Sensor blocking worker

**Problem:**
```python
sensor = S3KeySensor(
    task_id='wait',
    mode='poke',  # Blocks worker!
    timeout=60 * 60 * 24,  # 24 hours!
)
```

**Fix:**
```python
sensor = S3KeySensor(
    task_id='wait',
    mode='reschedule',  # Frees worker
    timeout=60 * 60,  # 1 hour
    poke_interval=60,
)
```

### Issue 4: Large data in XCom

**Problem:**
```python
def process(**context):
    df = spark.read.parquet('s3://data/')
    return df  # Too large for XCom!
```

**Fix:**
```python
def process(**context):
    df = spark.read.parquet('s3://data/')
    output_path = 's3://output/data/'
    df.write.parquet(output_path)
    return {'path': output_path, 'count': df.count()}  # Small metadata
```

---

## Verification Summary

**Before marking task dependencies complete, verify:**

- [ ] Clear dependency patterns (>>, chain, cross_downstream)
- [ ] Parallel execution where appropriate
- [ ] Fan-out/fan-in patterns used correctly
- [ ] No circular dependencies
- [ ] Dependencies defined in dedicated section
- [ ] Appropriate trigger rules for each task
- [ ] ALL_DONE for cleanup tasks
- [ ] ONE_FAILED for failure alerts
- [ ] NONE_FAILED_MIN_ONE_SUCCESS after branching
- [ ] Sensors use mode='reschedule'
- [ ] Appropriate sensor timeouts (30-60 min)
- [ ] soft_fail for optional dependencies
- [ ] ExternalTaskSensor with correct execution_delta
- [ ] TriggerDagRunOperator with wait_for_completion=True
- [ ] Dataset-based scheduling where appropriate
- [ ] XCom for small metadata only (<100 KB)
- [ ] S3/shared storage for large data
- [ ] TaskFlow API for clean XCom handling
- [ ] Dependencies documented in DAG description

**Related Verifiers:**
- **dag-definition.md** - DAG structure and configuration
- **spark-operators.md** - Spark job dependencies
- **data-quality.md** - Quality check dependencies
