---
domain: dag-definition
description: Verify DAG structure, scheduling configuration, idempotency patterns, retry logic, and proper resource allocation in Airflow DAGs
---

# DAG Definition Verification

Verify that Airflow DAG implementations follow best practices for structure, scheduling, configuration, and idempotency.

## Verification Checklist

### 1. DAG Structure and Organization

**Requirement:** DAGs must be properly structured with clear naming, documentation, and organization.

**Verification Steps:**

✅ **Check DAG naming conventions:**
```python
# ✅ Correct - clear, descriptive DAG names
# File: dags/daily_customer_analytics.py
from airflow import DAG
from datetime import datetime, timedelta

dag = DAG(
    dag_id='daily_customer_analytics',
    description='Daily aggregation of customer metrics and behavior analytics',
    schedule_interval='0 2 * * *',  # 2 AM daily
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['analytics', 'daily', 'customer'],
    default_args={
        'owner': 'data-team',
        'retries': 3,
        'retry_delay': timedelta(minutes=5),
    }
)

# ❌ Incorrect - vague naming, missing metadata
dag = DAG(
    dag_id='dag1',  # Not descriptive!
    schedule_interval='@daily',
    start_date=datetime(2024, 1, 1),
)
```

✅ **Check DAG documentation:**
```python
# ✅ Correct - comprehensive DAG documentation
dag = DAG(
    dag_id='hourly_order_processing',
    description='''
    Hourly order processing pipeline:
    1. Extract new orders from PostgreSQL
    2. Validate order data quality
    3. Transform and enrich with customer data
    4. Load to data warehouse (Snowflake)
    5. Trigger downstream analytics refresh

    Dependencies: orders_db, customer_api, snowflake_warehouse
    SLA: Must complete within 30 minutes
    On-call: data-platform-team
    ''',
    schedule_interval='0 * * * *',
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['orders', 'hourly', 'etl', 'critical'],
    doc_md=__doc__,
)

# ❌ Incorrect - minimal or no documentation
dag = DAG(
    dag_id='order_pipeline',
    description='Process orders',  # Too vague!
    schedule_interval='@hourly',
)
```

✅ **Check DAG organization:**
```python
# ✅ Correct - organized structure with constants
# File: dags/config/constants.py
DEFAULT_ARGS = {
    'owner': 'data-team',
    'depends_on_past': False,
    'email_on_failure': True,
    'email_on_retry': False,
    'email': ['data-alerts@company.com'],
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'execution_timeout': timedelta(hours=2),
}

SPARK_DEFAULTS = {
    'spark.executor.instances': '10',
    'spark.executor.memory': '8g',
    'spark.executor.cores': '4',
    'spark.driver.memory': '4g',
}

# File: dags/daily_customer_analytics.py
from dags.config.constants import DEFAULT_ARGS, SPARK_DEFAULTS

dag = DAG(
    dag_id='daily_customer_analytics',
    default_args=DEFAULT_ARGS,
    schedule_interval='0 2 * * *',
    catchup=False,
)

# ❌ Incorrect - hardcoded values throughout
dag = DAG(
    dag_id='customer_analytics',
    default_args={
        'owner': 'john',  # Hardcoded owner
        'retries': 2,     # Inconsistent with other DAGs
    }
)
```

✅ **Check file organization:**
```bash
# ✅ Correct structure
dags/
├── config/
│   ├── __init__.py
│   ├── constants.py
│   └── connections.py
├── utils/
│   ├── __init__.py
│   ├── spark_utils.py
│   └── validation.py
├── sql/
│   ├── customer_metrics.sql
│   └── order_aggregations.sql
├── daily_customer_analytics.py
├── hourly_order_processing.py
└── weekly_revenue_report.py

# ❌ Incorrect - flat structure, no organization
dags/
├── dag1.py
├── dag2.py
├── some_query.sql
└── utils.py
```

**How to Verify:**
```bash
# Check DAG file structure
ls -R dags/

# Verify DAG naming conventions
grep -r "dag_id=" dags/*.py

# Check for DAG documentation
grep -r "description=" dags/*.py
grep -r "doc_md=" dags/*.py

# Verify tags usage
grep -r "tags=" dags/*.py

# List all DAG IDs
airflow dags list

# Check DAG structure
airflow dags show <dag_id>
```

