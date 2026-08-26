COMPOSE_DEV=docker compose -f docker-compose.yml
COMPOSE_PROD=docker compose -f docker-compose.prod.yml

.PHONY: build network dev prod clean seed backend ps logs restart down up db-shell reset-db

export USER_ID := $(shell id -u)
export GROUP_ID := $(shell id -g)

ifneq (,$(wildcard ./.env))
    DB_USER := $(shell grep -E '^DB_USER=' .env | cut -d= -f2)
    DB_PASSWORD := $(shell grep -E '^DB_PASSWORD=' .env | cut -d= -f2)
    DB_NAME := $(shell grep -E '^DB_NAME=' .env | cut -d= -f2)
endif

network:
	@docker network inspect shared-network >/dev/null 2>&1 || docker network create shared-network

build:
	$(COMPOSE_DEV) build --build-arg USER_ID=$(USER_ID) --build-arg GROUP_ID=$(GROUP_ID)

dev: network build
	$(COMPOSE_DEV) up -d
	cd frontend && npm run dev

prod: network
	$(COMPOSE_PROD) build --build-arg USER_ID=$(USER_ID) --build-arg GROUP_ID=$(GROUP_ID)
	$(COMPOSE_PROD) up -d --build

clean:
	$(COMPOSE_DEV) down --remove-orphans
	$(COMPOSE_PROD) down --remove-orphans

seed: 
	docker exec -i zatyshok-db mariadb -u $(DB_USER) -p$(DB_PASSWORD) $(DB_NAME) < backend/init.sql
	docker exec -i zatyshok-db mariadb -u $(DB_USER) -p$(DB_PASSWORD) $(DB_NAME) < backend/datas.sql

backend:
	$(COMPOSE_DEV) up -d --build backend

ps:
	$(COMPOSE_DEV) ps
	$(COMPOSE_PROD) ps

logs:
	$(COMPOSE_DEV) logs backend -f

restart:
	$(COMPOSE_DEV) restart backend

down:
	$(COMPOSE_DEV) down
	$(COMPOSE_PROD) down

up:
	$(COMPOSE_DEV) up -d

db-shell:
	docker exec -it zatyshok-db mariadb -u root -p

reset-db:
	$(COMPOSE_DEV) down
	$(COMPOSE_PROD) down
	sudo rm -rf ./zatyshok-db-data
	$(COMPOSE_DEV) up -d