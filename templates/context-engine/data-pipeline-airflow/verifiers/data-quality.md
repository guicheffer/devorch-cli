---
domain: data-quality
description: Verify Soda checks, data validation rules, quality gates, schema validation, and monitoring setup for data quality in Airflow pipelines
---

# Data Quality Verification

Verify that data quality checks are properly implemented with Soda, custom validation, quality gates, and comprehensive monitoring.

## Verification Checklist

### 1. Soda Core Integration

**Requirement:** Soda Core must be integrated into Airflow pipelines for automated data quality checks with proper configuration and check definitions.

**Verification Steps:**

✅ **Check Soda configuration:**
```yaml
# ✅ Correct - Soda configuration file
# File: soda/configuration.yml
data_source orders_db:
  type: postgres
  host: ${POSTGRES_HOST}
  port: 5432
  username: ${POSTGRES_USER}
  password: ${POSTGRES_PASSWORD}
  database: orders
  schema: public

data_source snowflake_dwh:
  type: snowflake
  account: ${SNOWFLAKE_ACCOUNT}
  username: ${SNOWFLAKE_USER}
  password: ${SNOWFLAKE_PASSWORD}
  database: analytics
  warehouse: COMPUTE_WH
  schema: public
  role: DATA_ENGINEER

data_source delta_lake:
  type: spark
  method: databricks
  host: ${DATABRICKS_HOST}
  token: ${DATABRICKS_TOKEN}
  http_path: ${DATABRICKS_HTTP_PATH}
  catalog: main
  schema: default

# Soda Cloud configuration
soda_cloud:
  host: cloud.soda.io
  api_key_id: ${SODA_API_KEY_ID}
  api_key_secret: ${SODA_API_KEY_SECRET}

# ❌ Incorrect - hardcoded credentials
data_source orders_db:
  type: postgres
  host: prod-db.company.com  # Hardcoded!
  username: admin            # Hardcoded!
  password: secret123        # Hardcoded!
```

✅ **Check Soda checks definition:**
```yaml
# ✅ Correct - comprehensive Soda checks
# File: soda/checks/orders_daily.yml
checks for orders:
  # Row count checks
  - row_count > 0:
      name: Orders table not empty
  - row_count between 1000 and 100000:
      name: Daily order volume in expected range

  # Freshness checks
  - freshness(created_at) < 2h:
      name: Orders data is fresh

  # Duplicate checks
  - duplicate_count(order_id) = 0:
      name: No duplicate order IDs

  # Null checks
  - missing_count(order_id) = 0:
      name: No missing order IDs
  - missing_count(customer_id) = 0:
      name: No missing customer IDs
  - missing_count(total_amount) = 0:
      name: No missing order amounts
  - missing_percent(email) < 5%:
      name: Email missing rate below 5%

  # Value checks
  - invalid_count(email) = 0:
      valid regex: '^[\w\.-]+@[\w\.-]+\.\w+$'
      name: All emails valid format
  - invalid_count(status) = 0:
      valid values: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
      name: All statuses are valid
  - min(total_amount) >= 0:
      name: No negative order amounts
  - max(total_amount) <= 100000:
      name: No unreasonably high amounts

  # Statistical checks
  - avg(total_amount) between 50 and 500:
      name: Average order amount in range
  - stddev(total_amount) < 1000:
      name: Order amount standard deviation reasonable

  # Schema checks
  - schema:
      name: Orders schema validation
      fail:
        when required column missing: [order_id, customer_id, total_amount, created_at]
        when wrong column type:
          order_id: varchar
          customer_id: varchar
          total_amount: numeric
          created_at: timestamp
        when forbidden column present: [internal_notes, test_column]

  # Custom SQL checks
  - failed rows:
      name: Orders with invalid relationships
      fail condition: |
        total_amount <> (SELECT SUM(amount) FROM order_items WHERE order_id = orders.order_id)

  # Anomaly detection
  - anomaly detection for row_count:
      name: Detect unusual order volume

# ❌ Incorrect - minimal checks
checks for orders:
  - row_count > 0  # Only checks table is not empty!
```

