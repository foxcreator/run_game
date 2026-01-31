variable "hcloud_token" {
  description = "Hetzner Cloud API Token"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "SSH public key for server access"
  type        = string
}

variable "server_name" {
  description = "Name of the server"
  type        = string
  default     = "busification-run"
}

variable "server_type" {
  description = "Hetzner server type (cx22 = 2vCPU, 4GB, ~€4.5/mo)"
  type        = string
  default     = "cx22"
}

variable "location" {
  description = "Server location (nbg1, fsn1, hel1)"
  type        = string
  default     = "nbg1"
}
