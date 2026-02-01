resource "hcloud_load_balancer" "web_lb" {
  count              = var.create_lb ? 1 : 0
  name               = "web_lb"
  load_balancer_type = var.load_balancer_type
  network_zone       = var.network_zone

  algorithm {
    type = var.lb_algorithm
  }
}

resource "hcloud_load_balancer_target" "web" {
  for_each = {
    for index, ws in var.web_servers :
    ws.name => ws if ws.lb_target_group && var.create_lb
  }
  load_balancer_id = hcloud_load_balancer.web_lb[0].id
  type             = "server"
  server_id        = hcloud_server.web[each.key].id
  use_private_ip   = true
}

resource "hcloud_load_balancer_service" "web_lb_service" {
  for_each = {
    for index, svc in var.lb_svc :
    index => svc if var.create_lb
  }
  load_balancer_id = hcloud_load_balancer.web_lb[0].id
  protocol         = each.value.protocol
  listen_port      = each.value.listen_port
  destination_port = each.value.destination_port

  dynamic "http" {
    for_each = try(each.value.http.redirect_http, "") != "" ? [0] : []
    content {
      redirect_http = each.value.http.redirect_http
      certificates  = var.certificates
    }
  }
  dynamic "health_check" {
    for_each = try(each.value.health_check.protocol, "") != "" ? [0] : []
    content {
      protocol = each.value.health_check.protocol
      port     = each.value.health_check.port
      interval = "10"
      timeout  = "10"
    }
  }
}

resource "hcloud_load_balancer_network" "web_network" {
  count                   = var.create_lb ? 1 : 0
  load_balancer_id        = hcloud_load_balancer.web_lb[0].id
  network_id              = var.network_id
  enable_public_interface = "true"
}