✅ **Check Soda in Airflow DAG:**
```python
# ✅ Correct - Soda integrated into Airflow
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from datetime import datetime, timedelta
import json

dag = DAG(
    dag_id='daily_order_processing',
    schedule_interval='0 2 * * *',
    start_date=datetime(2024, 1, 1),
    catchup=False,
)

# Extract data
extract_orders = PythonOperator(
    task_id='extract_orders',
    python_callable=extract_orders_func,
    dag=dag,
)

# Run Soda checks on raw data
check_raw_data = BashOperator(
    task_id='check_raw_data_quality',
    bash_command='''
        soda scan \
            -d orders_db \
            -c /opt/airflow/soda/configuration.yml \
            -v date={{ ds }} \
            /opt/airflow/soda/checks/orders_raw.yml
    ''',
    dag=dag,
)

# Transform data
transform_orders = SparkSubmitOperator(
    task_id='transform_orders',
    application='s3://jobs/transform_orders.py',
    dag=dag,
)

# Run Soda checks on transformed data
check_transformed_data = BashOperator(
    task_id='check_transformed_data_quality',
    bash_command='''
        soda scan \
            -d snowflake_dwh \
            -c /opt/airflow/soda/configuration.yml \
            -v date={{ ds }} \
            -v environment={{ var.value.environment }} \
            /opt/airflow/soda/checks/orders_transformed.yml
    ''',
    dag=dag,
)

# Load to warehouse
load_orders = PythonOperator(
    task_id='load_orders',
    python_callable=load_orders_func,
    dag=dag,
)

# Run final Soda checks
check_warehouse_data = BashOperator(
    task_id='check_warehouse_data_quality',
    bash_command='''
        soda scan \
            -d snowflake_dwh \
            -c /opt/airflow/soda/configuration.yml \
            -v date={{ ds }} \
            /opt/airflow/soda/checks/orders_warehouse.yml
    ''',
    dag=dag,
)

# Dependencies: quality gates at each stage
extract_orders >> check_raw_data >> transform_orders >> check_transformed_data >> load_orders >> check_warehouse_data

# ✅ Correct - Soda with Python operator for custom handling
from airflow.operators.python import PythonOperator

def run_soda_scan(**context):
    """Run Soda scan with custom error handling"""
    from soda.scan import Scan

    # Configure scan
    scan = Scan()
    scan.set_data_source_name('orders_db')
    scan.add_configuration_yaml_file('/opt/airflow/soda/configuration.yml')
    scan.add_sodacl_yaml_file('/opt/airflow/soda/checks/orders.yml')
    scan.add_variables({'date': context['ds']})

    # Execute scan
    scan.execute()

    # Get results
    scan_result = scan.get_scan_results()

    # Log results
    print(f"Scan result: {scan_result}")
    print(f"Checks passed: {scan.get_checks_passed()}")
    print(f"Checks failed: {scan.get_checks_failed()}")
    print(f"Checks warned: {scan.get_checks_warned()}")

    # Push results to XCom
    context['task_instance'].xcom_push(
        key='quality_checks',
        value={
            'passed': scan.get_checks_passed(),
            'failed': scan.get_checks_failed(),
            'warned': scan.get_checks_warned(),
            'has_failures': scan.has_check_fails(),
        }
    )

    # Fail task if checks failed
    if scan.has_check_fails():
        raise ValueError(f"Soda scan failed: {scan.get_checks_failed()} checks failed")

    return scan_result

soda_scan_task = PythonOperator(
    task_id='run_soda_quality_checks',
    python_callable=run_soda_scan,
    dag=dag,
)

# ❌ Incorrect - no quality checks
extract_orders >> transform_orders >> load_orders  # No validation!
```

✅ **Check Soda check files organization:**
```bash
# ✅ Correct - organized Soda checks
soda/
├── configuration.yml
├── checks/
│   ├── orders_raw.yml           # Checks for raw data
│   ├── orders_transformed.yml   # Checks for transformed data
│   ├── orders_warehouse.yml     # Checks for warehouse data
│   ├── customers.yml
│   ├── products.yml
│   └── shared/
│       ├── common_checks.yml    # Shared checks
│       └── schema_checks.yml
└── reports/
    └── scan_results/            # Scan output

# ❌ Incorrect - flat structure
soda/
├── config.yml
├── checks.yml  # All checks in one file!
```

**How to Verify:**
```bash
# Test Soda configuration
soda test-connection -d orders_db -c soda/configuration.yml

# Run Soda scan manually
soda scan -d orders_db -c soda/configuration.yml soda/checks/orders.yml

# Check Soda scan in Airflow
airflow tasks test daily_order_processing check_raw_data_quality 2024-01-01

# Verify Soda checks syntax
soda scan --dry-run -d orders_db -c soda/configuration.yml soda/checks/orders.yml

# Check for Soda in DAGs
grep -r "soda scan" dags/*.py
find soda/checks -name "*.yml"
```

**Expected Result:**
- Soda configuration with environment variables
- Multiple check files per table/stage
- Comprehensive checks (nulls, duplicates, values, schema)
- Soda integrated at quality gates
- Failed checks fail the Airflow task
- Scan results pushed to XCom

---

### 2. Custom Data Validation

**Requirement:** Custom validation logic must be implemented for business-specific rules that cannot be expressed in Soda checks.

**Verification Steps:**

