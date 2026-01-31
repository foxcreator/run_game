# Busification Run Infrastructure

## Швидкий старт

### 1. Terraform — створення сервера

```bash
cd terraform

# Копіюй та заповни змінні
cp terraform.tfvars.example terraform.tfvars
# Відредагуй terraform.tfvars

# Створи сервер
terraform init
terraform plan
terraform apply
```

### 2. Ansible — налаштування сервера

```bash
cd ../ansible

# Копіюй та заповни inventory
cp inventory/hosts.yml.example inventory/hosts.yml
# Відредагуй hosts.yml

# Запусти повне налаштування
ansible-playbook playbooks/setup.yml
```

### 3. SSL (Let's Encrypt)

```bash
ssh root@YOUR_SERVER
certbot --nginx -d your-domain.com
```

---

## GitHub Secrets

| Secret | Опис |
|--------|------|
| `HOST` | IP сервера |
| `SSH_PRIVATE_KEY` | Приватний SSH ключ |
| `SSH_USER` | deploy |
| `APP_DIR` | /opt/busification-run |

---

## Структура

```
terraform/     — Hetzner сервер
ansible/
  ├── roles/
  │   ├── common/   — UFW, Fail2Ban, SSH
  │   ├── nginx/    — Nginx, SSL
  │   ├── nodejs/   — Node.js 20, PM2
  │   ├── mysql/    — MySQL 8
  │   └── app/      — Деплой додатку
  └── playbooks/
      ├── setup.yml   — Повне налаштування
      └── deploy.yml  — Деплой коду
```

---

## Безпека

- ✅ UFW (22, 80, 443)
- ✅ Fail2Ban (SSH protection)
- ✅ SSH only key auth
- ✅ MySQL localhost only
- ✅ Auto security updates
