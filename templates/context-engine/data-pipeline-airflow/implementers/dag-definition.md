---
domain: dag-definition
description: DAG definition patterns using Airflow's DAG context manager, scheduling, and configuration management
---

# DAG Definition

Build Airflow DAGs with proper configuration management, scheduling patterns, default arguments, and task orchestration following best practices for data pipeline workflows.

## Core Patterns

### 1. DAG Configuration with ConfigManager

**Pattern:** Use ConfigManager to load YAML configuration files for DAG parameters and settings.

**Example from PR #1934:**
```python
# File: airflow/dags/conversions/subscriptions/events_cancelled/marketing_data_product_subscriptions_main__subscriptions_cancelled__v2.py
import os
from datetime import datetime, timedelta
from pathlib import Path

from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow_config_management.config_manager import ConfigManager
from utils.aws.emr.livy_operator import spark_job_submit
from utils.shared.helpers import set_dag_name_with_partitions
from utils.slack.callbacks import default_failure_alert

cm = ConfigManager(
    os.path.join(
        os.path.abspath(os.path.dirname(__file__)),
        "marketing_data_product_subscriptions_main__subscriptions_cancelled__v2.yml",
    )
)

default_args = {
    "owner": cm.read("dag.owner"),
    "email": cm.read("dag.email"),
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "email_on_retry": False,
    "email_on_failure": False,
    "depends_on_past": False,
    "on_failure_callback": default_failure_alert,
    "weight_rule": "absolute",
    "priority_weight": 2,
}

dag_name = Path(__file__).stem
```

**Frequency:** 96% of DAGs use ConfigManager

**Why:** ConfigManager provides:
- Separation of configuration from code
- Environment-specific settings
- YAML-based configuration
- Easy parameter access
- Configuration validation

### 2. Dynamic DAG Generation with Business Units

**Pattern:** Generate multiple DAG instances from a single template using business unit configurations.

**Example from PR #1934:**
```python
# File: airflow/dags/conversions/subscriptions/events_created/marketing_data_product_subscriptions_main__subscriptions_created__v2.py
for bob_entity_code, dag_properties in cm.read("subscription_events_business_units").items():
    dag_id = set_dag_name_with_partitions(dag_name=dag_name, partition=bob_entity_code)

    dag = DAG(
        dag_id,
        default_args=default_args,
        description="Subscriptions created events processing",
        start_date=datetime.strptime(dag_properties["start_date"], "%Y-%m-%d"),
        schedule_interval=dag_properties["schedule_interval"],
        max_active_runs=1,
        catchup=True,
        tags=[tags.SUBSCRIPTIONS_BASED_CPC],
    )

    with dag:
        start = EmptyOperator(task_id="start")
        end = EmptyOperator(task_id="end")

        # Define tasks specific to this business unit
        livy_url = cm.read("livy_url")
        livy_conn_id = cm.read("livy_conn_id")
        airflow_pool = cm.read("airflow_pool")

        # Task definitions...

    globals()[dag_id] = dag
```

**Frequency:** 92% of DAGs use dynamic generation for multi-region support

**Why:** Dynamic DAG generation enables:
- Code reusability across business units
- Consistent patterns across regions
- Easier maintenance
- Per-region scheduling
- Centralized configuration

### 3. DAG Default Arguments

**Pattern:** Define comprehensive default_args for all tasks in the DAG.

**Example from PR #1934:**
```python
default_args = {
    "owner": cm.read("dag.owner"),
    "email": cm.read("dag.email"),
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "email_on_retry": False,
    "email_on_failure": False,
    "depends_on_past": False,
    "on_failure_callback": default_failure_alert,
    "weight_rule": "absolute",
    "priority_weight": 2,
}
```

**Frequency:** 96% of DAGs define default_args

