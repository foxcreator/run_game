terraform {
  required_version = "= 1.14.3"
  
  backend "s3" {
    bucket = "game-infrustructure"
    key    = "terraform/hetzner/web/terraform.tfstate"
    region = "eu-north-1"
  }
  
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "=1.45.0"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}
