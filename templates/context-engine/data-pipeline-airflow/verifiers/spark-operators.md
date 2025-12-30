---
domain: spark-operators
description: Verify Spark job configurations, resource limits, Delta Lake usage, error handling, and optimization patterns in Airflow Spark operators
---

# Spark Operators Verification

Verify that Spark jobs in Airflow are properly configured with appropriate resources, error handling, and optimization patterns.

## Verification Checklist

### 1. SparkSubmitOperator Configuration

**Requirement:** SparkSubmitOperator must be properly configured with application path, arguments, and Spark configuration.

**Verification Steps:**

✅ **Check basic SparkSubmitOperator setup:**
```python
# ✅ Correct - comprehensive SparkSubmitOperator configuration
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from datetime import datetime, timedelta

process_customer_data = SparkSubmitOperator(
    task_id='process_customer_data',
    application='s3://company-spark-jobs/process_customer_data.py',
    name='process_customer_data_{{ ds_nodash }}',
    conf={
        'spark.executor.instances': '10',
        'spark.executor.memory': '8g',
        'spark.executor.cores': '4',
        'spark.driver.memory': '4g',
        'spark.sql.shuffle.partitions': '500',
    },
    application_args=[
        '--date', '{{ ds }}',
        '--input-path', 's3://data-lake/raw/customers/date={{ ds }}/',
        '--output-path', 's3://data-lake/processed/customers/date={{ ds }}/',
        '--environment', '{{ var.value.environment }}',
    ],
    verbose=True,
    driver_class_path='s3://company-jars/postgresql-42.6.0.jar',
    jars='s3://company-jars/delta-core_2.12-2.4.0.jar',
    py_files='s3://company-spark-jobs/utils.zip',
    env_vars={
        'SPARK_HOME': '/usr/lib/spark',
        'PYTHONPATH': '/usr/lib/spark/python',
    },
    retries=3,
    retry_delay=timedelta(minutes=5),
    retry_exponential_backoff=True,
    execution_timeout=timedelta(hours=2),
    dag=dag,
)

# ❌ Incorrect - minimal configuration
process_data = SparkSubmitOperator(
    task_id='process_data',
    application='job.py',  # No S3 path!
    # No conf, no args, no resources configured!
)
```

✅ **Check Spark configuration settings:**
```python
# ✅ Correct - optimized Spark configuration
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator

# Small job - fewer resources
aggregate_daily = SparkSubmitOperator(
    task_id='aggregate_daily_metrics',
    application='s3://jobs/aggregate_daily.py',
    conf={
        # Executor configuration
        'spark.executor.instances': '5',
        'spark.executor.memory': '4g',
        'spark.executor.cores': '2',
        'spark.driver.memory': '2g',

        # Shuffle configuration
        'spark.sql.shuffle.partitions': '200',
        'spark.shuffle.compress': 'true',
        'spark.shuffle.spill.compress': 'true',

        # Memory management
        'spark.memory.fraction': '0.8',
        'spark.memory.storageFraction': '0.3',

        # Performance tuning
        'spark.sql.adaptive.enabled': 'true',
        'spark.sql.adaptive.coalescePartitions.enabled': 'true',
        'spark.sql.autoBroadcastJoinThreshold': '50MB',

        # S3 optimization
        'spark.hadoop.fs.s3a.connection.maximum': '100',
        'spark.hadoop.fs.s3a.fast.upload': 'true',
        'spark.hadoop.fs.s3a.multipart.size': '104857600',  # 100MB
    },
    dag=dag,
)

# Large job - more resources and dynamic allocation
process_full_dataset = SparkSubmitOperator(
    task_id='process_full_dataset',
    application='s3://jobs/process_full.py',
    conf={
        # Dynamic allocation
        'spark.dynamicAllocation.enabled': 'true',
        'spark.dynamicAllocation.minExecutors': '10',
        'spark.dynamicAllocation.maxExecutors': '100',
        'spark.dynamicAllocation.initialExecutors': '20',

        # Executor configuration
        'spark.executor.memory': '16g',
        'spark.executor.cores': '4',
        'spark.driver.memory': '8g',

        # Shuffle configuration
        'spark.sql.shuffle.partitions': '2000',

        # Performance
        'spark.sql.adaptive.enabled': 'true',
        'spark.sql.adaptive.skewJoin.enabled': 'true',
    },
    dag=dag,
)

# ❌ Incorrect - insufficient or excessive configuration
bad_config = SparkSubmitOperator(
    task_id='bad_config',
    application='job.py',
    conf={
        'spark.executor.memory': '1g',  # Too small for big data!
        'spark.sql.shuffle.partitions': '10000',  # Too many partitions!
    },
)
```

