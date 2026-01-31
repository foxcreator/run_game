output "server_ip" {
  description = "Public IPv4 address"
  value       = hcloud_server.app.ipv4_address
}

output "server_ipv6" {
  description = "Public IPv6 address"
  value       = hcloud_server.app.ipv6_address
}

output "server_status" {
  description = "Server status"
  value       = hcloud_server.app.status
}