**Expected Result:**
- Clear, descriptive DAG names (snake_case)
- Comprehensive description and documentation
- Proper tags for categorization
- Organized file structure with config/utils separation
- Consistent default_args across DAGs

---

### 2. Scheduling Configuration

**Requirement:** DAGs must have proper scheduling configuration with appropriate intervals, start dates, and catchup behavior.

**Verification Steps:**

✅ **Check schedule_interval configuration:**
```python
# ✅ Correct - explicit cron schedule
dag = DAG(
    dag_id='daily_customer_analytics',
    schedule_interval='0 2 * * *',  # Explicit: 2 AM daily
    start_date=datetime(2024, 1, 1),
    catchup=False,
)

# ✅ Correct - using timedelta for regular intervals
dag = DAG(
    dag_id='hourly_metrics',
    schedule_interval=timedelta(hours=1),  # Every hour
    start_date=datetime(2024, 1, 1),
    catchup=False,
)

# ✅ Correct - manual trigger only
dag = DAG(
    dag_id='manual_data_backfill',
    schedule_interval=None,  # Manual trigger only
    start_date=datetime(2024, 1, 1),
)

# ❌ Incorrect - vague preset without comment
dag = DAG(
    dag_id='some_pipeline',
    schedule_interval='@daily',  # When during the day?
)

# ❌ Incorrect - no schedule_interval specified
dag = DAG(
    dag_id='missing_schedule',
    start_date=datetime(2024, 1, 1),
)
```

✅ **Check start_date and end_date:**
```python
# ✅ Correct - explicit start date with timezone
from airflow.utils.dates import days_ago
from pendulum import timezone

dag = DAG(
    dag_id='daily_customer_analytics',
    schedule_interval='0 2 * * *',
    start_date=datetime(2024, 1, 1, tzinfo=timezone('UTC')),
    end_date=None,  # Runs indefinitely
    catchup=False,
)

# ✅ Correct - using days_ago for recent start
dag = DAG(
    dag_id='new_pipeline',
    schedule_interval='@hourly',
    start_date=days_ago(1),  # Started yesterday
    catchup=False,
)

# ❌ Incorrect - dynamic start_date
dag = DAG(
    dag_id='bad_start',
    start_date=datetime.now(),  # Changes every time DAG is parsed!
)

# ❌ Incorrect - start_date in future
dag = DAG(
    dag_id='future_start',
    start_date=datetime(2025, 12, 31),  # Too far in future
)
```

✅ **Check catchup configuration:**
```python
# ✅ Correct - catchup disabled for daily pipeline
dag = DAG(
    dag_id='daily_customer_analytics',
    schedule_interval='0 2 * * *',
    start_date=datetime(2024, 1, 1),
    catchup=False,  # Don't backfill historical runs
    max_active_runs=1,  # Only one run at a time
)

# ✅ Correct - catchup enabled for backfill pipeline
dag = DAG(
    dag_id='historical_data_backfill',
    schedule_interval='@daily',
    start_date=datetime(2023, 1, 1),
    catchup=True,  # Backfill all dates since start_date
    max_active_runs=5,  # Allow parallel backfill runs
)

# ❌ Incorrect - catchup enabled without max_active_runs
dag = DAG(
    dag_id='risky_catchup',
    schedule_interval='@hourly',
    start_date=datetime(2020, 1, 1),  # 4 years ago!
    catchup=True,  # Will create thousands of DAG runs!
)
```

✅ **Check execution timing configuration:**
```python
# ✅ Correct - proper execution window configuration
dag = DAG(
    dag_id='daily_customer_analytics',
    schedule_interval='0 2 * * *',
    start_date=datetime(2024, 1, 1),
    catchup=False,
    default_args={
        'execution_timeout': timedelta(hours=2),  # Max 2 hours
        'sla': timedelta(minutes=90),  # Should complete in 90 min
        'dagrun_timeout': timedelta(hours=3),  # DAG run timeout
    }
)

# ✅ Correct - dataset-based scheduling (Airflow 2.4+)
from airflow.datasets import Dataset

customer_dataset = Dataset('s3://bucket/customer_data/')

dag = DAG(
    dag_id='customer_downstream',
    schedule=[customer_dataset],  # Triggered by dataset update
    start_date=datetime(2024, 1, 1),
    catchup=False,
)

# ❌ Incorrect - no timeout configuration
dag = DAG(
    dag_id='no_timeout',
    schedule_interval='@daily',
    # No execution_timeout, could run forever!
)
```

