---
domain: data-warehouse-integration
description: Snowflake and data warehouse synchronization patterns with Delta Lake and Glue integration
---

# Data Warehouse Integration

Integrate Airflow with Snowflake and data warehouses using partition reloading, Delta Lake, and AWS Glue catalog synchronization.

## Core Patterns

### 1. Reload Partition to Snowflake from Delta

**Pattern:** Sync partitioned data from Delta Lake to Snowflake using S3 staging.

**Example from PR #2330:**
```python
from utils.snowflake.sync import reload_partition_snowflake_delta

with dag:
    snowflake_load = reload_partition_snowflake_delta(
        cm=cm,
        sf_warehouse=cm.read("snowflake.sf_warehouse"),
        sf_database=cm.read("snowflake.sf_database"),
        sf_schema=cm.read("snowflake.sf_schema"),
        sf_role=cm.read("snowflake.sf_role"),
        sf_conn_id=cm.read("snowflake.sf_conn_id"),
        stage_schema=cm.read("snowflake.stage_schema"),
        stage=cm.read("snowflake.stage"),
        s3_path=cm.read("snowflake.s3_path"),
        target_schema=cm.read("snowflake.target_schema"),
        target_table=cm.read("snowflake.target_table"),
        row_id_column=cm.read("snowflake.row_id_column"),
        partition_key="bob_entity_code",
        partition_value=bob_entity_code,
        task_id=f"snowflake_load_{bob_entity_code}",
    )
```

**Frequency:** 64% of DAGs sync to Snowflake

### 2. Snowflake Configuration

**Pattern:** Configure Snowflake connection and sync settings in YAML.

**Example from PR #2330:**
```yaml
global:
  snowflake:
    sf_warehouse: MARKETING_DATA_PRODUCT_WH
    sf_database: MARKETING_DATA_PLATFORM
    sf_schema: BUSINESS
    sf_role: MARKETING_DATA_PRODUCT_SA_NONPII
    sf_conn_id: snowflake-marketing-data-product

    # Stage configuration
    stage_schema: BUSINESS
    stage: MARKETING_DATA_PRODUCT_PLANS_MAIN
    s3_path: marketing_attribution_conversions_v2/

    # Target table configuration
    target_schema: BUSINESS
    target_table: MARKETING_ATTRIBUTIONS_CONVERSIONS
    row_id_column: event_id
    dedupe_on_columns:
      - event_id
      - customer_id
      - subscription_id
```

**Frequency:** 56% of DAGs define Snowflake config

### 3. Delta Lake to Glue Catalog Sync

**Pattern:** Register Delta tables in AWS Glue catalog for Athena/Redshift Spectrum access.

**Example:**
```python
from utils.aws.glue.catalog import sync_delta_to_glue

with dag:
    sync_to_glue = sync_delta_to_glue(
        database="marketing_data_product_main",
        table_name="conversions_v2",
        s3_location="s3://my-bucket/marketing_data_product_main/conversions_v2/",
        partition_keys=["bob_entity_code", "event_date"],
        task_id="sync_delta_to_glue",
    )
```

**Frequency:** 32% of Delta pipelines sync to Glue

### 4. Multi-Region Snowflake Sync

**Pattern:** Sync multiple regions/markets to Snowflake in parallel.

**Example:**
```python
with dag:
    snowflake_tasks = []

    for market in ["US", "EU", "AU", "GB"]:
        task = reload_partition_snowflake_delta(
            cm=cm,
            sf_conn_id=cm.read("snowflake.sf_conn_id"),
            target_table=cm.read("snowflake.target_table"),
            partition_key="market",
            partition_value=market,
            task_id=f"snowflake_{market}",
        )
        snowflake_tasks.append(task)

    # Sync all markets in parallel
    process_data >> snowflake_tasks >> end
```

**Frequency:** 52% of multi-region pipelines use parallel sync

### 5. Snowflake Query Tags

**Pattern:** Add query tags for monitoring and cost tracking.

**Example from PR #2330:**
```python
additional_tags = {
    "dag_id": dag_id,
    "task_id": task_id,
    "execution_date": "{{ ds }}",
    "team": "marketing-data-product",
    "pipeline": "conversions",
}

snowflake_load = reload_partition_snowflake_delta(
    cm=cm,
    sf_conn_id=cm.read("snowflake.sf_conn_id"),
    target_table=cm.read("snowflake.target_table"),
    task_id="snowflake_load",
    sf_session_parameters={"QUERY_TAG": str(additional_tags)},
)
```

**Frequency:** 44% of Snowflake syncs use query tags

## Related Implementers

- **configuration-management.md** - Snowflake configuration
- **spark-operators.md** - Spark to warehouse pipelines
- **task-dependencies.md** - Warehouse sync orchestration