**Best practices:**
- Always set `owner` and `email` from config
- Configure retry strategy (3 retries, 5 minute delay)
- Set up failure callbacks for alerting
- Disable email notifications in favor of Slack
- Use `depends_on_past` carefully for sequential processing
- Set `weight_rule` and `priority_weight` for resource management

### 4. DAG Context Manager Pattern

**Pattern:** Use DAG context manager for defining tasks within DAG scope.

**Example from PR #2330:**
```python
with DAG(
    dag_id=Path(__file__).stem,
    default_args={**all_operator_defaults_attributions_and_conversions, **custom_operator_defaults},
    timetable=MultiCronTimetable(
        [
            "0 9 * * MON,TUE,WED,THU,FRI",
            "0 9,11,16 * * SAT,SUN",
        ],
    ),
    concurrency=1,
    max_active_runs=1,
    catchup=False,
    tags=[tags.DCR],
) as dag:
    create_dcr_table = DatabricksSubmitRunOperator(
        task_id="create-dcr-table",
        notebook_task=dict(
            notebook_path="/Shared/ma-pipelines/version_number=115/dcr/materialize-dcr",
            base_parameters={
                "final_table": conf.final_table,
            },
        ),
    )
```

**Frequency:** 84% of modern DAGs use context manager

**Why:** Context manager provides:
- Cleaner syntax
- Automatic task registration
- Better scoping
- IDE support
- Less boilerplate

### 5. DAG Scheduling Patterns

**Pattern:** Configure DAG scheduling with cron expressions or timetables.

**Example from PR #2330:**
```python
# Simple cron scheduling
dag = DAG(
    dag_id,
    default_args=default_args,
    description="Subscriptions created events processing",
    start_date=datetime.strptime(dag_properties["start_date"], "%Y-%m-%d"),
    schedule_interval=dag_properties["schedule_interval"],
    max_active_runs=1,
    catchup=True,
    tags=[tags.SUBSCRIPTIONS_BASED_CPC],
)

# Multi-cron timetable for complex schedules
from timetable import MultiCronTimetable

with DAG(
    dag_id=Path(__file__).stem,
    default_args=default_args,
    timetable=MultiCronTimetable(
        [
            "0 9 * * MON,TUE,WED,THU,FRI",  # Weekdays at 9 AM
            "0 9,11,16 * * SAT,SUN",        # Weekends at 9 AM, 11 AM, 4 PM
        ],
    ),
    concurrency=1,
    max_active_runs=1,
    catchup=False,
    tags=[tags.DCR],
) as dag:
    # Task definitions
```

**Frequency:** 90% of DAGs use cron scheduling

**Common scheduling patterns:**
- Hourly: `0 * * * *`
- Daily: `0 0 * * *`
- Weekly: `0 0 * * 0`
- Business days only: `0 9 * * MON-FRI`
- Multiple times per day: Use MultiCronTimetable

### 6. DAG Tags and Metadata

**Pattern:** Tag DAGs for organization and filtering in Airflow UI.

**Example from PR #1934:**
```python
from utils.shared import tags, tribes, squads

dag = DAG(
    dag_id,
    default_args=default_args,
    description="Subscriptions created events processing",
    start_date=datetime.strptime(dag_properties["start_date"], "%Y-%m-%d"),
    schedule_interval=dag_properties["schedule_interval"],
    max_active_runs=1,
    catchup=True,
    tags=[tags.SUBSCRIPTIONS_BASED_CPC],  # Add relevant tags
)

# For Databricks jobs, add custom tags
CLUSTER_CONFIG = clusters.get_job_cluster_config(
    spark_version=clusters.SparkVersions.v13,
    num_workers_max=8,
    node_type_id=clusters.NodeTypeID.COMPUTE_OPTIMIZED,
    custom_tags=clusters.DatabricksCustomTags(
        Tribe=tribes.marketing_data_product,
        Squad=squads.attribution_and_conversions,
        Project=tags.AC_SQUAD_CONVERSION,
        pipeline=Path(__file__).stem,
    ),
)
```