**How to Verify:**
```bash
# Check DAG scheduling
airflow dags list-runs --dag-id <dag_id>

# Verify next run times
airflow dags next-execution <dag_id>

# Check for catchup runs
airflow dags backfill --start-date 2024-01-01 --end-date 2024-01-31 <dag_id> --dry-run

# Validate cron expressions
python -c "from croniter import croniter; print(croniter.is_valid('0 2 * * *'))"

# Check for DAGs with problematic schedules
grep -r "catchup=True" dags/*.py
grep -r "start_date=datetime.now()" dags/*.py
```

**Expected Result:**
- Explicit schedule_interval with comments
- Static start_date (not dynamic)
- Appropriate catchup configuration
- Proper max_active_runs setting
- Execution timeouts configured
- Timezone-aware datetime objects

---

### 3. Idempotency and Retry Logic

**Requirement:** DAG tasks must be idempotent and have proper retry configuration to handle failures gracefully.

**Verification Steps:**

✅ **Check task idempotency:**
```python
# ✅ Correct - idempotent Delta Lake merge
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator

merge_customer_data = SparkSubmitOperator(
    task_id='merge_customer_data',
    application='jobs/merge_customer_data.py',
    conf={
        'spark.sql.sources.partitionOverwriteMode': 'dynamic',
    },
    application_args=[
        '--date', '{{ ds }}',
        '--mode', 'merge',  # Merge instead of append
        '--dedupe-key', 'customer_id',
        '--output', 's3://bucket/customers/date={{ ds }}/',
    ],
    dag=dag,
)

# Spark job (jobs/merge_customer_data.py)
"""
# Idempotent merge operation
df = spark.read.parquet(input_path)

# Merge using Delta Lake (idempotent)
df.write \
  .format("delta") \
  .mode("overwrite") \
  .option("replaceWhere", f"date = '{date}'") \
  .save(output_path)
"""

# ✅ Correct - idempotent SQL with upsert
execute_sql = PostgresOperator(
    task_id='upsert_customer_summary',
    postgres_conn_id='postgres_default',
    sql='''
        INSERT INTO customer_summary (customer_id, total_orders, last_order_date, updated_at)
        SELECT
            customer_id,
            COUNT(*) as total_orders,
            MAX(order_date) as last_order_date,
            CURRENT_TIMESTAMP as updated_at
        FROM orders
        WHERE DATE(order_date) = '{{ ds }}'
        GROUP BY customer_id
        ON CONFLICT (customer_id)
        DO UPDATE SET
            total_orders = EXCLUDED.total_orders,
            last_order_date = EXCLUDED.last_order_date,
            updated_at = EXCLUDED.updated_at;
    ''',
    dag=dag,
)

# ❌ Incorrect - non-idempotent append
append_data = SparkSubmitOperator(
    task_id='append_data',
    application_args=[
        '--mode', 'append',  # Re-running will duplicate data!
        '--output', 's3://bucket/output/',
    ],
)

# ❌ Incorrect - non-idempotent INSERT
execute_sql = PostgresOperator(
    task_id='insert_records',
    sql='''
        INSERT INTO summary (date, count)
        VALUES ('{{ ds }}', 100);
    ''',  # Re-running will create duplicates!
)
```

