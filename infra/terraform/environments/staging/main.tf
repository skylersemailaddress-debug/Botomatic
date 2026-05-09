module "runtime_spine" {
  source = "../../modules/runtime-spine"

  environment = "staging"
  tenant_mode = "isolated"
  runtime_image = "botomatic/runtime-spine:staging"
  worker_image = "botomatic/runtime-worker:staging"
}
