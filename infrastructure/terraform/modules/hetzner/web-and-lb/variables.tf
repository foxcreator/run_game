##### LB VARIABLES #####
variable "create_lb" {
  default     = false
  description = "Determines if Load Balancer should be created"
  type        = bool
}

variable "network_zone" {
  default     = "eu-central"
  description = "The Network Zone of the Load Balancer."
  type        = string
}

variable "load_balancer_type" {
  default     = "lb11"
  description = "Type of the Load Balancer - can be lb11, lb21, lb31."
  type        = string
}

variable "certificates" {
  type        = list(string)
  description = "List of IDs from certificates which the Load Balancer has."
  default = []
}

variable "network_id" {
  type        = number
  description = "ID of the network which should be added to the Load Balancer."
}

variable "lb_algorithm" {
  default     = "least_connections"
  description = "Type of the Load Balancer Algorithm: round_robin or least_connections."
  type        = string
}

variable "health_check_protocol" {
  default     = "http"
  description = "Protocol the health check uses: http or tcp."
  type        = string
}

variable "lb_svc" {
  type = list(object({
    protocol         = string
    listen_port      = number
    destination_port = number
    http = optional(object({
      redirect_http = optional(bool, false)
    }))

    health_check = optional(object({
      protocol = string
      port     = optional(string)
    }))
  }))
  description = "Define services for Hetzner Cloud Load Balancers."
  default = []
}

##### SERVER VARIABLES #####

variable "web_servers" {
  type = list(object({
    name            = string
    os_type         = string
    server_type     = string
    labels          = map(string)
    lb_target_group = optional(bool, false)
    backups         = bool
    volume = optional(object({
      name   = string
      size   = number
      format = string
    }))
  }))
  description = "List of Server Configurations."
}

variable "ssh_key" {
  type        = list(string)
  description = "SSH key IDs or names which should be injected into the server at creation time."
}

variable "create_firewall" {
  type        = bool
  description = "This variable defines if firewall is to be created."
}

variable "rules" {
  type = list(object({
    name        = string
    direction   = string
    protocol    = string
    port        = optional(string)
    source_ips  = list(string)
    description = optional(string)
  }))
  description = "List of Rule Configurations from the Firewall"
}

variable "create_placement_group" {
  default = true
  type = bool
  description = "Determines if placement group should be created"
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

variable "service_name" {
  description = "Name of the service"
  default = "web"
}