✅ **Check application arguments:**
```python
# ✅ Correct - using templated arguments
process_orders = SparkSubmitOperator(
    task_id='process_orders',
    application='s3://jobs/process_orders.py',
    application_args=[
        # Date parameters using Airflow templates
        '--execution-date', '{{ ds }}',
        '--execution-datetime', '{{ ts }}',
        '--year', '{{ execution_date.strftime("%Y") }}',
        '--month', '{{ execution_date.strftime("%m") }}',

        # Input/output paths
        '--input-path', 's3://data-lake/raw/orders/date={{ ds }}/',
        '--output-path', 's3://data-lake/processed/orders/date={{ ds }}/',
        '--checkpoint-path', 's3://checkpoints/orders/{{ run_id }}/',

        # Configuration from Airflow variables
        '--environment', '{{ var.value.environment }}',
        '--s3-bucket', '{{ var.value.s3_data_bucket }}',
        '--max-records', '{{ var.value.max_records_per_batch }}',

        # Processing options
        '--mode', 'merge',
        '--dedupe-key', 'order_id',
        '--partition-by', 'date',
    ],
    dag=dag,
)

# ✅ Correct - conditional arguments using task parameters
from airflow.models.param import Param

dag = DAG(
    dag_id='configurable_processing',
    params={
        'full_refresh': Param(False, type='boolean'),
        'batch_size': Param(10000, type='integer'),
    }
)

process_data = SparkSubmitOperator(
    task_id='process_data',
    application='s3://jobs/process.py',
    application_args=[
        '--date', '{{ ds }}',
        '--full-refresh', '{{ params.full_refresh }}',
        '--batch-size', '{{ params.batch_size }}',
    ],
    dag=dag,
)

# ❌ Incorrect - hardcoded values, no templates
bad_args = SparkSubmitOperator(
    task_id='bad_args',
    application='job.py',
    application_args=[
        '--date', '2024-01-01',  # Hardcoded date!
        '--input', 's3://bucket/data/',  # No date partition!
    ],
)
```

**How to Verify:**
```bash
# Check SparkSubmitOperator configuration
grep -r "SparkSubmitOperator" dags/*.py

# Verify Spark conf settings
grep -A 20 "conf={" dags/*.py

# Check application arguments
grep -A 10 "application_args=" dags/*.py

# Test Spark job submission
airflow tasks test <dag_id> <task_id> <execution_date>

# Check Spark UI for job configuration
# http://spark-master:8080
```

**Expected Result:**
- SparkSubmitOperator with comprehensive conf settings
- Appropriate executor resources (memory, cores, instances)
- Templated application arguments using {{ ds }}, {{ var.value.* }}
- S3 paths include date partitions
- Dynamic allocation for large jobs
- Shuffle partitions sized appropriately

---

### 2. Delta Lake Integration

**Requirement:** Spark jobs should use Delta Lake for ACID transactions, time travel, and efficient updates.

**Verification Steps:**

✅ **Check Delta Lake configuration:**
```python
# ✅ Correct - Delta Lake configuration
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator

process_with_delta = SparkSubmitOperator(
    task_id='process_customer_data',
    application='s3://jobs/process_customers.py',
    conf={
        # Delta Lake configuration
        'spark.sql.extensions': 'io.delta.sql.DeltaSparkSessionExtension',
        'spark.sql.catalog.spark_catalog': 'org.apache.spark.sql.delta.catalog.DeltaCatalog',

        # Delta optimization
        'spark.databricks.delta.optimizeWrite.enabled': 'true',
        'spark.databricks.delta.autoCompact.enabled': 'true',

        # Executor config
        'spark.executor.instances': '10',
        'spark.executor.memory': '8g',
        'spark.executor.cores': '4',
    },
    jars='s3://jars/delta-core_2.12-2.4.0.jar,s3://jars/delta-storage-2.4.0.jar',
    application_args=[
        '--date', '{{ ds }}',
        '--input', 's3://raw/customers/date={{ ds }}/',
        '--output', 's3://processed/customers_delta/',
        '--format', 'delta',
    ],
    dag=dag,
)

# Spark job implementation
"""
# In process_customers.py
from delta.tables import DeltaTable
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("process_customers") \
    .getOrCreate()

# Read input data
df = spark.read.parquet(input_path)

# Delta Lake merge (idempotent)
if DeltaTable.isDeltaTable(spark, output_path):
    delta_table = DeltaTable.forPath(spark, output_path)

    # Merge with deduplication
    delta_table.alias("target") \
        .merge(
            df.alias("source"),
            "target.customer_id = source.customer_id AND target.date = source.date"
        ) \
        .whenMatchedUpdateAll() \
        .whenNotMatchedInsertAll() \
        .execute()
else:
    # Initial write
    df.write.format("delta") \
        .partitionBy("date") \
        .mode("overwrite") \
        .save(output_path)
"""

# ❌ Incorrect - no Delta Lake configuration
no_delta = SparkSubmitOperator(
    task_id='no_delta',
    application='job.py',
    # No Delta jars, no Delta conf!
    # Using append mode, not idempotent!
)
```