✅ **Check retry configuration:**
```python
# ✅ Correct - comprehensive retry configuration
from airflow.operators.python import PythonOperator

extract_data = PythonOperator(
    task_id='extract_customer_data',
    python_callable=extract_customer_data_func,
    retries=3,
    retry_delay=timedelta(minutes=5),
    retry_exponential_backoff=True,
    max_retry_delay=timedelta(minutes=30),
    execution_timeout=timedelta(minutes=30),
    dag=dag,
)

# ✅ Correct - different retry strategies by task type
# Short-running API call - quick retries
call_api = PythonOperator(
    task_id='call_external_api',
    python_callable=call_api_func,
    retries=5,
    retry_delay=timedelta(seconds=30),
    retry_exponential_backoff=True,
)

# Long-running Spark job - longer retry delays
process_data = SparkSubmitOperator(
    task_id='process_large_dataset',
    application='jobs/process.py',
    retries=2,
    retry_delay=timedelta(minutes=15),
    execution_timeout=timedelta(hours=2),
)

# ❌ Incorrect - no retry configuration
risky_task = PythonOperator(
    task_id='risky_operation',
    python_callable=risky_func,
    # No retries! One failure = DAG failure
)

# ❌ Incorrect - too many retries
infinite_retry = PythonOperator(
    task_id='keeps_trying',
    python_callable=failing_func,
    retries=100,  # Too many!
    retry_delay=timedelta(seconds=1),  # Too aggressive!
)
```

✅ **Check task execution date handling:**
```python
# ✅ Correct - using execution date for idempotency
from airflow.operators.python import PythonOperator

def process_daily_data(**context):
    execution_date = context['ds']  # YYYY-MM-DD format

    # Read data for specific date
    input_path = f"s3://bucket/raw/date={execution_date}/"
    output_path = f"s3://bucket/processed/date={execution_date}/"

    # Process and write to date-partitioned output
    df = spark.read.parquet(input_path)
    df.write.mode('overwrite').parquet(output_path)

    # Idempotent: re-running overwrites same partition

process_task = PythonOperator(
    task_id='process_daily_data',
    python_callable=process_daily_data,
    provide_context=True,
    dag=dag,
)

# ✅ Correct - using templated parameters
process_spark = SparkSubmitOperator(
    task_id='process_orders',
    application='jobs/process_orders.py',
    application_args=[
        '--date', '{{ ds }}',
        '--input', 's3://bucket/orders/date={{ ds }}/',
        '--output', 's3://bucket/processed/date={{ ds }}/',
    ],
)

# ❌ Incorrect - using current date instead of execution date
def process_wrong(**context):
    current_date = datetime.now().strftime('%Y-%m-%d')  # Wrong!
    # Re-running historical dates will process wrong data
    input_path = f"s3://bucket/raw/date={current_date}/"

# ❌ Incorrect - no date partitioning
def process_no_partition(**context):
    # Always reads/writes to same path
    df = spark.read.parquet("s3://bucket/data/")
    df.write.mode('append').parquet("s3://bucket/output/")  # Not idempotent!
```

✅ **Check failure handling:**
```python
# ✅ Correct - on_failure_callback for alerts
from airflow.operators.email import EmailOperator

def task_failure_alert(context):
    """Send custom alert on task failure"""
    task_instance = context['task_instance']
    dag_id = context['dag'].dag_id
    execution_date = context['execution_date']

    send_slack_alert(
        f"❌ Task failed: {dag_id}.{task_instance.task_id}\n"
        f"Execution date: {execution_date}\n"
        f"Log: {task_instance.log_url}"
    )

critical_task = SparkSubmitOperator(
    task_id='critical_processing',
    application='jobs/critical.py',
    on_failure_callback=task_failure_alert,
    retries=3,
    dag=dag,
)

# ✅ Correct - trigger_rule for handling upstream failures
from airflow.utils.trigger_rule import TriggerRule

cleanup_task = PythonOperator(
    task_id='cleanup_temp_files',
    python_callable=cleanup_func,
    trigger_rule=TriggerRule.ALL_DONE,  # Run even if upstream fails
    dag=dag,
)

send_failure_alert = EmailOperator(
    task_id='send_failure_notification',
    to='data-team@company.com',
    subject='Pipeline Failed: {{ dag.dag_id }}',
    html_content='Pipeline failed at {{ ds }}',
    trigger_rule=TriggerRule.ONE_FAILED,  # Only run if something failed
    dag=dag,
)

# ❌ Incorrect - no failure handling
task = SparkSubmitOperator(
    task_id='important_task',
    application='jobs/important.py',
    # No on_failure_callback, no retries, silent failures
)
```