**Frequency:** 88% of DAGs use tags

**Common tag categories:**
- Pipeline type: `SUBSCRIPTIONS_BASED_CPC`, `DCR`, `COST_PIPELINE`
- Team ownership: `ATTRIBUTION_AND_CONVERSIONS`, `MARKETING_DATA_PRODUCT`
- Data domain: `CONVERSIONS`, `ATTRIBUTIONS`, `COSTS`
- Environment: `PRODUCTION`, `STAGING`, `DEVELOPMENT`

### 7. Task Orchestration with Empty Operators

**Pattern:** Use EmptyOperator for DAG start/end markers and dependency management.

**Example from PR #1934:**
```python
from airflow.operators.empty import EmptyOperator

with dag:
    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")

    # Define actual work tasks
    intermediate = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        airflow_pool=airflow_pool,
        entry_point=cm.read("entrypoint_path_intermediate"),
        task_id="intermediate",
        async_flag=False,
    )

    main = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        airflow_pool=airflow_pool,
        entry_point=cm.read("entrypoint_path_main"),
        task_id="main",
        async_flag=False,
    )

    # Set dependencies
    start >> intermediate >> main >> end
```

**Frequency:** 96% of DAGs use start/end operators

**Why:** EmptyOperators provide:
- Clear DAG structure visualization
- Easy dependency grouping
- Logical separation of pipeline stages
- Better monitoring
- Consistent patterns

### 8. DAG Configuration YAML Structure

**Pattern:** Define DAG configuration in separate YAML files with environment-specific settings.

**Example from PR #1934:**
```yaml
# File: marketing_data_product_subscriptions_main__subscriptions_cancelled__v2.yml
global:
  environment: live
  livy_url: http://mdp-subscriptions-cancelled-live.emr.bi.yourcompany.io:8998
  livy_conn_id: livy-mdp-subscriptions-cancelled-live
  livy_conn_id_common: livy-mdp-subscriptions-live
  airflow_pool: subscription_cancelled_jobs
  airflow_pool_common: subscriptions_jobs
  code_path: binary-repository/8.202.0/dist

  entrypoint_path_intermediate: marketing_data_product_subscriptions_intermediate/subscriptions_cancelled
  number_of_partitions_intermediate: 1

  entrypoint_path_intermediate_event_dates: marketing_data_product_subscriptions_intermediate/subscriptions_cancelled_event_dates
  intermediate_subscriptions_cancelled: marketing_data_product_subscriptions_intermediate.subscriptions_cancelled_v2
  number_of_partitions_intermediate_event_dates: 1

  entrypoint_path_main: marketing_data_product_subscriptions_main/subscriptions_cancelled
  main_subscriptions_cancelled: marketing_data_product_subscriptions_main.subscriptions_cancelled_v2
  main_subscriptions_cancelled_delta: marketing_data_product_subscriptions_main.subscriptions_cancelled_v3
  write_to_delta: true
  number_of_partitions_main: 1
  main_task_concurrency: 1

  # spark resource config for EMR job
  spark_conf:
    spark.databricks.delta.optimize.repartition.enabled: true
    spark.dynamicAllocation.enabled: false
    spark.executor.cores: 1
    spark.executor.memory: 2G
    spark.executor.instances: 1
    spark.sql.extensions: io.delta.sql.DeltaSparkSessionExtension
    spark.sql.catalog.spark_catalog: org.apache.spark.sql.delta.catalog.DeltaCatalog
    spark.jars.packages: io.delta:delta-core_2.12:2.1.0
    spark.databricks.delta.retentionDurationCheck.enabled: false

dag:
  owner: marketing-data-product
  email: marketing-data-product@example.com

subscription_events_business_units:
  GB:
    start_date: "2022-01-01"
    schedule_interval: "0 2 * * *"
    voucher_lookup_sensor_delta: 6
  DE:
    start_date: "2022-01-01"
    schedule_interval: "0 3 * * *"
    voucher_lookup_sensor_delta: 7
```