✅ **Check Delta Lake operations:**
```python
# ✅ Correct - idempotent Delta merge operation
merge_orders = SparkSubmitOperator(
    task_id='merge_orders',
    application='s3://jobs/merge_orders.py',
    jars='s3://jars/delta-core_2.12-2.4.0.jar',
    application_args=[
        '--date', '{{ ds }}',
        '--input', 's3://raw/orders/date={{ ds }}/',
        '--output', 's3://processed/orders_delta/',
        '--merge-key', 'order_id',
        '--partition-key', 'date',
    ],
    dag=dag,
)

# Spark job: merge_orders.py
"""
from delta.tables import DeltaTable

# Merge with condition
delta_table.alias("target").merge(
    source_df.alias("source"),
    "target.order_id = source.order_id"
).whenMatchedUpdate(
    condition="source.updated_at > target.updated_at",
    set={
        "status": "source.status",
        "total_amount": "source.total_amount",
        "updated_at": "source.updated_at"
    }
).whenNotMatchedInsert(
    values={
        "order_id": "source.order_id",
        "customer_id": "source.customer_id",
        "status": "source.status",
        "total_amount": "source.total_amount",
        "created_at": "source.created_at",
        "updated_at": "source.updated_at",
        "date": "source.date"
    }
).execute()
"""

# ✅ Correct - partition overwrite for idempotency
overwrite_partition = SparkSubmitOperator(
    task_id='overwrite_daily_partition',
    application='s3://jobs/overwrite_partition.py',
    jars='s3://jars/delta-core_2.12-2.4.0.jar',
    application_args=[
        '--date', '{{ ds }}',
        '--output', 's3://processed/metrics_delta/',
    ],
    dag=dag,
)

# Spark job: overwrite_partition.py
"""
# Overwrite specific partition (idempotent)
df.write.format("delta") \
    .mode("overwrite") \
    .option("replaceWhere", f"date = '{execution_date}'") \
    .save(output_path)
"""

# ❌ Incorrect - non-idempotent append
bad_append = SparkSubmitOperator(
    task_id='append_data',
    application='s3://jobs/append.py',  # Uses append mode!
    # Re-running will create duplicates
)
```

✅ **Check Delta Lake optimization:**
```python
# ✅ Correct - Delta Lake optimization and vacuum
optimize_table = SparkSubmitOperator(
    task_id='optimize_customer_table',
    application='s3://jobs/optimize_table.py',
    jars='s3://jars/delta-core_2.12-2.4.0.jar',
    application_args=[
        '--table-path', 's3://processed/customers_delta/',
        '--zorder-columns', 'customer_id,date',
    ],
    dag=dag,
)

# Spark job: optimize_table.py
"""
from delta.tables import DeltaTable

delta_table = DeltaTable.forPath(spark, table_path)

# Optimize with Z-ordering
delta_table.optimize().executeZOrderBy(*zorder_columns)

# Vacuum old files (7 days retention)
delta_table.vacuum(retentionHours=168)
"""

# ✅ Correct - scheduled optimization DAG
from airflow import DAG

optimize_dag = DAG(
    dag_id='weekly_delta_optimization',
    schedule_interval='0 3 * * 0',  # Sunday 3 AM
    catchup=False,
)

tables_to_optimize = [
    ('customers_delta', ['customer_id', 'date']),
    ('orders_delta', ['order_id', 'customer_id']),
    ('products_delta', ['product_id']),
]

for table_name, zorder_cols in tables_to_optimize:
    SparkSubmitOperator(
        task_id=f'optimize_{table_name}',
        application='s3://jobs/optimize_table.py',
        jars='s3://jars/delta-core_2.12-2.4.0.jar',
        application_args=[
            '--table-path', f's3://processed/{table_name}/',
            '--zorder-columns', ','.join(zorder_cols),
        ],
        dag=optimize_dag,
    )

# ❌ Incorrect - no optimization
# Delta tables grow with small files, queries become slow
```

**How to Verify:**
```bash
# Check Delta Lake jars
grep -r "delta-core" dags/*.py
grep -r "DeltaSparkSessionExtension" dags/*.py

# Verify Delta merge operations
grep -r "merge" dags/jobs/*.py

# Check for append mode (anti-pattern)
grep -r "mode.*append" dags/jobs/*.py

# Test Delta merge idempotency
airflow tasks test <dag_id> <task_id> <execution_date>
airflow tasks test <dag_id> <task_id> <execution_date>  # Run again

# Check Delta table files
aws s3 ls s3://processed/customers_delta/_delta_log/
```

**Expected Result:**
- Delta Lake extensions configured
- Delta jars included in SparkSubmitOperator
- Merge operations for updates (not append)
- Partition overwrite with replaceWhere
- Regular optimization and vacuum jobs
- Z-ordering on query columns

---

### 3. Error Handling and Data Validation

**Requirement:** Spark jobs must have comprehensive error handling and data validation to catch issues early.

**Verification Steps:**

