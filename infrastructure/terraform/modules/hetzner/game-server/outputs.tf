output "server_ips" {
  description = "Map of server names to IPv4 addresses"
  value       = { for k, v in hcloud_server.servers : k => v.ipv4_address }
}

output "server_ids" {
  description = "Map of server names to IDs"
  value       = { for k, v in hcloud_server.servers : k => v.id }
}
