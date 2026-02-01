# Game Server Module — Hetzner

terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

# SSH Key
resource "hcloud_ssh_key" "deploy" {
  name       = "${var.project_name}-deploy"
  public_key = var.ssh_public_key
}

# Firewall
resource "hcloud_firewall" "main" {
  name = "${var.project_name}-firewall"

  dynamic "rule" {
    for_each = var.firewall_rules
    content {
      direction  = rule.value.direction
      protocol   = rule.value.protocol
      port       = rule.value.port != "" ? rule.value.port : null
      source_ips = rule.value.source_ips
    }
  }
}

# Servers
resource "hcloud_server" "servers" {
  for_each = var.servers

  name        = "${var.project_name}-${each.key}"
  image       = each.value.image
  server_type = each.value.server_type
  location    = each.value.location

  ssh_keys     = [hcloud_ssh_key.deploy.id]
  firewall_ids = [hcloud_firewall.main.id]

  labels = {
    project = var.project_name
    role    = each.key
  }
}
