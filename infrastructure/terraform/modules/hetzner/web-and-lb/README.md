<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 0.13 |
| <a name="requirement_hcloud"></a> [hcloud](#requirement\_hcloud) | =1.45.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_hcloud"></a> [hcloud](#provider\_hcloud) | =1.45.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [hcloud_firewall.web](https://registry.terraform.io/providers/hetznercloud/hcloud/1.45.0/docs/resources/firewall) | resource |
| [hcloud_load_balancer.web_lb](https://registry.terraform.io/providers/hetznercloud/hcloud/1.45.0/docs/resources/load_balancer) | resource |
| [hcloud_load_balancer_network.web_network](https://registry.terraform.io/providers/hetznercloud/hcloud/1.45.0/docs/resources/load_balancer_network) | resource |
| [hcloud_load_balancer_service.web_lb_service](https://registry.terraform.io/providers/hetznercloud/hcloud/1.45.0/docs/resources/load_balancer_service) | resource |
| [hcloud_load_balancer_target.web](https://registry.terraform.io/providers/hetznercloud/hcloud/1.45.0/docs/resources/load_balancer_target) | resource |
| [hcloud_placement_group.web](https://registry.terraform.io/providers/hetznercloud/hcloud/1.45.0/docs/resources/placement_group) | resource |
| [hcloud_server.web](https://registry.terraform.io/providers/hetznercloud/hcloud/1.45.0/docs/resources/server) | resource |
| [hcloud_volume.web](https://registry.terraform.io/providers/hetznercloud/hcloud/1.45.0/docs/resources/volume) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_certificates"></a> [certificates](#input\_certificates) | List of IDs from certificates which the Load Balancer has. | `list(string)` | `[]` | no |
| <a name="input_create_firewall"></a> [create\_firewall](#input\_create\_firewall) | This variable defines if firewall is to be created. | `bool` | n/a | yes |
| <a name="input_create_lb"></a> [create\_lb](#input\_create\_lb) | Determines if Load Balancer should be created | `bool` | `false` | no |
| <a name="input_create_placement_group"></a> [create\_placement\_group](#input\_create\_placement\_group) | Determines if placement group should be created | `bool` | `true` | no |
| <a name="input_health_check_protocol"></a> [health\_check\_protocol](#input\_health\_check\_protocol) | Protocol the health check uses: http or tcp. | `string` | `"http"` | no |
| <a name="input_lb_algorithm"></a> [lb\_algorithm](#input\_lb\_algorithm) | Type of the Load Balancer Algorithm: round\_robin or least\_connections. | `string` | `"least_connections"` | no |
| <a name="input_lb_svc"></a> [lb\_svc](#input\_lb\_svc) | Define services for Hetzner Cloud Load Balancers. | <pre>list(object({<br>    protocol         = string<br>    listen_port      = number<br>    destination_port = number<br>    http = optional(object({<br>      redirect_http = optional(bool, false)<br>    }))<br><br>    health_check = optional(object({<br>      protocol = string<br>      port     = optional(string)<br>    }))<br>  }))</pre> | `[]` | no |
| <a name="input_load_balancer_type"></a> [load\_balancer\_type](#input\_load\_balancer\_type) | Type of the Load Balancer - can be lb11, lb21, lb31. | `string` | `"lb11"` | no |
| <a name="input_network_id"></a> [network\_id](#input\_network\_id) | ID of the network which should be added to the Load Balancer. | `number` | n/a | yes |
| <a name="input_network_zone"></a> [network\_zone](#input\_network\_zone) | The Network Zone of the Load Balancer. | `string` | `"eu-central"` | no |
| <a name="input_placement_group"></a> [placement\_group](#input\_placement\_group) | Provides a Hetzner Cloud Placement Group to represent a Placement Group in the Hetzner Cloud. | <pre>object({<br>    name = string<br>    type = string<br>  })</pre> | <pre>{<br>  "name": "web",<br>  "type": "spread"<br>}</pre> | no |
| <a name="input_rules"></a> [rules](#input\_rules) | List of Rule Configurations from the Firewall | <pre>list(object({<br>    name        = string<br>    direction   = string<br>    protocol    = string<br>    port        = optional(string)<br>    source_ips  = list(string)<br>    description = optional(string)<br>  }))</pre> | n/a | yes |
| <a name="input_service_name"></a> [service\_name](#input\_service\_name) | Name of the service | `string` | `"web"` | no |
| <a name="input_ssh_key"></a> [ssh\_key](#input\_ssh\_key) | SSH key IDs or names which should be injected into the server at creation time. | `list(string)` | n/a | yes |
| <a name="input_web_servers"></a> [web\_servers](#input\_web\_servers) | List of Server Configurations. | <pre>list(object({<br>    name            = string<br>    os_type         = string<br>    server_type     = string<br>    labels          = map(string)<br>    lb_target_group = optional(bool, false)<br>    backups         = bool<br>    volume = optional(object({<br>      name   = string<br>      size   = number<br>      format = string<br>    }))<br>  }))</pre> | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->