**How to Verify:**
```bash
# Test DAG idempotency by re-running
airflow dags test <dag_id> <execution_date>
airflow dags test <dag_id> <execution_date>  # Run again, should produce same result

# Check task retry configuration
airflow tasks list <dag_id>
airflow tasks state <dag_id> <task_id> <execution_date>

# Verify task execution logs for retry behavior
airflow tasks logs <dag_id> <task_id> <execution_date>

# Check for non-idempotent patterns
grep -r "mode.*append" dags/*.py
grep -r "INSERT INTO.*VALUES" dags/sql/*.sql
grep -r "datetime.now()" dags/*.py

# Test failure handling
airflow tasks test <dag_id> <task_id> <execution_date>
```

**Expected Result:**
- Tasks use merge/upsert instead of append
- Proper retry configuration (3-5 retries typical)
- Exponential backoff enabled
- Execution date used for partitioning
- Failure callbacks configured
- Appropriate trigger rules for cleanup tasks

---

### 4. Resource Allocation and Performance

**Requirement:** DAGs must have appropriate resource allocation, pool configuration, and concurrency limits.

**Verification Steps:**

✅ **Check pool configuration:**
```python
# ✅ Correct - using pools for resource management
from airflow.models import Pool

# Define pools in Airflow UI or via code:
# Pool: spark_jobs, Slots: 5 (max 5 concurrent Spark jobs)
# Pool: api_calls, Slots: 10 (max 10 concurrent API calls)
# Pool: database_writes, Slots: 3 (max 3 concurrent DB writes)

# Use pool in tasks
heavy_spark_job = SparkSubmitOperator(
    task_id='process_large_dataset',
    application='jobs/process.py',
    pool='spark_jobs',  # Use spark_jobs pool
    priority_weight=10,  # Higher priority
    dag=dag,
)

api_task = PythonOperator(
    task_id='call_external_api',
    python_callable=api_func,
    pool='api_calls',  # Use api_calls pool
    priority_weight=5,
    dag=dag,
)

# ✅ Correct - pool slots for task weight
large_spark_job = SparkSubmitOperator(
    task_id='huge_processing',
    application='jobs/huge.py',
    pool='spark_jobs',
    pool_slots=3,  # Uses 3 slots instead of 1
    dag=dag,
)

# ❌ Incorrect - no pool configuration
many_tasks = [
    SparkSubmitOperator(
        task_id=f'task_{i}',
        application='jobs/process.py',
        # No pool! All tasks can run simultaneously
    )
    for i in range(100)
]
```

✅ **Check concurrency limits:**
```python
# ✅ Correct - proper concurrency configuration
dag = DAG(
    dag_id='daily_customer_analytics',
    schedule_interval='0 2 * * *',
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,  # Only one DAG run at a time
    max_active_tasks=10,  # Max 10 tasks running concurrently
    default_args={
        'pool': 'default_pool',
        'priority_weight': 5,
    }
)

# ✅ Correct - task-level concurrency
from airflow.operators.python import PythonOperator
from airflow.models.baseoperator import BaseOperator

process_partition = PythonOperator.partial(
    task_id='process_partition',
    python_callable=process_func,
    max_active_tis_per_dag=5,  # Max 5 instances across all DAG runs
).expand(partition_id=list(range(100)))

# ❌ Incorrect - no concurrency limits
dag = DAG(
    dag_id='unlimited_dag',
    schedule_interval='@hourly',
    catchup=True,
    # No max_active_runs! Could spawn hundreds of runs
    # No max_active_tasks! Could overwhelm cluster
)
```

✅ **Check task dependencies for parallelization:**
```python
# ✅ Correct - parallel task execution
from airflow.operators.python import PythonOperator

extract_customers = PythonOperator(task_id='extract_customers', ...)
extract_orders = PythonOperator(task_id='extract_orders', ...)
extract_products = PythonOperator(task_id='extract_products', ...)

transform_customers = PythonOperator(task_id='transform_customers', ...)
transform_orders = PythonOperator(task_id='transform_orders', ...)
transform_products = PythonOperator(task_id='transform_products', ...)

load_warehouse = PythonOperator(task_id='load_warehouse', ...)

# Parallel extraction
[extract_customers, extract_orders, extract_products]

# Parallel transformation
extract_customers >> transform_customers
extract_orders >> transform_orders
extract_products >> transform_products

# Sequential load (all transforms must complete)
[transform_customers, transform_orders, transform_products] >> load_warehouse

# ❌ Incorrect - unnecessary sequential execution
extract_customers >> extract_orders >> extract_products  # Should be parallel!
transform_customers >> transform_orders >> transform_products  # Should be parallel!
```