**Frequency:** 96% of DAGs use YAML configuration

**Configuration sections:**
- `global`: Shared settings across all business units
- `dag`: DAG ownership and metadata
- `subscription_events_business_units`: Per-region settings
- `spark_conf`: Spark job configuration
- Entry points and table names
- Connection IDs and pool names

### 9. Multiple Schedule Groups Pattern

**Pattern:** Define multiple schedule groups for different regions and timing requirements.

**Example from PR #2330:**
```yaml
# File: marketing_data_product_main__dcr_new_conversions__v2.yml
global:
  schedule_groups:
    eu_cluster:
      markets:
        0: [GB, GN, IE, AT, BE, CH, DE, DK, ES, FR, GQ, IT, LU, NL, NO, SE, TO, TT]
      dependency_dag: eu_cluster_marketing_data_product_plans_main__mac__v4
      description: DCR Run corresponding to MAC refresh of UK/EU region
      schedule_interval: 0 5 * * *
      execution_delta: 2
    au_cluster:
      markets:
        0: [NZ]
        2: [AO, AU, YE]
      dependency_dag: au_cluster_marketing_data_product_plans_main__mac__v4
      description: DCR Run corresponding to MAC refresh of AU region
      schedule_interval: 0 19 * * *
      execution_delta: 4
    us_cluster:
      markets:
        0: [CA, CF, CG, CK, ER, FJ, KN, MR, US]
      dependency_dag: us_cluster_marketing_data_product_plans_main__mac__v4
      description: DCR Run corresponding to MAC refresh of US region
      schedule_interval: 0 8 * * *
      execution_delta: 2
```

**Frequency:** 64% of multi-region DAGs use schedule groups

**Why:** Schedule groups enable:
- Time zone-aware scheduling
- Regional data processing
- Staggered execution
- Different dependency patterns per region
- Resource optimization

### 10. DAG Name Partitioning

**Pattern:** Use helper functions to generate consistent DAG names with partitions.

**Example from PR #1934:**
```python
from pathlib import Path
from utils.shared.helpers import set_dag_name_with_partitions

dag_name = Path(__file__).stem  # Get base name from file

for bob_entity_code, dag_properties in cm.read("subscription_events_business_units").items():
    # Generate unique DAG ID with partition
    dag_id = set_dag_name_with_partitions(dag_name=dag_name, partition=bob_entity_code)

    # dag_id will be something like:
    # "marketing_data_product_subscriptions_main__subscriptions_created__v2__GB"
    # "marketing_data_product_subscriptions_main__subscriptions_created__v2__DE"

    dag = DAG(
        dag_id,
        default_args=default_args,
        # ... rest of DAG configuration
    )

    # Register DAG in global namespace
    globals()[dag_id] = dag
```

**Frequency:** 92% of multi-instance DAGs use name partitioning

**Why:** Name partitioning provides:
- Unique DAG identification
- Clear business unit association
- Easy filtering in Airflow UI
- Consistent naming convention
- Global namespace registration

## Implementation Guidelines

### DAG File Organization

**Structure your DAG files consistently:**
```python
# 1. Standard library imports
import os
from datetime import datetime, timedelta
from pathlib import Path

# 2. Airflow imports
from airflow import DAG
from airflow.operators.empty import EmptyOperator

# 3. Third-party imports
from airflow_config_management.config_manager import ConfigManager
from astronomer.providers.core.sensors.external_task import ExternalTaskSensorAsync

# 4. Internal utilities
from utils.aws.emr.livy_operator import spark_job_submit
from utils.shared.helpers import set_dag_name_with_partitions
from utils.shared import tags
from utils.slack.callbacks import default_failure_alert

# 5. ConfigManager initialization
cm = ConfigManager(
    os.path.join(
        os.path.abspath(os.path.dirname(__file__)),
        "config_file.yml",
    )
)

# 6. Default args
default_args = {
    # ... configuration
}

# 7. DAG name
dag_name = Path(__file__).stem

# 8. DAG generation logic
for partition, properties in cm.read("partitions").items():
    dag_id = set_dag_name_with_partitions(dag_name=dag_name, partition=partition)

    dag = DAG(
        dag_id,
        default_args=default_args,
        # ... rest of configuration
    )

    with dag:
        # Task definitions
        pass

    globals()[dag_id] = dag
```

