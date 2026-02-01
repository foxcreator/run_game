resource "hcloud_firewall" "web" {
  count = var.create_firewall ? 1 : 0
  name  = "${var.service_name}-firewall"
  dynamic "rule" {
    for_each = {
      for index, rule in var.rules :
      rule.name => rule
    }
    content {
      direction   = rule.value.direction
      protocol    = rule.value.protocol
      port        = try(rule.value.port, null)
      source_ips  = rule.value.source_ips
      description = try(rule.value.description, null)
    }
  }
}


resource "hcloud_server" "web" {
  for_each = {
    for index, ws in var.web_servers :
    ws.name => ws
  }
  name               = each.value.name
  image              = each.value.os_type
  server_type        = each.value.server_type
  ssh_keys           = var.ssh_key
  placement_group_id = var.create_placement_group ? hcloud_placement_group.web[0].id : null
  keep_disk          = true
  rebuild_protection = true
  delete_protection  = true
  backups            = each.value.backups
  firewall_ids       = [hcloud_firewall.web[0].id]
  labels = merge(
    each.value.labels,
    {
      "Purpose" = var.service_name
      "Public"  = "true"
    }
  )

  network {
    network_id = var.network_id
    alias_ips  = []
  }
  public_net {
    ipv4_enabled = true
    ipv6_enabled = false
  }
}

resource "hcloud_volume" "web" {
  for_each = {
    for index, ws in var.web_servers :
    ws.name => ws if ws.volume != null
  }
  name      = each.value.volume.name
  size      = each.value.volume.size
  server_id = hcloud_server.web[each.key].id
  automount = true
  format    = each.value.volume.format
}

resource "hcloud_placement_group" "web" {
  count = var.create_placement_group ? 1 : 0
  name = var.placement_group.name
  type = var.placement_group.type
}
