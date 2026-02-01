output "server_ids" {
  value = {
    for k, v in hcloud_server.web : v.name => v.id
  }
}
