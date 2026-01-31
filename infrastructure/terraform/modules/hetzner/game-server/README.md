# Game Server Module

Terraform модуль для створення ігрових серверів на Hetzner Cloud.

## Ресурси

- `hcloud_ssh_key` — SSH ключ для доступу
- `hcloud_firewall` — Firewall з правилами
- `hcloud_server` — Сервери з firewall

## Використання

```hcl
module "game_server" {
  source = "../../modules/hetzner/game-server"

  project_name   = "game"
  ssh_public_key = file("~/.ssh/id_ed25519.pub")
  
  servers = {
    busification = {
      server_type = "cx22"
      image       = "ubuntu-24.04"
      location    = "nbg1"
    }
  }

  firewall_rules = [
    { direction = "in", protocol = "tcp", port = "22", source_ips = ["0.0.0.0/0"] },
    { direction = "in", protocol = "tcp", port = "80", source_ips = ["0.0.0.0/0"] },
    { direction = "in", protocol = "tcp", port = "443", source_ips = ["0.0.0.0/0"] }
  ]
}
```

## Outputs

| Name | Description |
|------|-------------|
| server_ips | Map of server names to IPs |
| server_ids | Map of server names to IDs |