✅ **Check PySpark validation:**
```python
# ✅ Correct - comprehensive PySpark validation
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator

validate_customer_data = SparkSubmitOperator(
    task_id='validate_customer_data',
    application='s3://jobs/validate_customers.py',
    application_args=[
        '--date', '{{ ds }}',
        '--input-path', 's3://data-lake/raw/customers/date={{ ds }}/',
        '--validation-report-path', 's3://validation-reports/customers/date={{ ds }}/',
        '--dead-letter-path', 's3://dead-letter/customers/date={{ ds }}/',
    ],
    dag=dag,
)

# Spark job: validate_customers.py
"""
from pyspark.sql import SparkSession, functions as F
from pyspark.sql.types import *
import sys

spark = SparkSession.builder.appName("validate_customers").getOrCreate()

# Read data
df = spark.read.parquet(input_path)

# Validation rules
validation_results = {}

# 1. Schema validation
expected_schema = StructType([
    StructField("customer_id", StringType(), False),
    StructField("email", StringType(), False),
    StructField("registration_date", TimestampType(), False),
    StructField("total_orders", IntegerType(), True),
    StructField("total_spent", DecimalType(10, 2), True),
])

schema_matches = df.schema == expected_schema
validation_results['schema_valid'] = schema_matches

# 2. Row count validation
row_count = df.count()
validation_results['row_count'] = row_count
validation_results['row_count_valid'] = row_count > 0

# 3. Null validation
null_counts = {col: df.filter(F.col(col).isNull()).count() for col in df.columns}
validation_results['null_counts'] = null_counts
validation_results['no_null_ids'] = null_counts['customer_id'] == 0

# 4. Duplicate validation
duplicate_count = df.groupBy('customer_id').count().filter('count > 1').count()
validation_results['duplicate_count'] = duplicate_count
validation_results['no_duplicates'] = duplicate_count == 0

# 5. Email validation
invalid_emails = df.filter(
    ~F.col('email').rlike(r'^[\w\.-]+@[\w\.-]+\.\w+$')
).count()
validation_results['invalid_email_count'] = invalid_emails
validation_results['emails_valid'] = invalid_emails == 0

# 6. Date validation
future_dates = df.filter(F.col('registration_date') > F.current_timestamp()).count()
validation_results['future_date_count'] = future_dates
validation_results['dates_valid'] = future_dates == 0

# 7. Value range validation
negative_amounts = df.filter(F.col('total_spent') < 0).count()
validation_results['negative_amount_count'] = negative_amounts
validation_results['amounts_valid'] = negative_amounts == 0

# 8. Referential integrity (example)
# Check all customer_ids exist in customer dimension
customer_ids = df.select('customer_id').distinct()
valid_customer_ids = spark.read.parquet('s3://data/customers/').select('customer_id')
invalid_references = customer_ids.subtract(valid_customer_ids).count()
validation_results['invalid_reference_count'] = invalid_references
validation_results['referential_integrity_valid'] = invalid_references == 0

# Separate valid and invalid records
invalid_records = df.filter(
    F.col('customer_id').isNull() |
    ~F.col('email').rlike(r'^[\w\.-]+@[\w\.-]+\.\w+$') |
    (F.col('registration_date') > F.current_timestamp()) |
    (F.col('total_spent') < 0)
)

if invalid_records.count() > 0:
    # Write invalid records to dead letter queue
    invalid_records.withColumn('validation_date', F.current_timestamp()) \
                   .withColumn('execution_date', F.lit(execution_date)) \
                   .write.mode('append').parquet(dead_letter_path)

# Write validation report
validation_df = spark.createDataFrame([validation_results])
validation_df.withColumn('execution_date', F.lit(execution_date)) \
             .withColumn('validation_timestamp', F.current_timestamp()) \
             .write.mode('overwrite').json(validation_report_path)

# Print summary
print(f"Validation Results for {execution_date}:")
print(f"  Total records: {row_count}")
print(f"  Invalid records: {invalid_records.count()}")
print(f"  Duplicate records: {duplicate_count}")
print(f"  Invalid emails: {invalid_emails}")
print(f"  Future dates: {future_dates}")
print(f"  Negative amounts: {negative_amounts}")

# Determine if validation passed
all_checks_passed = all([
    validation_results['schema_valid'],
    validation_results['row_count_valid'],
    validation_results['no_null_ids'],
    validation_results['no_duplicates'],
    validation_results['emails_valid'],
    validation_results['dates_valid'],
    validation_results['amounts_valid'],
    validation_results['referential_integrity_valid'],
])

if not all_checks_passed:
    failed_checks = [k for k, v in validation_results.items() if k.endswith('_valid') and not v]
    raise ValueError(f"Validation failed. Failed checks: {failed_checks}")

print("✓ All validation checks passed")
"""

# ❌ Incorrect - no validation
process_data = SparkSubmitOperator(
    task_id='process_data',
    application='s3://jobs/process.py',
    # No validation! Bad data flows downstream
)
```

