# Terraform and Kubernetes Structure

## Purpose

Define the infrastructure structure for Botomatic runtime-spine deployment assets.

## Terraform Structure

```text
infra/
  terraform/
    environments/
      development/
      staging/
      production/

    modules/
      runtime-api/
      runtime-workers/
      postgres/
      redis/
      observability/
      secrets/
```

## Kubernetes Structure

```text
infra/
  kubernetes/
    base/
      runtime-api/
      runtime-workers/
      deployment-executors/
      observability/

    overlays/
      development/
      staging/
      production/
```

## Required Runtime Deployments

- orchestration runtime API
- distributed worker fleet
- validator workers
- deployment executors
- observability collectors

## Required Infrastructure Policies

- least privilege
- immutable deployment images
- network isolation
- tenant-safe defaults
- rollout rollback support
- autoscaling governance

## Required Future Integrations

- GitHub Actions deployment promotion
- ArgoCD/GitOps integration
- policy-as-code enforcement
- secret rotation automation

## Exit Criteria

Infrastructure structure planning exits only when:

- terraform modules exist
- kubernetes manifests exist
- environment overlays exist
- deployment promotion exists
- rollback deployment exists
