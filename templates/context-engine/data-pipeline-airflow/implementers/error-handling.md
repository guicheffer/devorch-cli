---
domain: error-handling
description: Error handling, failure callbacks, retries, and Slack alerting patterns
---

# Error Handling

Implement robust error handling with failure callbacks, retry strategies, and Slack alerting for Airflow data pipelines.

## Core Patterns

### 1. Default Failure Alert Callback

**Pattern:** Use default_failure_alert callback for Slack notifications on task failures.

**Example from PR #1934:**
```python
from utils.slack.callbacks import default_failure_alert

default_args = {
    "owner": cm.read("dag.owner"),
    "email": cm.read("dag.email"),
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "email_on_retry": False,
    "email_on_failure": False,
    "depends_on_past": False,
    "on_failure_callback": default_failure_alert,  # Slack alert on failure
    "weight_rule": "absolute",
    "priority_weight": 2,
}
```

**Frequency:** 96% of DAGs use default_failure_alert

### 2. Retry Configuration

**Pattern:** Configure retries with exponential backoff for transient failures.

**Example:**
```python
default_args = {
    "retries": 3,  # Retry up to 3 times
    "retry_delay": timedelta(minutes=5),  # Wait 5 minutes between retries
    "retry_exponential_backoff": True,  # Exponential backoff
    "max_retry_delay": timedelta(hours=1),  # Max 1 hour delay
}
```

**Frequency:** 96% of DAGs configure retries

### 3. Execution Timeout

**Pattern:** Set execution timeouts to prevent hung tasks.

**Example:**
```python
process_data = spark_job_submit(
    config=cm,
    dag=dag,
    livy_conn_id=livy_conn_id,
    entry_point=cm.read("entrypoint_path"),
    task_id="process_data",
    execution_timeout=timedelta(hours=4),  # Kill if runs longer than 4 hours
)
```

**Frequency:** 68% of long-running tasks set timeouts

### 4. Custom Failure Callbacks

**Pattern:** Implement custom callbacks for specific error handling.

**Example:**
```python
def custom_failure_callback(context):
    """Custom failure handler with detailed logging"""
    dag_id = context['dag'].dag_id
    task_id = context['task_instance'].task_id
    execution_date = context['execution_date']
    error = context.get('exception')

    # Log detailed error info
    logger.error(f"Task {task_id} in DAG {dag_id} failed")
    logger.error(f"Execution date: {execution_date}")
    logger.error(f"Error: {error}")

    # Send to monitoring system
    send_to_datadog(dag_id, task_id, error)

    # Call default Slack alert
    default_failure_alert(context)

default_args = {
    "on_failure_callback": custom_failure_callback,
}
```

**Frequency:** 28% of DAGs use custom callbacks

### 5. Task-Level Error Handling

**Pattern:** Handle errors within task logic for graceful degradation.

**Example:**
```python
from airflow.exceptions import AirflowSkipException

def process_with_error_handling(**context):
    """Process data with error handling"""
    try:
        data = fetch_data(context['ds'])

        if not data:
            # Skip task if no data
            raise AirflowSkipException("No data available for processing")

        process_data(data)

    except DataValidationError as e:
        # Log validation errors but don't fail task
        logger.warning(f"Data validation error: {e}")
        log_validation_error(e)

    except Exception as e:
        # Log unexpected errors and fail task
        logger.error(f"Unexpected error: {e}")
        raise

process_task = PythonOperator(
    task_id="process_with_error_handling",
    python_callable=process_with_error_handling,
)
```

**Frequency:** 40% of custom operators implement error handling

## Related Implementers

- **dag-definition.md** - Default args configuration
- **task-dependencies.md** - Error recovery patterns
- **spark-operators.md** - Spark job error handling