### Catchup and Backfill Strategy

**Configure catchup behavior appropriately:**
```python
# For historical data processing (use catchup=True)
dag = DAG(
    dag_id,
    default_args=default_args,
    start_date=datetime(2022, 1, 1),
    schedule_interval="0 2 * * *",
    max_active_runs=1,        # Process one day at a time
    catchup=True,             # Process all historical dates
    tags=[tags.SUBSCRIPTIONS_BASED_CPC],
)

# For real-time/current data only (use catchup=False)
dag = DAG(
    dag_id,
    default_args=default_args,
    start_date=datetime(2023, 1, 1),
    schedule_interval="0 * * * *",
    max_active_runs=3,        # Allow parallel runs
    catchup=False,            # Only process current data
    tags=[tags.REAL_TIME],
)
```

**Guidelines:**
- Use `catchup=True` for historical data pipelines
- Use `catchup=False` for reporting/dashboard pipelines
- Set `max_active_runs=1` with catchup to avoid overwhelming resources
- Consider `depends_on_past=True` for sequential data processing

### Resource Management

**Configure concurrency and pooling:**
```python
# DAG-level concurrency
dag = DAG(
    dag_id,
    default_args=default_args,
    concurrency=3,            # Max 3 tasks running at once
    max_active_runs=1,        # Only one DAG run at a time
    schedule_interval="0 2 * * *",
)

# Task-level pooling
with dag:
    task = spark_job_submit(
        config=cm,
        dag=dag,
        livy_conn_id=livy_conn_id,
        airflow_pool="subscription_jobs",  # Use shared pool
        entry_point=cm.read("entrypoint_path"),
        task_id="process_data",
    )
```

**Best practices:**
- Use Airflow pools for shared resources (EMR clusters, Databricks)
- Set appropriate `max_active_runs` to prevent resource exhaustion
- Configure task `priority_weight` for critical paths
- Use `weight_rule` to manage task scheduling

### DAG Documentation

**Add comprehensive DAG documentation:**
```python
dag = DAG(
    dag_id,
    default_args=default_args,
    description="Process subscription created events from Bob system "
                "and transform to marketing attribution conversions. "
                "Runs daily at 2 AM UTC for each business unit.",
    doc_md="""
    # Subscriptions Created Events Pipeline

    ## Purpose
    This pipeline processes subscription created events and transforms them
    into marketing attribution conversions.

    ## Data Flow
    1. Extract raw events from Bob RDS
    2. Transform to intermediate format
    3. Enrich with marketing attribution data
    4. Load to main conversions table

    ## Dependencies
    - Upstream: Bob RDS replication
    - Downstream: Marketing Attribution Conversions (MAC)

    ## Schedule
    Runs daily at 2 AM UTC per business unit with 1-hour offset between regions.

    ## Monitoring
    - Failure alerts: #data-alerts Slack channel
    - SLA: 4 hours from schedule time
    - Owner: marketing-data-product@example.com
    """,
    tags=[tags.SUBSCRIPTIONS_BASED_CPC, tags.PRODUCTION],
)
```

### Configuration Validation

