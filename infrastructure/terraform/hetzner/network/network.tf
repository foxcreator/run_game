module "network" {
  source = "../../modules/hetzner/network"

  network_name     = var.network_name
  network_ip_range = var.network_ip_range
  subnet_ip_ranges = var.subnet_ip_ranges
  network_zone     = var.network_zone

  expose_routes_to_vswitch = false
  create_vswitch_subnet    = false
}