✅ **Check data validation:**
```python
# ✅ Correct - comprehensive data validation
validate_input = SparkSubmitOperator(
    task_id='validate_customer_data',
    application='s3://jobs/validate_customers.py',
    application_args=[
        '--date', '{{ ds }}',
        '--input-path', 's3://raw/customers/date={{ ds }}/',
        '--validation-rules', 's3://config/customer_validation_rules.json',
    ],
    dag=dag,
)

# Spark job: validate_customers.py
"""
from pyspark.sql import functions as F
from pyspark.sql.types import *

# Read data
df = spark.read.parquet(input_path)

# Validation checks
validation_results = {
    'record_count': df.count(),
    'null_customer_ids': df.filter(F.col('customer_id').isNull()).count(),
    'invalid_emails': df.filter(~F.col('email').rlike(r'^[\\w\\.-]+@[\\w\\.-]+\\.\\w+$')).count(),
    'negative_amounts': df.filter(F.col('total_spent') < 0).count(),
    'future_dates': df.filter(F.col('registration_date') > F.current_date()).count(),
}

# Fail if validation errors found
errors = {k: v for k, v in validation_results.items() if v > 0 and k != 'record_count'}
if errors:
    raise ValueError(f"Data validation failed: {errors}")

# Write validation report
validation_df = spark.createDataFrame([validation_results])
validation_df.write.mode('overwrite').json(f's3://validation-reports/customers/date={execution_date}/')
"""

# ✅ Correct - schema validation
validate_schema = SparkSubmitOperator(
    task_id='validate_order_schema',
    application='s3://jobs/validate_schema.py',
    application_args=[
        '--date', '{{ ds }}',
        '--input-path', 's3://raw/orders/date={{ ds }}/',
        '--expected-schema', 's3://schemas/orders_schema.json',
    ],
    dag=dag,
)

# Spark job: validate_schema.py
"""
import json

# Expected schema
with open('orders_schema.json') as f:
    expected_schema = json.load(f)

# Read data
df = spark.read.parquet(input_path)

# Compare schemas
actual_schema = {field.name: str(field.dataType) for field in df.schema.fields}
expected = {field['name']: field['type'] for field in expected_schema['fields']}

# Check for missing or wrong type columns
missing_cols = set(expected.keys()) - set(actual_schema.keys())
wrong_types = {k: (expected[k], actual_schema[k])
               for k in expected.keys() & actual_schema.keys()
               if expected[k] != actual_schema[k]}

if missing_cols or wrong_types:
    raise ValueError(f"Schema mismatch - Missing: {missing_cols}, Wrong types: {wrong_types}")
"""

# ❌ Incorrect - no validation
no_validation = SparkSubmitOperator(
    task_id='process_data',
    application='s3://jobs/process.py',
    # No validation! Bad data will corrupt output
)
```

✅ **Check error handling:**
```python
# ✅ Correct - comprehensive error handling
process_with_errors = SparkSubmitOperator(
    task_id='process_orders',
    application='s3://jobs/process_orders.py',
    application_args=[
        '--date', '{{ ds }}',
        '--input-path', 's3://raw/orders/date={{ ds }}/',
        '--output-path', 's3://processed/orders/date={{ ds }}/',
        '--dead-letter-path', 's3://errors/orders/date={{ ds }}/',
    ],
    retries=3,
    retry_delay=timedelta(minutes=5),
    retry_exponential_backoff=True,
    dag=dag,
)

# Spark job: process_orders.py
"""
from pyspark.sql import functions as F

try:
    # Read input data
    df = spark.read.parquet(input_path)

    # Separate valid and invalid records
    valid_df = df.filter(
        F.col('order_id').isNotNull() &
        F.col('customer_id').isNotNull() &
        F.col('total_amount') > 0 &
        F.col('order_date').isNotNull()
    )

    invalid_df = df.subtract(valid_df)

    # Process valid records
    processed_df = valid_df.transform(apply_business_logic)

    # Write outputs
    processed_df.write.mode('overwrite').parquet(output_path)

    # Write invalid records to dead letter queue
    if invalid_df.count() > 0:
        invalid_df.withColumn('error_reason', F.lit('Failed validation')) \
                  .withColumn('processing_date', F.current_timestamp()) \
                  .write.mode('append').parquet(dead_letter_path)

        print(f"Warning: {invalid_df.count()} invalid records written to {dead_letter_path}")

except Exception as e:
    # Log error details
    print(f"Error processing orders for date {execution_date}: {str(e)}")

    # Write error metadata
    error_df = spark.createDataFrame([{
        'execution_date': execution_date,
        'error_type': type(e).__name__,
        'error_message': str(e),
        'timestamp': datetime.now().isoformat()
    }])
    error_df.write.mode('append').json('s3://errors/processing_errors/')

    # Re-raise to fail task
    raise
"""

# ❌ Incorrect - no error handling
no_error_handling = SparkSubmitOperator(
    task_id='risky_process',
    application='s3://jobs/risky.py',
    retries=0,  # No retries!
    # No dead letter queue, errors disappear
)
```