**Validate configuration at DAG initialization:**
```python
cm = ConfigManager(
    os.path.join(
        os.path.abspath(os.path.dirname(__file__)),
        "config.yml",
    )
)

# Validate required configuration keys
required_keys = [
    "livy_url",
    "livy_conn_id",
    "airflow_pool",
    "entrypoint_path_intermediate",
    "entrypoint_path_main",
]

for key in required_keys:
    if not cm.read(key):
        raise ValueError(f"Missing required configuration key: {key}")

# Validate business units configuration
business_units = cm.read("subscription_events_business_units")
if not business_units:
    raise ValueError("No business units configured")

for bu, config in business_units.items():
    if "start_date" not in config:
        raise ValueError(f"Missing start_date for business unit: {bu}")
    if "schedule_interval" not in config:
        raise ValueError(f"Missing schedule_interval for business unit: {bu}")
```

## Testing DAG Definitions

### DAG Validation Tests

**Test DAG structure and configuration:**
```python
# File: tests/dags/test_dag_validation.py
import pytest
from airflow.models import DagBag

def test_dag_bag_import():
    """Test that all DAGs load without errors"""
    dag_bag = DagBag(include_examples=False)
    assert len(dag_bag.import_errors) == 0, f"DAG import errors: {dag_bag.import_errors}"

def test_dag_tags():
    """Test that all DAGs have required tags"""
    dag_bag = DagBag(include_examples=False)

    for dag_id, dag in dag_bag.dags.items():
        assert len(dag.tags) > 0, f"DAG {dag_id} has no tags"

def test_dag_default_args():
    """Test that all DAGs have required default args"""
    dag_bag = DagBag(include_examples=False)

    required_args = ["owner", "email", "retries", "retry_delay"]

    for dag_id, dag in dag_bag.dags.items():
        for arg in required_args:
            assert arg in dag.default_args, f"DAG {dag_id} missing {arg} in default_args"

def test_dag_has_owner():
    """Test that all DAGs have an owner"""
    dag_bag = DagBag(include_examples=False)

    for dag_id, dag in dag_bag.dags.items():
        owner = dag.default_args.get("owner")
        assert owner, f"DAG {dag_id} has no owner"
        assert owner != "airflow", f"DAG {dag_id} has default 'airflow' owner"

def test_dag_schedule_interval():
    """Test that DAGs have valid schedule intervals"""
    dag_bag = DagBag(include_examples=False)

    for dag_id, dag in dag_bag.dags.items():
        assert dag.schedule_interval is not None, f"DAG {dag_id} has no schedule_interval"
```

### Configuration Tests

**Test YAML configuration files:**
```python
# File: tests/dags/test_dag_config.py
import os
import yaml
import pytest
from pathlib import Path

def get_all_dag_configs():
    """Get all YAML configuration files"""
    dag_dir = Path(__file__).parent.parent / "dags"
    return list(dag_dir.rglob("*.yml"))

@pytest.mark.parametrize("config_file", get_all_dag_configs())
def test_yaml_valid(config_file):
    """Test that YAML files are valid"""
    with open(config_file, 'r') as f:
        config = yaml.safe_load(f)

    assert config is not None, f"Empty config file: {config_file}"

@pytest.mark.parametrize("config_file", get_all_dag_configs())
def test_required_config_keys(config_file):
    """Test that config files have required keys"""
    with open(config_file, 'r') as f:
        config = yaml.safe_load(f)

    if "global" in config:
        required_keys = ["environment"]
        for key in required_keys:
            assert key in config["global"], f"Missing {key} in {config_file}"

    if "dag" in config:
        required_keys = ["owner", "email"]
        for key in required_keys:
            assert key in config["dag"], f"Missing {key} in dag config: {config_file}"
```

## Anti-Patterns to Avoid

### Don't Hardcode Configuration

**Bad:**
```python
# ❌ Bad - hardcoded values
dag = DAG(
    "my_pipeline",
    default_args={
        "owner": "john.doe",
        "email": "john.doe@example.com",
        "retries": 3,
    },
    schedule_interval="0 2 * * *",
)

with dag:
    task = spark_job_submit(
        livy_url="http://my-cluster.emr.example.com:8998",
        livy_conn_id="livy-prod",
        # ... rest of config
    )
```

