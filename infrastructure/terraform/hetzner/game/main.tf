# Game Project — Busification Run Server

module "game_server" {
  source = "../../modules/hetzner/game-server"

  project_name   = var.project_name
  ssh_public_key = var.ssh_public_key
  servers        = var.servers
  firewall_rules = var.firewall_rules
}