✅ **Check data quality checks:**
```python
# ✅ Correct - data quality checks with Soda
from airflow.operators.bash import BashOperator

quality_check = BashOperator(
    task_id='run_soda_checks',
    bash_command='''
        soda scan \
            -d orders_db \
            -c /opt/airflow/soda/configuration.yml \
            /opt/airflow/soda/checks/orders_{{ ds }}.yml
    ''',
    dag=dag,
)

# Soda checks file: orders_{{ ds }}.yml
"""
checks for orders:
  - row_count > 0
  - duplicate_count(order_id) = 0
  - missing_count(customer_id) = 0
  - missing_count(order_date) = 0
  - invalid_count(email) = 0:
      valid regex: '^[\\w\\.-]+@[\\w\\.-]+\\.\\w+$'
  - avg(total_amount) between 10 and 10000
  - failed rows:
      fail condition: total_amount < 0 OR total_amount IS NULL
"""

# ✅ Correct - custom PySpark quality checks
run_quality_checks = SparkSubmitOperator(
    task_id='quality_checks',
    application='s3://jobs/quality_checks.py',
    application_args=[
        '--date', '{{ ds }}',
        '--table-path', 's3://processed/orders/date={{ ds }}/',
        '--checks-config', 's3://config/quality_checks.json',
    ],
    dag=dag,
)

# Spark job: quality_checks.py
"""
checks_config = {
    'row_count_min': 1000,
    'null_percentage_max': 0.01,
    'duplicate_percentage_max': 0.001,
    'amount_range': (0, 100000),
}

df = spark.read.parquet(table_path)

# Run checks
checks_passed = True

# Row count check
row_count = df.count()
if row_count < checks_config['row_count_min']:
    print(f"FAIL: Row count {row_count} below minimum {checks_config['row_count_min']}")
    checks_passed = False

# Null check
null_counts = {col: df.filter(F.col(col).isNull()).count() for col in df.columns}
null_pct = {col: count / row_count for col, count in null_counts.items()}
if any(pct > checks_config['null_percentage_max'] for pct in null_pct.values()):
    print(f"FAIL: High null percentage: {null_pct}")
    checks_passed = False

# Duplicate check
duplicate_count = df.groupBy('order_id').count().filter('count > 1').count()
duplicate_pct = duplicate_count / row_count
if duplicate_pct > checks_config['duplicate_percentage_max']:
    print(f"FAIL: High duplicate percentage: {duplicate_pct}")
    checks_passed = False

if not checks_passed:
    raise ValueError("Quality checks failed")
"""

# ❌ Incorrect - no quality checks
process_data = SparkSubmitOperator(
    task_id='process_data',
    application='job.py',
    # No validation! Bad data flows downstream
)

# Task dependencies
validate_input >> process_with_errors >> run_quality_checks >> load_warehouse
```

**How to Verify:**
```bash
# Check for validation tasks
grep -r "validate" dags/*.py

# Verify error handling
grep -r "try:" dags/jobs/*.py
grep -r "except" dags/jobs/*.py

# Check for dead letter queue
grep -r "dead-letter" dags/*.py
grep -r "error" dags/*.py

# Verify quality checks
grep -r "soda scan" dags/*.py
find dags/soda -name "*.yml"

# Test validation logic
airflow tasks test <dag_id> validate_input <execution_date>

# Check error outputs
aws s3 ls s3://errors/orders/
```

**Expected Result:**
- Input data validation before processing
- Schema validation against expected schema
- Comprehensive error handling with try/except
- Dead letter queue for invalid records
- Data quality checks (Soda or custom)
- Validation reports written to S3
- Failed records logged with error reasons

---

### 4. Performance Optimization

**Requirement:** Spark jobs must be optimized for performance with appropriate partitioning, caching, and broadcast joins.

**Verification Steps:**

✅ **Check partitioning strategy:**
```python
# ✅ Correct - optimized partitioning
optimize_partitions = SparkSubmitOperator(
    task_id='process_orders',
    application='s3://jobs/process_orders.py',
    conf={
        # Shuffle partitions based on data size
        'spark.sql.shuffle.partitions': '500',

        # Adaptive query execution
        'spark.sql.adaptive.enabled': 'true',
        'spark.sql.adaptive.coalescePartitions.enabled': 'true',
        'spark.sql.adaptive.coalescePartitions.minPartitionNum': '1',

        # Partition discovery
        'spark.sql.sources.partitionOverwriteMode': 'dynamic',
    },
    application_args=[
        '--date', '{{ ds }}',
        '--input', 's3://raw/orders/',
        '--output', 's3://processed/orders/',
        '--partition-by', 'date,region',
        '--repartition-count', '200',
    ],
    dag=dag,
)

# Spark job: process_orders.py
"""
# Read with partition pruning
df = spark.read.parquet(input_path).filter(f"date = '{execution_date}'")

# Repartition for optimal processing
df = df.repartition(repartition_count, 'customer_id')

# Process data
processed_df = df.transform(apply_transformations)

# Write with partitioning
processed_df.write \
    .partitionBy('date', 'region') \
    .mode('overwrite') \
    .option('maxRecordsPerFile', 100000) \
    .parquet(output_path)
"""

# ✅ Correct - coalesce for small outputs
small_aggregation = SparkSubmitOperator(
    task_id='daily_summary',
    application='s3://jobs/daily_summary.py',
    dag=dag,
)

# Spark job: daily_summary.py
"""
# Aggregate to small dataset
summary_df = df.groupBy('date', 'category').agg(
    F.sum('amount').alias('total_amount'),
    F.count('*').alias('count')
)

# Coalesce to fewer files for small output
summary_df.coalesce(1).write.mode('overwrite').parquet(output_path)
"""

# ❌ Incorrect - too many/few partitions
bad_partitions = SparkSubmitOperator(
    task_id='bad_partitions',
    application='job.py',
    conf={
        'spark.sql.shuffle.partitions': '10000',  # Way too many!
    },
)
```