✅ **Check Python validation functions:**
```python
# ✅ Correct - reusable validation functions
# File: dags/utils/validation.py

from typing import Dict, List, Any
from datetime import datetime
import pandas as pd

class DataValidator:
    """Reusable data validation utilities"""

    def __init__(self):
        self.errors = []
        self.warnings = []

    def validate_dataframe(self, df: pd.DataFrame, rules: Dict[str, Any]) -> bool:
        """Validate DataFrame against rules"""
        all_passed = True

        # Row count validation
        if 'min_rows' in rules:
            if len(df) < rules['min_rows']:
                self.errors.append(f"Row count {len(df)} below minimum {rules['min_rows']}")
                all_passed = False

        # Required columns
        if 'required_columns' in rules:
            missing_cols = set(rules['required_columns']) - set(df.columns)
            if missing_cols:
                self.errors.append(f"Missing required columns: {missing_cols}")
                all_passed = False

        # Column types
        if 'column_types' in rules:
            for col, expected_type in rules['column_types'].items():
                if col in df.columns:
                    actual_type = df[col].dtype
                    if str(actual_type) != expected_type:
                        self.errors.append(
                            f"Column {col} has type {actual_type}, expected {expected_type}"
                        )
                        all_passed = False

        # Null checks
        if 'no_nulls' in rules:
            for col in rules['no_nulls']:
                null_count = df[col].isna().sum()
                if null_count > 0:
                    self.errors.append(f"Column {col} has {null_count} null values")
                    all_passed = False

        # Unique checks
        if 'unique_columns' in rules:
            for col in rules['unique_columns']:
                duplicate_count = df[col].duplicated().sum()
                if duplicate_count > 0:
                    self.errors.append(f"Column {col} has {duplicate_count} duplicates")
                    all_passed = False

        # Value range checks
        if 'value_ranges' in rules:
            for col, (min_val, max_val) in rules['value_ranges'].items():
                out_of_range = ((df[col] < min_val) | (df[col] > max_val)).sum()
                if out_of_range > 0:
                    self.errors.append(
                        f"Column {col} has {out_of_range} values outside range [{min_val}, {max_val}]"
                    )
                    all_passed = False

        # Custom validation functions
        if 'custom_checks' in rules:
            for check_name, check_func in rules['custom_checks'].items():
                try:
                    if not check_func(df):
                        self.errors.append(f"Custom check '{check_name}' failed")
                        all_passed = False
                except Exception as e:
                    self.errors.append(f"Custom check '{check_name}' raised error: {str(e)}")
                    all_passed = False

        return all_passed

    def get_validation_report(self) -> Dict[str, Any]:
        """Get validation report"""
        return {
            'errors': self.errors,
            'warnings': self.warnings,
            'error_count': len(self.errors),
            'warning_count': len(self.warnings),
            'passed': len(self.errors) == 0,
            'timestamp': datetime.now().isoformat(),
        }

# Usage in Airflow task
from airflow.operators.python import PythonOperator

def validate_customer_data(**context):
    """Validate customer data"""
    import pandas as pd
    from dags.utils.validation import DataValidator

    # Read data
    df = pd.read_parquet(input_path)

    # Define validation rules
    rules = {
        'min_rows': 1000,
        'required_columns': ['customer_id', 'email', 'registration_date'],
        'column_types': {
            'customer_id': 'object',
            'email': 'object',
            'registration_date': 'datetime64[ns]',
            'total_spent': 'float64',
        },
        'no_nulls': ['customer_id', 'email'],
        'unique_columns': ['customer_id'],
        'value_ranges': {
            'total_spent': (0, 1000000),
        },
        'custom_checks': {
            'valid_emails': lambda df: df['email'].str.match(r'^[\w\.-]+@[\w\.-]+\.\w+$').all(),
            'future_dates': lambda df: (df['registration_date'] <= pd.Timestamp.now()).all(),
        },
    }

    # Run validation
    validator = DataValidator()
    passed = validator.validate_dataframe(df, rules)

    # Get report
    report = validator.get_validation_report()

    # Push report to XCom
    context['task_instance'].xcom_push(key='validation_report', value=report)

    # Fail if validation failed
    if not passed:
        raise ValueError(f"Validation failed: {report['errors']}")

    return report

validate_task = PythonOperator(
    task_id='validate_customer_data',
    python_callable=validate_customer_data,
    dag=dag,
)
```

✅ **Check SQL validation:**
```python
# ✅ Correct - SQL validation checks
from airflow.providers.postgres.operators.postgres import PostgresOperator

validate_orders_sql = PostgresOperator(
    task_id='validate_orders',
    postgres_conn_id='postgres_orders',
    sql='''
        -- Create validation results table
        CREATE TEMP TABLE validation_results AS
        WITH validation_checks AS (
            SELECT
                '{{ ds }}' as execution_date,
                -- Row count check
                (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = '{{ ds }}') as row_count,
                (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = '{{ ds }}') >= 1000 as row_count_valid,

                -- Null checks
                (SELECT COUNT(*) FROM orders WHERE order_id IS NULL AND DATE(created_at) = '{{ ds }}') as null_order_ids,
                (SELECT COUNT(*) FROM orders WHERE order_id IS NULL AND DATE(created_at) = '{{ ds }}') = 0 as no_null_ids,

                -- Duplicate check
                (SELECT COUNT(*) FROM (
                    SELECT order_id, COUNT(*) as cnt
                    FROM orders
                    WHERE DATE(created_at) = '{{ ds }}'
                    GROUP BY order_id
                    HAVING COUNT(*) > 1
                ) dup) as duplicate_count,
                (SELECT COUNT(*) FROM (
                    SELECT order_id, COUNT(*) as cnt
                    FROM orders
                    WHERE DATE(created_at) = '{{ ds }}'
                    GROUP BY order_id
                    HAVING COUNT(*) > 1
                ) dup) = 0 as no_duplicates,

                -- Value validation
                (SELECT COUNT(*) FROM orders WHERE total_amount < 0 AND DATE(created_at) = '{{ ds }}') as negative_amounts,
                (SELECT COUNT(*) FROM orders WHERE total_amount < 0 AND DATE(created_at) = '{{ ds }}') = 0 as no_negative_amounts,

                -- Referential integrity
                (SELECT COUNT(*)
                 FROM orders o
                 LEFT JOIN customers c ON o.customer_id = c.customer_id
                 WHERE c.customer_id IS NULL
                 AND DATE(o.created_at) = '{{ ds }}'
                ) as orphan_orders,
                (SELECT COUNT(*)
                 FROM orders o
                 LEFT JOIN customers c ON o.customer_id = c.customer_id
                 WHERE c.customer_id IS NULL
                 AND DATE(o.created_at) = '{{ ds }}'
                ) = 0 as referential_integrity_valid
        )
        SELECT * FROM validation_checks;

        -- Check validation results
        DO $$
        DECLARE
            v_row_count_valid BOOLEAN;
            v_no_null_ids BOOLEAN;
            v_no_duplicates BOOLEAN;
            v_no_negative_amounts BOOLEAN;
            v_referential_integrity_valid BOOLEAN;
        BEGIN
            SELECT
                row_count_valid,
                no_null_ids,
                no_duplicates,
                no_negative_amounts,
                referential_integrity_valid
            INTO
                v_row_count_valid,
                v_no_null_ids,
                v_no_duplicates,
                v_no_negative_amounts,
                v_referential_integrity_valid
            FROM validation_results;

            -- Fail if any check failed
            IF NOT (v_row_count_valid AND v_no_null_ids AND v_no_duplicates
                    AND v_no_negative_amounts AND v_referential_integrity_valid) THEN
                RAISE EXCEPTION 'Data validation failed. Check validation_results table for details.';
            END IF;
        END $$;

        -- Insert validation results into permanent table
        INSERT INTO data_quality_reports (execution_date, validation_results, created_at)
        SELECT execution_date, row_to_json(validation_results.*), NOW()
        FROM validation_results;
    ''',
    dag=dag,
)

# ❌ Incorrect - no SQL validation
load_orders = PostgresOperator(
    task_id='load_orders',
    sql='INSERT INTO orders SELECT * FROM staging_orders',
    # No validation! Bad data loaded directly
)
```

