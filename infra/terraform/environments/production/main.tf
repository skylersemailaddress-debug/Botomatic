module "runtime_spine" {
  source = "../../modules/runtime-spine"

  environment = "production"
  tenant_mode = "isolated"
  runtime_image = "botomatic/runtime-spine:production"
  worker_image = "botomatic/runtime-worker:production"
}