✅ **Check Spark resource configuration:**
```python
# ✅ Correct - appropriate Spark resources
small_spark_job = SparkSubmitOperator(
    task_id='aggregate_daily_metrics',
    application='jobs/daily_aggregation.py',
    conf={
        'spark.executor.instances': '5',
        'spark.executor.memory': '4g',
        'spark.executor.cores': '2',
        'spark.driver.memory': '2g',
        'spark.sql.shuffle.partitions': '200',
    },
    dag=dag,
)

large_spark_job = SparkSubmitOperator(
    task_id='process_full_history',
    application='jobs/full_processing.py',
    conf={
        'spark.executor.instances': '20',
        'spark.executor.memory': '16g',
        'spark.executor.cores': '4',
        'spark.driver.memory': '8g',
        'spark.sql.shuffle.partitions': '1000',
        'spark.dynamicAllocation.enabled': 'true',
        'spark.dynamicAllocation.minExecutors': '10',
        'spark.dynamicAllocation.maxExecutors': '50',
    },
    dag=dag,
)

# ❌ Incorrect - over-provisioned small job
tiny_job = SparkSubmitOperator(
    task_id='count_records',
    application='jobs/count.py',
    conf={
        'spark.executor.instances': '50',  # Way too many!
        'spark.executor.memory': '32g',    # Way too much!
    },
)

# ❌ Incorrect - under-provisioned large job
huge_job = SparkSubmitOperator(
    task_id='process_petabytes',
    application='jobs/huge.py',
    conf={
        'spark.executor.instances': '2',  # Not enough!
        'spark.executor.memory': '1g',    # Not enough!
    },
)
```

**How to Verify:**
```bash
# Check pool configuration
airflow pools list

# Verify pool usage
airflow pools get <pool_name>

# Check DAG concurrency settings
airflow dags list --output json | jq '.[] | {dag_id, max_active_runs, max_active_tasks}'

# Monitor resource usage
airflow dags list-runs --dag-id <dag_id> --state running

# Check task slot usage
airflow tasks list <dag_id> | wc -l

# Verify Spark resource allocation
grep -r "spark.executor" dags/*.py

# Check for resource bottlenecks
airflow dags list-runs --dag-id <dag_id> --state queued
```

**Expected Result:**
- Pools configured for different resource types
- Appropriate max_active_runs (typically 1-3)
- max_active_tasks set to prevent overload
- Parallel tasks where possible
- Spark resources sized appropriately
- Priority weights set for critical tasks

---

### 5. Configuration and Connections

**Requirement:** DAGs must use Airflow connections and variables for external configuration, not hardcoded values.

**Verification Steps:**

✅ **Check connection usage:**
```python
# ✅ Correct - using Airflow connections
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.providers.amazon.aws.transfers.s3_to_redshift import S3ToRedshiftOperator

# PostgreSQL connection defined in Airflow UI: postgres_dwh
extract_data = PostgresOperator(
    task_id='extract_customer_data',
    postgres_conn_id='postgres_dwh',  # Connection from Airflow
    sql='sql/extract_customers.sql',
    dag=dag,
)

# S3 and Redshift connections from Airflow
load_to_warehouse = S3ToRedshiftOperator(
    task_id='load_to_redshift',
    s3_bucket='company-data-lake',
    s3_key='processed/customers/{{ ds }}/',
    schema='public',
    table='customers',
    copy_options=['CSV', 'IGNOREHEADER 1'],
    aws_conn_id='aws_default',  # AWS connection
    redshift_conn_id='redshift_dwh',  # Redshift connection
    dag=dag,
)

# ❌ Incorrect - hardcoded credentials
extract_data = PythonOperator(
    task_id='extract_data',
    python_callable=lambda: psycopg2.connect(
        host='prod-db.company.com',  # Hardcoded!
        user='admin',                 # Hardcoded!
        password='secret123',         # Hardcoded!
        database='warehouse'
    ),
)
```

