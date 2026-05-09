# Runtime Spine Terraform Module

## Purpose

Provision the core Botomatic runtime-spine infrastructure.

## Target Resources

- orchestration runtime service
- distributed worker service
- validator worker service
- deployment executor service
- redis queue
- postgres runtime persistence
- observability collector
- runtime secrets

## Required Inputs

```text
environment
tenant_mode
runtime_image
worker_image
postgres_config
redis_config
observability_config
```

## Required Outputs

```text
runtime_api_url
worker_service_name
redis_endpoint
postgres_endpoint
observability_endpoint
```

## Governance Requirements

- least-privilege IAM
- environment-specific isolation
- rollbackable changes
- traceable deployment ownership
- secret references only; no raw secrets

## Status

```text
scaffold only
```