**How to Verify:**
```bash
# Check for validation tasks
grep -r "validate" dags/*.py

# Test validation functions
python -c "from dags.utils.validation import DataValidator; print('OK')"

# Run validation task
airflow tasks test <dag_id> validate_customer_data 2024-01-01

# Check validation reports
aws s3 ls s3://validation-reports/customers/
```

**Expected Result:**
- PySpark validation for large datasets
- Python validation functions for pandas DataFrames
- SQL validation for database checks
- Validation reports written to S3/database
- Failed validation fails the task
- Invalid records written to dead letter queue

---

### 3. Quality Gates and Thresholds

**Requirement:** Quality gates must be implemented at critical pipeline stages with appropriate thresholds and failure handling.

**Verification Steps:**

✅ **Check quality gates in pipeline:**
```python
# ✅ Correct - quality gates at each stage
from airflow import DAG
from airflow.operators.python import PythonOperator, BranchPythonOperator
from airflow.operators.bash import BashOperator
from airflow.utils.trigger_rule import TriggerRule

dag = DAG(
    dag_id='order_processing_with_quality_gates',
    schedule_interval='@daily',
    catchup=False,
)

# Stage 1: Extract
extract_orders = PythonOperator(task_id='extract_orders', ...)

# Quality Gate 1: Raw data validation
validate_raw_data = BashOperator(
    task_id='validate_raw_data',
    bash_command='soda scan -d orders_db -c soda/config.yml soda/checks/orders_raw.yml',
)

# Stage 2: Transform
transform_orders = SparkSubmitOperator(task_id='transform_orders', ...)

# Quality Gate 2: Transformed data validation
validate_transformed_data = BashOperator(
    task_id='validate_transformed_data',
    bash_command='soda scan -d snowflake_dwh -c soda/config.yml soda/checks/orders_transformed.yml',
)

# Stage 3: Load
load_to_warehouse = PythonOperator(task_id='load_to_warehouse', ...)

# Quality Gate 3: Warehouse data validation
validate_warehouse_data = BashOperator(
    task_id='validate_warehouse_data',
    bash_command='soda scan -d snowflake_dwh -c soda/config.yml soda/checks/orders_warehouse.yml',
)

# Cleanup (always runs)
cleanup = PythonOperator(
    task_id='cleanup_temp_files',
    trigger_rule=TriggerRule.ALL_DONE,
    ...
)

# Alert on failure
send_alert = PythonOperator(
    task_id='send_quality_failure_alert',
    trigger_rule=TriggerRule.ONE_FAILED,
    ...
)

# Pipeline with quality gates
extract_orders >> validate_raw_data >> transform_orders >> validate_transformed_data >> load_to_warehouse >> validate_warehouse_data
[extract_orders, validate_raw_data, transform_orders, validate_transformed_data, load_to_warehouse, validate_warehouse_data] >> cleanup
[extract_orders, validate_raw_data, transform_orders, validate_transformed_data, load_to_warehouse, validate_warehouse_data] >> send_alert

# ❌ Incorrect - no quality gates
extract_orders >> transform_orders >> load_to_warehouse  # No validation!
```

