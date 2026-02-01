variable "hcloud_token" {
  sensitive = true
}

variable "servers" {
  type        = any
  description = "List of server definitions."
}

variable "rules" {
  type        = any
  description = "List of Rule Configurations from the Firewall"
}

variable "service_name" {
  description = "Name of the service"
  default     = "web"
}

variable "placement_group" {
  type = object({
    name = string
    type = string
  })
  default = {
    name = "web"
    type = "spread"
  }
  description = "Provides a Hetzner Cloud Placement Group to represent a Placement Group in the Hetzner Cloud."
}
