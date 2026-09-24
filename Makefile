COMPOSE_DEV=docker compose -f docker-compose.yml
COMPOSE_PROD=docker compose -f docker-compose.prod.yml

.PHONY: dev-up dev-down dev-build dev-logs dev-restart dev-backend dev-front
.PHONY: prod-up prod-down prod-build prod-logs prod-restart
.PHONY: network clean ps seed db-shell reset-db release

export USER_ID := $(shell id -u)
export GROUP_ID := $(shell id -g)

ifneq (,$(wildcard ./.env))
    DB_USER := $(shell grep -E '^DB_USER=' .env | cut -d= -f2)
    DB_PASSWORD := $(shell grep -E '^DB_PASSWORD=' .env | cut -d= -f2)
    DB_NAME := $(shell grep -E '^DB_NAME=' .env | cut -d= -f2)
endif

network:
	@docker network inspect shared-network >/dev/null 2>&1 || docker network create shared-network

# --- Dev ---
dev-build:
	$(COMPOSE_DEV) build

dev-up: network dev-build
	$(COMPOSE_DEV) up -d
	$(MAKE) -s dev-front &

dev-down:
	$(COMPOSE_DEV) down

dev-front:
	pkill -f "electron-vite dev" 2>/dev/null || true
	cd frontend && npm run dev

dev-logs:
	$(COMPOSE_DEV) logs -f

dev-restart:
	$(COMPOSE_DEV) restart backend

dev-backend:
	$(COMPOSE_DEV) up -d --build backend

# --- Prod (app only, no proxy) ---
prod-build: network
	$(COMPOSE_PROD) build

prod-up: network prod-build
	$(COMPOSE_PROD) up -d

prod-down:
	$(COMPOSE_PROD) down

prod-logs:
	$(COMPOSE_PROD) logs -f

prod-restart:
	$(COMPOSE_PROD) restart

# --- Utils ---
ps:
	$(COMPOSE_DEV) ps
	$(COMPOSE_PROD) ps

clean:
	$(COMPOSE_DEV) down --remove-orphans
	$(COMPOSE_PROD) down --remove-orphans

seed:
	docker exec -i zatyshok-db-dev mariadb -u $(DB_USER) -p$(DB_PASSWORD) $(DB_NAME) < init.sql
	(echo "SET FOREIGN_KEY_CHECKS=0;" && cat datas.sql && echo "SET FOREIGN_KEY_CHECKS=1;") | docker exec -i zatyshok-db-dev mariadb -u $(DB_USER) -p$(DB_PASSWORD) $(DB_NAME)
db-shell:
	docker exec -it zatyshok-db-dev mariadb -u root -p

reset-db:
	$(COMPOSE_DEV) down
	sudo rm -rf ./zatyshok-db-data
	$(COMPOSE_DEV) up -d
	@echo "Attente de l'initialisation de MariaDB (15s)..."
	@sleep 15
	$(MAKE) seed

release:
	gh workflow run deploy.yml