✅ **Check quality thresholds:**
```python
# ✅ Correct - configurable quality thresholds
from airflow.models import Variable

QUALITY_THRESHOLDS = {
    'min_row_count': Variable.get('orders_min_row_count', default_var=1000),
    'max_null_percentage': Variable.get('orders_max_null_pct', default_var=0.01),
    'max_duplicate_percentage': Variable.get('orders_max_dup_pct', default_var=0.001),
    'max_invalid_email_percentage': Variable.get('orders_max_invalid_email_pct', default_var=0.05),
}

def validate_with_thresholds(**context):
    """Validate data against configurable thresholds"""
    df = spark.read.parquet(input_path)

    row_count = df.count()
    null_count = df.filter(F.col('email').isNull()).count()
    null_percentage = null_count / row_count

    duplicate_count = df.groupBy('order_id').count().filter('count > 1').count()
    duplicate_percentage = duplicate_count / row_count

    invalid_emails = df.filter(
        ~F.col('email').rlike(r'^[\w\.-]+@[\w\.-]+\.\w+$')
    ).count()
    invalid_email_percentage = invalid_emails / row_count

    # Check thresholds
    failures = []

    if row_count < QUALITY_THRESHOLDS['min_row_count']:
        failures.append(
            f"Row count {row_count} below threshold {QUALITY_THRESHOLDS['min_row_count']}"
        )

    if null_percentage > QUALITY_THRESHOLDS['max_null_percentage']:
        failures.append(
            f"Null percentage {null_percentage:.4f} above threshold {QUALITY_THRESHOLDS['max_null_percentage']}"
        )

    if duplicate_percentage > QUALITY_THRESHOLDS['max_duplicate_percentage']:
        failures.append(
            f"Duplicate percentage {duplicate_percentage:.4f} above threshold {QUALITY_THRESHOLDS['max_duplicate_percentage']}"
        )

    if invalid_email_percentage > QUALITY_THRESHOLDS['max_invalid_email_percentage']:
        failures.append(
            f"Invalid email percentage {invalid_email_percentage:.4f} above threshold {QUALITY_THRESHOLDS['max_invalid_email_percentage']}"
        )

    # Fail if any threshold exceeded
    if failures:
        raise ValueError(f"Quality thresholds exceeded: {failures}")

    return {
        'row_count': row_count,
        'null_percentage': null_percentage,
        'duplicate_percentage': duplicate_percentage,
        'invalid_email_percentage': invalid_email_percentage,
        'thresholds_met': True,
    }

validate_task = PythonOperator(
    task_id='validate_with_thresholds',
    python_callable=validate_with_thresholds,
    dag=dag,
)

# ✅ Correct - different thresholds by environment
ENV = Variable.get('environment', default_var='dev')

ENV_THRESHOLDS = {
    'dev': {
        'min_row_count': 100,  # Lower threshold for dev
        'max_null_percentage': 0.05,
    },
    'staging': {
        'min_row_count': 1000,
        'max_null_percentage': 0.02,
    },
    'prod': {
        'min_row_count': 10000,  # Strict threshold for prod
        'max_null_percentage': 0.01,
    },
}

thresholds = ENV_THRESHOLDS[ENV]
```

✅ **Check quality branching:**
```python
# ✅ Correct - branching based on quality checks
from airflow.operators.python import BranchPythonOperator

def check_data_quality(**context):
    """Check quality and decide next step"""
    ti = context['task_instance']

    # Get validation results
    validation_results = ti.xcom_pull(task_ids='validate_data')

    error_count = validation_results['error_count']
    warning_count = validation_results['warning_count']

    if error_count > 0:
        # Critical errors: stop pipeline
        return 'send_critical_alert'
    elif warning_count > 0:
        # Warnings: continue with degraded mode
        return 'process_with_warnings'
    else:
        # All good: normal processing
        return 'process_normally'

validate_data = PythonOperator(task_id='validate_data', ...)

branch_on_quality = BranchPythonOperator(
    task_id='branch_on_quality',
    python_callable=check_data_quality,
)

send_critical_alert = PythonOperator(task_id='send_critical_alert', ...)
process_with_warnings = PythonOperator(task_id='process_with_warnings', ...)
process_normally = PythonOperator(task_id='process_normally', ...)

# Join after branching
join = PythonOperator(
    task_id='join',
    trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
    ...
)

validate_data >> branch_on_quality
branch_on_quality >> [send_critical_alert, process_with_warnings, process_normally]
[send_critical_alert, process_with_warnings, process_normally] >> join
```

**How to Verify:**
```bash
# Check quality gates in pipeline
airflow dags show <dag_id>

# Verify thresholds
airflow variables list | grep -i threshold

# Test quality gates
airflow tasks test <dag_id> validate_raw_data 2024-01-01

# Check branching logic
airflow tasks test <dag_id> branch_on_quality 2024-01-01
```

**Expected Result:**
- Quality gates at each pipeline stage
- Configurable thresholds via Airflow Variables
- Different thresholds by environment
- Branching based on quality results
- Failed quality gates stop pipeline
- Cleanup tasks always run

---

### 4. Data Quality Monitoring and Alerting

**Requirement:** Data quality metrics must be monitored and alerts sent on failures with proper context and actionable information.

**Verification Steps:**

