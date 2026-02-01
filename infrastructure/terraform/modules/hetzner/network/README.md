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
| [hcloud_network.hc_netwotk](https://registry.terraform.io/providers/hetznercloud/hcloud/1.45.0/docs/resources/network) | resource |
| [hcloud_network_subnet.hc_subnet](https://registry.terraform.io/providers/hetznercloud/hcloud/1.45.0/docs/resources/network_subnet) | resource |
| [hcloud_network_subnet.vswitch_subnet](https://registry.terraform.io/providers/hetznercloud/hcloud/1.45.0/docs/resources/network_subnet) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_create_vswitch_subnet"></a> [create\_vswitch\_subnet](#input\_create\_vswitch\_subnet) | This variable defines if vswitch subnet is to be created. | `bool` | n/a | yes |
| <a name="input_expose_routes_to_vswitch"></a> [expose\_routes\_to\_vswitch](#input\_expose\_routes\_to\_vswitch) | Enable or disable exposing the routes to the vSwitch connection. The exposing only takes effect if a vSwitch connection is active. | `bool` | n/a | yes |
| <a name="input_network_ip_range"></a> [network\_ip\_range](#input\_network\_ip\_range) | IP Range of the whole Network which must span all included subnets and route destinations. Must be one of the private ipv4 ranges of RFC1918. | `string` | n/a | yes |
| <a name="input_network_name"></a> [network\_name](#input\_network\_name) | Name of the Network to create (must be unique per project). | `string` | n/a | yes |
| <a name="input_network_zone"></a> [network\_zone](#input\_network\_zone) | Name of network zone. | `string` | `"eu-central"` | no |
| <a name="input_subnet_ip_ranges"></a> [subnet\_ip\_ranges](#input\_subnet\_ip\_ranges) | Range to allocate IPs from. Must be a subnet of the ip\_range of the Network and must not overlap with any other subnets or with any destinations in routes. | `list(string)` | n/a | yes |
| <a name="input_subnet_vswitch_ip_range"></a> [subnet\_vswitch\_ip\_range](#input\_subnet\_vswitch\_ip\_range) | Range to allocate IPs from for vswitch subnet. Must be a subnet of the ip\_range of the Network and must not overlap with any other subnets or with any destinations in routes. | `list(string)` | n/a | yes |
| <a name="input_vswitch_id"></a> [vswitch\_id](#input\_vswitch\_id) | ID of the vswitch, Required if type is vswitch | `int` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_network_id"></a> [network\_id](#output\_network\_id) | n/a |
<!-- END_TF_DOCS -->