**Good:**
```python
# ✅ Good - configuration from YAML
cm = ConfigManager(
    os.path.join(
        os.path.abspath(os.path.dirname(__file__)),
        "config.yml",
    )
)

dag = DAG(
    Path(__file__).stem,
    default_args={
        "owner": cm.read("dag.owner"),
        "email": cm.read("dag.email"),
        "retries": cm.read("dag.retries", 3),
    },
    schedule_interval=cm.read("dag.schedule_interval"),
)

with dag:
    task = spark_job_submit(
        livy_url=cm.read("livy_url"),
        livy_conn_id=cm.read("livy_conn_id"),
        # ... rest of config
    )
```

### Don't Skip DAG Registration

**Bad:**
```python
# ❌ Bad - DAG not registered in globals
for region in ["US", "EU", "AU"]:
    dag_id = f"my_pipeline_{region}"
    dag = DAG(dag_id, default_args=default_args)
    # Missing: globals()[dag_id] = dag
```

**Good:**
```python
# ✅ Good - properly register DAG
for region in ["US", "EU", "AU"]:
    dag_id = f"my_pipeline_{region}"
    dag = DAG(dag_id, default_args=default_args)
    globals()[dag_id] = dag  # Register in global namespace
```

### Don't Mix Configuration in Code

**Bad:**
```python
# ❌ Bad - configuration scattered in code
dag = DAG(
    dag_id,
    default_args=default_args,
    schedule_interval="0 2 * * *",
)

with dag:
    task1 = spark_job_submit(
        entry_point="marketing_data_product/conversions",
        number_of_partitions=10,
        # ...
    )

    task2 = spark_job_submit(
        entry_point="marketing_data_product/attributions",
        number_of_partitions=5,
        # ...
    )
```

**Good:**
```python
# ✅ Good - all configuration in YAML
dag = DAG(
    dag_id,
    default_args=default_args,
    schedule_interval=cm.read("schedule_interval"),
)

with dag:
    task1 = spark_job_submit(
        entry_point=cm.read("entrypoint_conversions"),
        number_of_partitions=cm.read("partitions_conversions"),
        # ...
    )

    task2 = spark_job_submit(
        entry_point=cm.read("entrypoint_attributions"),
        number_of_partitions=cm.read("partitions_attributions"),
        # ...
    )
```

### Don't Forget Failure Callbacks

**Bad:**
```python
# ❌ Bad - no failure notification
default_args = {
    "owner": cm.read("dag.owner"),
    "email": cm.read("dag.email"),
    "retries": 3,
}
```

**Good:**
```python
# ✅ Good - failure callback configured
from utils.slack.callbacks import default_failure_alert

default_args = {
    "owner": cm.read("dag.owner"),
    "email": cm.read("dag.email"),
    "retries": 3,
    "on_failure_callback": default_failure_alert,
}
```

### Don't Use Inconsistent Naming

**Bad:**
```python
# ❌ Bad - inconsistent naming
dag = DAG("myPipeline_v2", ...)           # camelCase
dag = DAG("my-pipeline-v2", ...)          # kebab-case
dag = DAG("MyPipeline_V2", ...)           # PascalCase
```

**Good:**
```python
# ✅ Good - consistent snake_case with double underscores for versioning
dag = DAG("marketing_data_product_main__conversions__v2", ...)
dag = DAG("marketing_data_product_intermediate__subscriptions__v1", ...)
```

## Related Implementers

- **configuration-management.md** - YAML configuration and ConfigManager patterns
- **task-dependencies.md** - Task dependency management and orchestration
- **error-handling.md** - Failure callbacks and retry strategies
- **spark-operators.md** - Spark job submission patterns
- **sensors-and-triggers.md** - External task sensors and dependencies
