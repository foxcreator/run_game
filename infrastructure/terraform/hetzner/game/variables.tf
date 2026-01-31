variable "hcloud_token" {
  description = "Hetzner Cloud API Token"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "SSH public key content"
  type        = string
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "game"
}

variable "servers" {
  description = "Map of servers to create"
  type = map(object({
    server_type = string
    image       = string
    location    = string
  }))
}

variable "firewall_rules" {
  description = "Firewall rules"
  type = list(object({
    direction  = string
    protocol   = string
    port       = string
    source_ips = list(string)
  }))
  default = []
}