✅ **Check variable usage:**
```python
# ✅ Correct - using Airflow variables
from airflow.models import Variable

# Variables defined in Airflow UI or CLI:
# s3_data_bucket: company-data-lake
# spark_cluster_id: j-ABC123DEF456
# notification_email: data-team@company.com

dag = DAG(
    dag_id='configurable_pipeline',
    default_args={
        'email': [Variable.get('notification_email')],
    }
)

process_data = SparkSubmitOperator(
    task_id='process_data',
    application='jobs/process.py',
    application_args=[
        '--input', f"s3://{Variable.get('s3_data_bucket')}/raw/",
        '--output', f"s3://{Variable.get('s3_data_bucket')}/processed/",
    ],
    dag=dag,
)

# ✅ Correct - variable with default value
max_retries = Variable.get('max_task_retries', default_var=3)

# ✅ Correct - JSON variable for complex config
spark_config = Variable.get('spark_default_config', deserialize_json=True)
# Returns: {"executor.memory": "8g", "executor.cores": "4"}

process_spark = SparkSubmitOperator(
    task_id='process',
    application='jobs/process.py',
    conf=spark_config,
)

# ❌ Incorrect - hardcoded values
process_data = SparkSubmitOperator(
    task_id='process_data',
    application_args=[
        '--input', 's3://hardcoded-bucket/raw/',  # Hardcoded!
        '--output', 's3://hardcoded-bucket/processed/',
    ],
)
```

✅ **Check environment-specific configuration:**
```python
# ✅ Correct - environment-aware configuration
from airflow.models import Variable

ENV = Variable.get('environment', default_var='dev')

# Environment-specific configuration
CONFIG = {
    'dev': {
        's3_bucket': 'dev-data-lake',
        'spark_cluster': 'small',
        'notification_email': 'dev-team@company.com',
    },
    'staging': {
        's3_bucket': 'staging-data-lake',
        'spark_cluster': 'medium',
        'notification_email': 'staging-alerts@company.com',
    },
    'prod': {
        's3_bucket': 'prod-data-lake',
        'spark_cluster': 'large',
        'notification_email': 'data-team@company.com',
    }
}

env_config = CONFIG[ENV]

dag = DAG(
    dag_id=f'{ENV}_customer_analytics',
    default_args={
        'email': [env_config['notification_email']],
    }
)

# ✅ Correct - secrets backend for sensitive data
from airflow.providers.amazon.aws.hooks.secrets_manager import SecretsManagerHook

def get_api_key():
    hook = SecretsManagerHook(aws_conn_id='aws_default')
    return hook.get_secret('external_api_key')

call_api = PythonOperator(
    task_id='call_external_api',
    python_callable=call_api_func,
    op_kwargs={'api_key': get_api_key()},
)

# ❌ Incorrect - mixing environments
dag = DAG(
    dag_id='mixed_env_pipeline',  # No environment prefix
    default_args={
        'email': ['prod-team@company.com'],  # Hardcoded prod email in all envs!
    }
)
```

**How to Verify:**
```bash
# List all connections
airflow connections list

# Check specific connection
airflow connections get postgres_dwh

# List all variables
airflow variables list

# Get specific variable
airflow variables get s3_data_bucket

# Check for hardcoded credentials
grep -r "password=" dags/*.py
grep -r "host=" dags/*.py
grep -r "jdbc:" dags/*.py

# Check for hardcoded S3 buckets
grep -r "s3://" dags/*.py

# Verify variable usage
grep -r "Variable.get" dags/*.py
```

**Expected Result:**
- All external systems accessed via Airflow connections
- Configuration values stored as Airflow variables
- No hardcoded credentials or endpoints
- Environment-specific configuration properly separated
- Sensitive values in secrets backend

---

## Testing Verification

### DAG Validation Tests

