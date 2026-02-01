resource "hcloud_ssh_key" "default" {
  name       = "hetzner_game_key"
  public_key = file("./files/hetzner_game_key.pub")
}

module "hetzner_web" {
  source = "../../modules/hetzner/web-and-lb"

  create_lb  = false
  network_id = data.terraform_remote_state.network.outputs.network_id

  web_servers     = var.servers
  ssh_key         = ["hetzner_game_key"]
  create_firewall = true
  rules           = var.rules
  service_name    = var.service_name
  placement_group = var.placement_group
}