✅ **Check quality metrics collection:**
```python
# ✅ Correct - collect and store quality metrics
from airflow.operators.python import PythonOperator

def collect_quality_metrics(**context):
    """Collect quality metrics and store in time series"""
    execution_date = context['ds']

    # Run quality checks
    validation_results = run_validation(execution_date)

    # Collect metrics
    metrics = {
        'execution_date': execution_date,
        'timestamp': datetime.now().isoformat(),
        'table': 'orders',
        'row_count': validation_results['row_count'],
        'null_count': validation_results['null_count'],
        'duplicate_count': validation_results['duplicate_count'],
        'invalid_count': validation_results['invalid_count'],
        'null_percentage': validation_results['null_percentage'],
        'duplicate_percentage': validation_results['duplicate_percentage'],
        'quality_score': validation_results['quality_score'],
        'checks_passed': validation_results['checks_passed'],
        'checks_failed': validation_results['checks_failed'],
    }

    # Store in time series database (e.g., TimescaleDB, InfluxDB)
    store_metrics_in_timeseries(metrics)

    # Store in data warehouse for analysis
    store_metrics_in_warehouse(metrics)

    # Push to XCom for downstream tasks
    context['task_instance'].xcom_push(key='quality_metrics', value=metrics)

    return metrics

collect_metrics = PythonOperator(
    task_id='collect_quality_metrics',
    python_callable=collect_quality_metrics,
    dag=dag,
)

# ✅ Correct - quality metrics dashboard
"""
-- Create quality metrics table
CREATE TABLE IF NOT EXISTS data_quality_metrics (
    id SERIAL PRIMARY KEY,
    execution_date DATE NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    row_count BIGINT,
    null_count BIGINT,
    duplicate_count BIGINT,
    invalid_count BIGINT,
    null_percentage DECIMAL(5, 4),
    duplicate_percentage DECIMAL(5, 4),
    quality_score DECIMAL(5, 2),
    checks_passed INTEGER,
    checks_failed INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Query for dashboard
SELECT
    execution_date,
    table_name,
    row_count,
    quality_score,
    checks_passed,
    checks_failed,
    null_percentage * 100 as null_pct,
    duplicate_percentage * 100 as dup_pct
FROM data_quality_metrics
WHERE execution_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY execution_date DESC, table_name;
"""
```

✅ **Check quality alerts:**
```python
# ✅ Correct - comprehensive quality alerts
from airflow.operators.python import PythonOperator
from airflow.operators.email import EmailOperator

def send_quality_alert(**context):
    """Send detailed quality alert"""
    ti = context['task_instance']
    dag_id = context['dag'].dag_id
    execution_date = context['ds']

    # Get quality metrics
    metrics = ti.xcom_pull(task_ids='collect_quality_metrics', key='quality_metrics')

    # Get validation report
    validation_report = ti.xcom_pull(task_ids='validate_data', key='validation_report')

    # Build alert message
    alert_message = f"""
    ⚠️ Data Quality Alert

    Pipeline: {dag_id}
    Execution Date: {execution_date}
    Timestamp: {datetime.now().isoformat()}

    Quality Metrics:
    - Row count: {metrics['row_count']:,}
    - Null percentage: {metrics['null_percentage']:.2%}
    - Duplicate percentage: {metrics['duplicate_percentage']:.2%}
    - Quality score: {metrics['quality_score']:.2f}/100
    - Checks passed: {metrics['checks_passed']}
    - Checks failed: {metrics['checks_failed']}

    Failed Checks:
    {chr(10).join(f"  - {error}" for error in validation_report['errors'])}

    Warnings:
    {chr(10).join(f"  - {warning}" for warning in validation_report['warnings'])}

    Actions Required:
    1. Review validation report: s3://validation-reports/{dag_id}/{execution_date}/
    2. Check invalid records: s3://dead-letter/{dag_id}/{execution_date}/
    3. Investigate data source quality
    4. Contact data-team@ if assistance needed

    Airflow Logs: {ti.log_url}
    """

    # Send to multiple channels
    send_slack_alert(alert_message, channel='#data-quality-alerts')
    send_pagerduty_alert(alert_message, severity='warning')
    send_email_alert(alert_message, recipients=['data-team@company.com'])

    return alert_message

quality_alert = PythonOperator(
    task_id='send_quality_alert',
    python_callable=send_quality_alert,
    trigger_rule=TriggerRule.ONE_FAILED,
    dag=dag,
)

# ✅ Correct - email alert with HTML report
send_quality_email = EmailOperator(
    task_id='send_quality_email',
    to=['data-team@company.com'],
    subject='Data Quality Alert: {{ dag.dag_id }} - {{ ds }}',
    html_content='''
    <h2>Data Quality Alert</h2>

    <p><strong>Pipeline:</strong> {{ dag.dag_id }}</p>
    <p><strong>Execution Date:</strong> {{ ds }}</p>

    <h3>Quality Metrics</h3>
    <table border="1">
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Row Count</td><td>{{ task_instance.xcom_pull(task_ids='collect_quality_metrics', key='quality_metrics')['row_count'] }}</td></tr>
        <tr><td>Quality Score</td><td>{{ task_instance.xcom_pull(task_ids='collect_quality_metrics', key='quality_metrics')['quality_score'] }}</td></tr>
        <tr><td>Checks Passed</td><td>{{ task_instance.xcom_pull(task_ids='collect_quality_metrics', key='quality_metrics')['checks_passed'] }}</td></tr>
        <tr><td>Checks Failed</td><td>{{ task_instance.xcom_pull(task_ids='collect_quality_metrics', key='quality_metrics')['checks_failed'] }}</td></tr>
    </table>

    <h3>Actions Required</h3>
    <ul>
        <li>Review validation report</li>
        <li>Check invalid records in dead letter queue</li>
        <li>Investigate data source</li>
    </ul>

    <p><a href="{{ task_instance.log_url }}">View Airflow Logs</a></p>
    ''',
    trigger_rule=TriggerRule.ONE_FAILED,
    dag=dag,
)

# ❌ Incorrect - minimal alert
bad_alert = EmailOperator(
    task_id='alert',
    to='data-team@company.com',
    subject='Pipeline Failed',
    html_content='Pipeline failed. Check logs.',  # Not actionable!
)
```