```python
# Test DAG loading and structure
def test_dag_loads():
    """Test that DAG loads without errors"""
    from dags.daily_customer_analytics import dag

    assert dag is not None
    assert dag.dag_id == 'daily_customer_analytics'
    assert len(dag.tasks) > 0

def test_dag_schedule():
    """Test DAG scheduling configuration"""
    from dags.daily_customer_analytics import dag

    assert dag.schedule_interval == '0 2 * * *'
    assert dag.catchup is False
    assert dag.max_active_runs == 1

def test_task_dependencies():
    """Test task dependency structure"""
    from dags.daily_customer_analytics import dag

    extract = dag.get_task('extract_data')
    transform = dag.get_task('transform_data')
    load = dag.get_task('load_data')

    assert transform in extract.downstream_list
    assert load in transform.downstream_list

def test_task_retry_config():
    """Test task retry configuration"""
    from dags.daily_customer_analytics import dag

    for task in dag.tasks:
        assert task.retries >= 2
        assert task.retry_delay >= timedelta(minutes=1)
        assert task.execution_timeout is not None
```

### Command-line Validation

```bash
# Validate all DAGs
airflow dags list

# Check for DAG import errors
airflow dags list-import-errors

# Validate specific DAG
python dags/daily_customer_analytics.py

# Test DAG execution (dry run)
airflow dags test daily_customer_analytics 2024-01-01

# Validate task
airflow tasks test daily_customer_analytics extract_data 2024-01-01

# Check DAG structure
airflow dags show daily_customer_analytics
```

---

## Common Issues and Fixes

### Issue 1: Dynamic start_date

**Problem:**
```python
dag = DAG(
    dag_id='bad_dag',
    start_date=datetime.now(),  # Changes every parse!
)
```

**Fix:**
```python
dag = DAG(
    dag_id='good_dag',
    start_date=datetime(2024, 1, 1),  # Static date
)
```

### Issue 2: Non-idempotent operations

**Problem:**
```python
# Appending creates duplicates on retry
df.write.mode('append').parquet(output_path)
```

**Fix:**
```python
# Overwrite partition is idempotent
df.write.mode('overwrite').partitionBy('date').parquet(output_path)

# Or use Delta Lake merge
df.write.format('delta').mode('overwrite') \
  .option('replaceWhere', f"date = '{execution_date}'") \
  .save(output_path)
```

### Issue 3: Missing retry configuration

**Problem:**
```python
task = SparkSubmitOperator(
    task_id='critical_task',
    application='job.py',
    # No retries!
)
```

**Fix:**
```python
task = SparkSubmitOperator(
    task_id='critical_task',
    application='job.py',
    retries=3,
    retry_delay=timedelta(minutes=5),
    retry_exponential_backoff=True,
    execution_timeout=timedelta(hours=2),
)
```

### Issue 4: Catchup without limits

**Problem:**
```python
dag = DAG(
    dag_id='backfill_trap',
    start_date=datetime(2020, 1, 1),  # 4 years ago!
    catchup=True,  # Will create 1460+ DAG runs!
)
```

**Fix:**
```python
dag = DAG(
    dag_id='controlled_backfill',
    start_date=datetime(2024, 1, 1),
    catchup=False,  # Or set reasonable start_date
    max_active_runs=3,  # Limit concurrent runs
)
```

---

## Verification Summary

**Before marking DAG implementation as complete, verify:**

- [ ] DAG ID follows naming conventions (snake_case, descriptive)
- [ ] Comprehensive description and tags
- [ ] Explicit schedule_interval with comments
- [ ] Static start_date (not dynamic)
- [ ] Appropriate catchup configuration
- [ ] max_active_runs set appropriately
- [ ] Execution and SLA timeouts configured
- [ ] All tasks are idempotent (merge/upsert, not append)
- [ ] Retry configuration on all tasks (3-5 retries)
- [ ] Exponential backoff enabled
- [ ] Execution date used for partitioning
- [ ] Failure callbacks configured
- [ ] Pools configured for resource management
- [ ] Appropriate concurrency limits
- [ ] Spark resources sized correctly
- [ ] Tasks parallelized where possible
- [ ] Connections used for external systems
- [ ] Variables used for configuration
- [ ] No hardcoded credentials or endpoints
- [ ] Environment-specific configuration separated
- [ ] DAG loads without errors
- [ ] DAG validation tests pass

**Related Verifiers:**
- **spark-operators.md** - Spark job configuration
- **task-dependencies.md** - Task dependency patterns
- **data-quality.md** - Data validation and quality checks
