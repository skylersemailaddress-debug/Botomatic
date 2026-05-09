terraform {
  required_version = ">= 1.5.0"
}

resource "null_resource" "runtime_spine" {
  triggers = {
    runtime = "runtime-spine-scaffold"
  }
}

output "runtime_spine_status" {
  value = "scaffold"
}