✅ **Check broadcast joins:**
```python
# ✅ Correct - broadcast small dimension tables
join_with_dimensions = SparkSubmitOperator(
    task_id='join_orders_with_customers',
    application='s3://jobs/join_dimensions.py',
    conf={
        # Increase broadcast threshold for larger lookups
        'spark.sql.autoBroadcastJoinThreshold': '100MB',
    },
    application_args=[
        '--date', '{{ ds }}',
        '--orders-path', 's3://data/orders/date={{ ds }}/',
        '--customers-path', 's3://data/customers/',
        '--products-path', 's3://data/products/',
        '--output', 's3://data/enriched_orders/date={{ ds }}/',
    ],
    dag=dag,
)

# Spark job: join_dimensions.py
"""
# Read large fact table
orders_df = spark.read.parquet(orders_path)

# Read small dimension tables
customers_df = spark.read.parquet(customers_path)
products_df = spark.read.parquet(products_path)

# Broadcast small dimensions (automatically or explicitly)
from pyspark.sql.functions import broadcast

enriched_df = orders_df \
    .join(broadcast(customers_df), 'customer_id', 'left') \
    .join(broadcast(products_df), 'product_id', 'left')

enriched_df.write.parquet(output_path)
"""

# ❌ Incorrect - shuffle join for small table
bad_join = """
# No broadcast, causes expensive shuffle
enriched_df = large_df.join(small_df, 'id')  # Shuffle join!
```

✅ **Check caching strategy:**
```python
# ✅ Correct - caching reused DataFrames
process_with_caching = SparkSubmitOperator(
    task_id='multi_step_processing',
    application='s3://jobs/multi_step.py',
    conf={
        'spark.memory.fraction': '0.8',
        'spark.memory.storageFraction': '0.3',
    },
    dag=dag,
)

# Spark job: multi_step.py
"""
# Read and cache base DataFrame used multiple times
base_df = spark.read.parquet(input_path) \
               .filter(f"date = '{execution_date}'") \
               .cache()

# Multiple operations on cached DataFrame
daily_summary = base_df.groupBy('category').agg(F.sum('amount'))
hourly_summary = base_df.groupBy('hour').agg(F.count('*'))
customer_summary = base_df.groupBy('customer_id').agg(F.sum('amount'))

# Write outputs
daily_summary.write.parquet(f'{output_path}/daily/')
hourly_summary.write.parquet(f'{output_path}/hourly/')
customer_summary.write.parquet(f'{output_path}/customer/')

# Unpersist when done
base_df.unpersist()
"""

# ❌ Incorrect - re-reading data multiple times
inefficient = """
# Re-reads from S3 three times!
df1 = spark.read.parquet(input_path).groupBy('col1').count()
df2 = spark.read.parquet(input_path).groupBy('col2').count()
df3 = spark.read.parquet(input_path).groupBy('col3').count()
"""
```

✅ **Check predicate pushdown:**
```python
# ✅ Correct - partition pruning and predicate pushdown
efficient_read = SparkSubmitOperator(
    task_id='efficient_read',
    application='s3://jobs/efficient_read.py',
    application_args=[
        '--date', '{{ ds }}',
        '--region', 'US',
        '--category', 'electronics',
    ],
    dag=dag,
)

# Spark job: efficient_read.py
"""
# Efficient: partition pruning + predicate pushdown
df = spark.read.parquet('s3://data/orders/') \
    .filter(f"date = '{execution_date}'") \
    .filter(f"region = '{region}'") \
    .filter(f"category = '{category}'") \
    .select('order_id', 'amount', 'customer_id')

# Only reads necessary partitions and columns
"""

# ❌ Incorrect - reading everything then filtering
inefficient_read = """
# Inefficient: reads all data first
df = spark.read.parquet('s3://data/orders/')
filtered_df = df.filter(f"date = '{execution_date}' AND region = 'US'")
```

**How to Verify:**
```bash
# Check shuffle partition configuration
grep -r "spark.sql.shuffle.partitions" dags/*.py

# Verify adaptive query execution
grep -r "spark.sql.adaptive.enabled" dags/*.py

# Check broadcast configuration
grep -r "autoBroadcastJoinThreshold" dags/*.py
grep -r "broadcast" dags/jobs/*.py

# Check caching usage
grep -r "\.cache()" dags/jobs/*.py
grep -r "\.persist()" dags/jobs/*.py

# Monitor Spark UI for optimization
# Check query plans for broadcast joins
# Verify partition counts in stage details
```

