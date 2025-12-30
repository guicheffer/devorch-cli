---
domain: dbt-integration
description: dbt integration with Cosmos for SQL transformation workflows in Airflow
---

# dbt Integration

Integrate dbt (data build tool) with Airflow using Astronomer Cosmos for SQL-based transformation workflows.

## Core Patterns

### 1. Cosmos dbt TaskGroup

**Pattern:** Use Cosmos to run dbt models as Airflow tasks.

**Example:**
```python
from cosmos import DbtDag, ProjectConfig, ProfileConfig, ExecutionConfig
from cosmos.profiles import SnowflakeUserPasswordProfileMapping

with dag:
    # dbt project configuration
    profile_config = ProfileConfig(
        profile_name="marketing_analytics",
        target_name="prod",
        profile_mapping=SnowflakeUserPasswordProfileMapping(
            conn_id="snowflake_default",
            profile_args={
                "database": "ANALYTICS",
                "schema": "MARKETING",
            },
        ),
    )

    project_config = ProjectConfig(
        dbt_project_path="/usr/local/airflow/dbt/marketing_analytics",
    )

    execution_config = ExecutionConfig(
        dbt_executable_path="/usr/local/bin/dbt",
    )

    # Run dbt models
    dbt_models = DbtTaskGroup(
        group_id="dbt_transformations",
        project_config=project_config,
        profile_config=profile_config,
        execution_config=execution_config,
        operator_args={"install_deps": True},
    )

    # Dependency chain
    extract_data >> dbt_models >> data_quality_check
```

**Frequency:** 12% of transformation DAGs use dbt

### 2. dbt Model Selection

**Pattern:** Run specific dbt models or tags using selectors.

**Example:**
```python
# Run specific models
dbt_conversions = DbtTaskGroup(
    group_id="dbt_conversions",
    project_config=project_config,
    profile_config=profile_config,
    select=["tag:conversions", "path:models/conversions"],
    exclude=["tag:deprecated"],
)

# Run tests only
dbt_tests = DbtTaskGroup(
    group_id="dbt_tests",
    project_config=project_config,
    profile_config=profile_config,
    test_behavior="after_all",
)
```

**Frequency:** 80% of dbt DAGs use model selection

### 3. dbt with Upstream Dependencies

**Pattern:** Chain dbt transformations after data extraction.

**Example:**
```python
with dag:
    # Extract raw data
    extract = spark_job_submit(
        config=cm,
        dag=dag,
        entry_point="extract_raw_data",
        task_id="extract_raw",
    )

    # Transform with dbt
    dbt_transform = DbtTaskGroup(
        group_id="dbt_transform",
        project_config=project_config,
        profile_config=profile_config,
    )

    # Load to warehouse
    load_warehouse = reload_partition_snowflake_delta(
        cm=cm,
        task_id="load_warehouse",
    )

    extract >> dbt_transform >> load_warehouse
```

**Frequency:** 100% of dbt DAGs have upstream dependencies

## Related Implementers

- **data-warehouse-integration.md** - dbt with Snowflake
- **task-dependencies.md** - dbt task orchestration
- **data-quality.md** - dbt tests integration
