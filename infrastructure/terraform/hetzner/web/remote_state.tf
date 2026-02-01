data "terraform_remote_state" "network" {
  backend = "s3"

  config = {
    bucket = "game-infrustructure"
    key    = "terraform/hetzner/network/terraform.tfstate"
    region = "eu-north-1"
  }
}