**Expected Result:**
- Appropriate shuffle partitions (200-2000)
- Adaptive query execution enabled
- Broadcast joins for small dimensions
- Caching for reused DataFrames
- Partition pruning with date filters
- Column pruning with select
- Coalesce for small outputs

---

### 5. Resource Management and Monitoring

**Requirement:** Spark jobs must have proper resource limits, monitoring, and alerting.

**Verification Steps:**

✅ **Check resource limits:**
```python
# ✅ Correct - resource limits and timeouts
resource_limited_job = SparkSubmitOperator(
    task_id='process_large_dataset',
    application='s3://jobs/process_large.py',
    conf={
        # Executor resources
        'spark.executor.instances': '20',
        'spark.executor.memory': '16g',
        'spark.executor.cores': '4',
        'spark.executor.memoryOverhead': '2g',

        # Driver resources
        'spark.driver.memory': '8g',
        'spark.driver.cores': '2',
        'spark.driver.memoryOverhead': '1g',

        # Memory management
        'spark.memory.fraction': '0.8',
        'spark.memory.storageFraction': '0.3',

        # Shuffle configuration
        'spark.shuffle.service.enabled': 'true',
        'spark.shuffle.memoryFraction': '0.2',
    },
    # Airflow timeouts
    execution_timeout=timedelta(hours=4),
    retries=2,
    retry_delay=timedelta(minutes=10),
    dag=dag,
)

# ✅ Correct - dynamic allocation for variable workloads
dynamic_job = SparkSubmitOperator(
    task_id='variable_workload',
    application='s3://jobs/process.py',
    conf={
        'spark.dynamicAllocation.enabled': 'true',
        'spark.dynamicAllocation.minExecutors': '5',
        'spark.dynamicAllocation.maxExecutors': '50',
        'spark.dynamicAllocation.initialExecutors': '10',
        'spark.dynamicAllocation.executorIdleTimeout': '60s',
    },
    dag=dag,
)

# ❌ Incorrect - no resource limits
unlimited_job = SparkSubmitOperator(
    task_id='unlimited',
    application='job.py',
    # No memory limits, no timeout!
    # Could consume all cluster resources
)
```

✅ **Check monitoring and logging:**
```python
# ✅ Correct - comprehensive logging
monitored_job = SparkSubmitOperator(
    task_id='monitored_processing',
    application='s3://jobs/monitored_process.py',
    conf={
        # Event logging
        'spark.eventLog.enabled': 'true',
        'spark.eventLog.dir': 's3://spark-logs/event-logs/',

        # History server
        'spark.history.fs.logDirectory': 's3://spark-logs/history/',

        # Metrics
        'spark.metrics.namespace': 'customer_processing',
        'spark.sql.streaming.metricsEnabled': 'true',
    },
    verbose=True,  # Detailed Airflow logs
    dag=dag,
)

# Spark job with logging
"""
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

try:
    logger.info(f"Starting processing for date {execution_date}")

    df = spark.read.parquet(input_path)
    logger.info(f"Read {df.count()} records from {input_path}")

    processed_df = df.transform(apply_transformations)
    logger.info(f"Processed {processed_df.count()} records")

    processed_df.write.parquet(output_path)
    logger.info(f"Wrote output to {output_path}")

    # Write metrics
    metrics = {
        'input_count': df.count(),
        'output_count': processed_df.count(),
        'processing_time': processing_time,
        'execution_date': execution_date,
    }
    spark.createDataFrame([metrics]).write.mode('append').json('s3://metrics/processing/')

except Exception as e:
    logger.error(f"Processing failed: {str(e)}", exc_info=True)
    raise
"""

# ❌ Incorrect - no logging
silent_job = SparkSubmitOperator(
    task_id='silent',
    application='job.py',
    verbose=False,
    # No logs, impossible to debug issues
)
```

✅ **Check alerting configuration:**
```python
# ✅ Correct - alerting on failures and SLA misses
from airflow.operators.email import EmailOperator

def spark_failure_alert(context):
    """Custom alert for Spark job failures"""
    task_instance = context['task_instance']
    dag_id = context['dag'].dag_id
    execution_date = context['execution_date']
    log_url = task_instance.log_url

    # Send to Slack/PagerDuty/Email
    send_alert(
        f"🔥 Spark job failed: {dag_id}.{task_instance.task_id}\n"
        f"Execution date: {execution_date}\n"
        f"Logs: {log_url}\n"
        f"Check Spark UI for details"
    )

spark_job = SparkSubmitOperator(
    task_id='critical_processing',
    application='s3://jobs/critical.py',
    on_failure_callback=spark_failure_alert,
    sla=timedelta(hours=2),  # Alert if takes > 2 hours
    dag=dag,
)

# SLA miss callback
def sla_miss_callback(dag, task_list, blocking_task_list, slas, blocking_tis):
    """Alert on SLA misses"""
    for sla in slas:
        send_alert(
            f"⚠️ SLA missed: {sla.dag_id}.{sla.task_id}\n"
            f"Expected: {sla.execution_date + sla.sla}\n"
            f"Actual: {sla.timestamp}"
        )

dag.sla_miss_callback = sla_miss_callback

# ❌ Incorrect - no alerting
no_alerts = SparkSubmitOperator(
    task_id='no_alerts',
    application='job.py',
    # No callbacks, failures go unnoticed
)
```