✅ **Check quality monitoring dashboard:**
```python
# ✅ Correct - Grafana/Superset dashboard integration
"""
Dashboard: Data Quality Monitoring

Panels:
1. Quality Score Trend (Time Series)
   - Query: SELECT execution_date, AVG(quality_score) FROM data_quality_metrics GROUP BY execution_date

2. Failed Checks Trend (Time Series)
   - Query: SELECT execution_date, SUM(checks_failed) FROM data_quality_metrics GROUP BY execution_date

3. Null Percentage by Table (Bar Chart)
   - Query: SELECT table_name, AVG(null_percentage) * 100 as null_pct FROM data_quality_metrics WHERE execution_date >= CURRENT_DATE - 7 GROUP BY table_name

4. Recent Quality Alerts (Table)
   - Query: SELECT * FROM data_quality_metrics WHERE checks_failed > 0 ORDER BY timestamp DESC LIMIT 10

5. Data Freshness (Gauge)
   - Query: SELECT MAX(execution_date) FROM data_quality_metrics

Alerts:
- Quality score < 90 for 3 consecutive days
- Checks failed > 5
- No data received for 2 hours
"""

# Write metrics to Prometheus
def push_metrics_to_prometheus(**context):
    """Push quality metrics to Prometheus"""
    from prometheus_client import CollectorRegistry, Gauge, push_to_gateway

    registry = CollectorRegistry()

    # Define gauges
    quality_score = Gauge('data_quality_score', 'Data quality score', ['table'], registry=registry)
    row_count = Gauge('data_row_count', 'Row count', ['table'], registry=registry)
    checks_failed = Gauge('data_checks_failed', 'Failed checks', ['table'], registry=registry)

    # Get metrics
    metrics = context['task_instance'].xcom_pull(key='quality_metrics')

    # Set values
    quality_score.labels(table='orders').set(metrics['quality_score'])
    row_count.labels(table='orders').set(metrics['row_count'])
    checks_failed.labels(table='orders').set(metrics['checks_failed'])

    # Push to Prometheus gateway
    push_to_gateway('prometheus-gateway:9091', job='data_quality', registry=registry)

push_prometheus_metrics = PythonOperator(
    task_id='push_prometheus_metrics',
    python_callable=push_metrics_to_prometheus,
    dag=dag,
)
```

**How to Verify:**
```bash
# Check quality metrics collection
grep -r "collect.*metrics" dags/*.py

# Verify metrics storage
psql -c "SELECT * FROM data_quality_metrics ORDER BY timestamp DESC LIMIT 10;"

# Test alert sending
airflow tasks test <dag_id> send_quality_alert 2024-01-01

# Check Prometheus metrics
curl http://prometheus-gateway:9091/metrics | grep data_quality
```

**Expected Result:**
- Quality metrics collected and stored
- Time series database for trending
- Comprehensive alerts with context
- Multiple alert channels (email, Slack, PagerDuty)
- Grafana/Superset dashboards
- Prometheus metrics for monitoring
- Actionable alert messages

---

## Common Issues and Fixes

### Issue 1: No quality checks

**Problem:**
```python
extract >> transform >> load  # No validation!
```

**Fix:**
```python
extract >> validate_raw >> transform >> validate_transformed >> load >> validate_final
```

### Issue 2: Hardcoded thresholds

**Problem:**
```python
if row_count < 1000:  # Hardcoded!
    raise ValueError("Too few rows")
```

**Fix:**
```python
min_row_count = Variable.get('min_row_count', default_var=1000)
if row_count < min_row_count:
    raise ValueError(f"Row count {row_count} below threshold {min_row_count}")
```

### Issue 3: Silent quality failures

**Problem:**
```python
# Validation fails but pipeline continues
if validation_failed:
    print("Validation failed")  # Only prints!
```

**Fix:**
```python
if validation_failed:
    raise ValueError(f"Validation failed: {errors}")  # Fails task
```

### Issue 4: No quality monitoring

**Problem:**
```python
# Validation runs but results not stored
validate_data()
```

**Fix:**
```python
# Store results for monitoring
results = validate_data()
store_quality_metrics(results)
push_to_prometheus(results)
```

---

## Verification Summary

**Before marking data quality implementation complete, verify:**

- [ ] Soda Core configuration with environment variables
- [ ] Comprehensive Soda checks (nulls, duplicates, schema, values)
- [ ] Soda checks at each pipeline stage (raw, transformed, warehouse)
- [ ] Custom PySpark validation for large datasets
- [ ] Custom Python validation for pandas DataFrames
- [ ] SQL validation for database checks
- [ ] Validation reports written to S3/database
- [ ] Invalid records written to dead letter queue
- [ ] Quality gates at critical pipeline stages
- [ ] Configurable quality thresholds
- [ ] Different thresholds by environment
- [ ] Branching based on quality results
- [ ] Failed quality checks fail the task
- [ ] Quality metrics collected and stored
- [ ] Time series database for trending
- [ ] Comprehensive alerts with context
- [ ] Multiple alert channels (email, Slack, PagerDuty)
- [ ] Grafana/Superset dashboards for monitoring
- [ ] Prometheus metrics for alerting
- [ ] Actionable alert messages with next steps

**Related Verifiers:**
- **dag-definition.md** - DAG structure and organization
- **spark-operators.md** - Spark job validation
- **task-dependencies.md** - Quality gate dependencies
