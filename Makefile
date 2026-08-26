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
	docker compose build --build-arg USER_ID=$(USER_ID) --build-arg GROUP_ID=$(GROUP_ID)

dev: network build
	docker compose up -d
	cd frontend && npm run dev

prod: network build
	docker compose -f docker-compose.prod.yml up -d --build

clean:
	docker compose down --remove-orphans

seed: 
	docker exec -i zatyshok-db mariadb -u $(DB_USER) -p$(DB_PASSWORD) $(DB_NAME) < init.sql
	docker exec -i zatyshok-db mariadb -u $(DB_USER) -p$(DB_PASSWORD) $(DB_NAME) < dump.sql

backend:
	docker compose up -d --build backend

ps:
	docker compose ps

logs:
	docker compose logs backend -f

restart:
	docker compose restart backend

down:
	docker compose down

up:
	docker compose up -d

db-shell:
	docker compose exec db mariadb -u root -p

reset-db:
	docker compose down
	sudo rm -rf ./zatyshok-db-data
	docker compose up -d