**How to Verify:**
```bash
# Check resource configuration
grep -r "spark.executor.memory" dags/*.py
grep -r "spark.driver.memory" dags/*.py
grep -r "execution_timeout" dags/*.py

# Verify dynamic allocation
grep -r "dynamicAllocation" dags/*.py

# Check logging configuration
grep -r "spark.eventLog" dags/*.py
grep -r "verbose=True" dags/*.py

# Monitor resource usage
# Check Spark UI: http://spark-master:8080
# Check YARN ResourceManager (if using YARN)

# Verify alerts
grep -r "on_failure_callback" dags/*.py
grep -r "sla=" dags/*.py
```

**Expected Result:**
- Executor and driver memory limits
- Memory overhead configured
- Dynamic allocation for variable loads
- Event logging enabled
- Spark History Server configured
- Detailed logging in Spark jobs
- Failure callbacks for alerts
- SLA configuration for critical jobs

---

## Common Issues and Fixes

### Issue 1: Insufficient Spark resources

**Problem:**
```python
small_executor = SparkSubmitOperator(
    task_id='process_large_data',
    application='job.py',
    conf={
        'spark.executor.instances': '2',
        'spark.executor.memory': '2g',  # Too small!
    },
)
```

**Fix:**
```python
appropriate_resources = SparkSubmitOperator(
    task_id='process_large_data',
    application='job.py',
    conf={
        'spark.executor.instances': '20',
        'spark.executor.memory': '16g',
        'spark.executor.cores': '4',
        'spark.dynamicAllocation.enabled': 'true',
    },
)
```

### Issue 2: Non-idempotent Spark operations

**Problem:**
```python
# Append mode creates duplicates on retry
df.write.mode('append').parquet(output_path)
```

**Fix:**
```python
# Use Delta Lake merge
from delta.tables import DeltaTable

if DeltaTable.isDeltaTable(spark, output_path):
    delta_table = DeltaTable.forPath(spark, output_path)
    delta_table.alias("target").merge(
        df.alias("source"),
        "target.id = source.id"
    ).whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()
else:
    df.write.format("delta").partitionBy("date").save(output_path)
```

### Issue 3: No data validation

**Problem:**
```python
# No validation, bad data flows downstream
df = spark.read.parquet(input_path)
df.write.parquet(output_path)
```

**Fix:**
```python
# Validate before processing
df = spark.read.parquet(input_path)

# Check for nulls
null_count = df.filter(F.col('id').isNull()).count()
if null_count > 0:
    raise ValueError(f"Found {null_count} null IDs")

# Check for duplicates
duplicate_count = df.groupBy('id').count().filter('count > 1').count()
if duplicate_count > 0:
    raise ValueError(f"Found {duplicate_count} duplicate IDs")

# Separate valid/invalid records
valid_df = df.filter(validation_condition)
invalid_df = df.subtract(valid_df)

if invalid_df.count() > 0:
    invalid_df.write.parquet(dead_letter_path)

valid_df.write.parquet(output_path)
```

### Issue 4: Poor partitioning

**Problem:**
```python
# Too many small files
df.write.partitionBy('date', 'hour', 'minute').parquet(output_path)
```

**Fix:**
```python
# Appropriate partitioning
df.write.partitionBy('date') \
    .option('maxRecordsPerFile', 100000) \
    .parquet(output_path)
```

---

## Verification Summary

**Before marking Spark implementation as complete, verify:**

- [ ] SparkSubmitOperator with comprehensive conf
- [ ] Appropriate executor resources (memory, cores, instances)
- [ ] Shuffle partitions configured (200-2000)
- [ ] Adaptive query execution enabled
- [ ] Dynamic allocation for variable workloads
- [ ] Delta Lake jars and configuration
- [ ] Merge operations for idempotency
- [ ] Regular optimization and vacuum jobs
- [ ] Input data validation
- [ ] Schema validation
- [ ] Comprehensive error handling
- [ ] Dead letter queue for invalid records
- [ ] Data quality checks (Soda or custom)
- [ ] Broadcast joins for small tables
- [ ] Caching for reused DataFrames
- [ ] Partition pruning and column pruning
- [ ] Resource limits and timeouts
- [ ] Event logging enabled
- [ ] Detailed application logging
- [ ] Failure callbacks and alerts
- [ ] SLA configuration for critical jobs

**Related Verifiers:**
- **dag-definition.md** - DAG structure and scheduling
- **task-dependencies.md** - Task ordering and dependencies
- **data-quality.md** - Quality checks and validation
