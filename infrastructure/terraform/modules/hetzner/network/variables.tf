variable "network_name" {
  description = "Name of the Network to create (must be unique per project)."
  type        = string
}

variable "network_ip_range" {
  description = "IP Range of the whole Network which must span all included subnets and route destinations. Must be one of the private ipv4 ranges of RFC1918."
  type        = string
}

variable "subnet_ip_ranges" {
  description = "Range to allocate IPs from. Must be a subnet of the ip_range of the Network and must not overlap with any other subnets or with any destinations in routes."
  type        = list(string)
}

variable "network_zone" {
  default     = "eu-central"
  description = " Name of network zone."
  type        = string
}

variable "expose_routes_to_vswitch" {
  description = "Enable or disable exposing the routes to the vSwitch connection. The exposing only takes effect if a vSwitch connection is active."
  type        = bool
  default     = false
}

variable "create_vswitch_subnet" {
  description = "This variable defines if vswitch subnet is to be created."
  type        = bool
  default     = false
}

variable "subnet_vswitch_ip_range" {
  description = "Range to allocate IPs from for vswitch subnet. Must be a subnet of the ip_range of the Network and must not overlap with any other subnets or with any destinations in routes."
  type        = string
  default     = null
}

variable "vswitch_id" {
  description = "ID of the vswitch, Required if type is vswitch"
  type        = number
  default     = null
}
