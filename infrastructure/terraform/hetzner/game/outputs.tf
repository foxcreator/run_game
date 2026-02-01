output "server_ips" {
  description = "Server IP addresses"
  value       = module.game_server.server_ips
}

output "server_ids" {
  description = "Server IDs"
  value       = module.game_server.server_ids
}
