variable "hcloud_token" {
  sensitive = true
}

variable "network_name" {
  description = "Name of HCloud network"
  type        = string
}

variable "network_ip_range" {
  description = "IP range of the network"
  type        = string
}

variable "subnet_ip_ranges" {
  description = "A list of ip ranges for subnets"
  type        = list(string)
}

variable "network_zone" {
  type = string
}
