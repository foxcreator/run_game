resource "hcloud_network" "hc_network" {
  name                     = var.network_name
  ip_range                 = var.network_ip_range
  delete_protection        = true
  expose_routes_to_vswitch = var.expose_routes_to_vswitch
}

resource "hcloud_network_subnet" "hc_subnet" {
  for_each     = toset(var.subnet_ip_ranges)
  network_id   = hcloud_network.hc_network.id
  type         = "cloud"
  network_zone = var.network_zone
  ip_range     = each.value
}

resource "hcloud_network_subnet" "vswitch_subnet" {
  count        = var.create_vswitch_subnet ? 1 : 0
  network_id   = hcloud_network.hc_network.id
  type         = "vswitch"
  network_zone = var.network_zone
  ip_range     = var.subnet_vswitch_ip_range
  vswitch_id   = var.vswitch_id
}
