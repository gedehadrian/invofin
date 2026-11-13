.PHONY: help install supa-start supa-stop supa-status setup seed up dev worker test test-db test-local lint typecheck check build

help:
	@node -e "console.log(['InvoFin - Available Make Targets:','  make install      - Install dependencies (npm ci)','  make supa-start   - Start local Supabase (Docker)','  make supa-stop    - Stop local Supabase','  make supa-status  - Check local Supabase status','  make setup        - Generate .env.test.local from local Supabase','  make seed         - Seed local demo & admin accounts','  make up           - Start Supabase + setup env + seed demo accounts','  make dev          - Start Next.js local dev server (http://127.0.0.1:3100)','  make worker       - Start local document/OCR background worker','  make test         - Run unit tests','  make test-db      - Run PGlite schema & migration tests','  make test-local   - Run local stack integration tests','  make lint         - Run ESLint','  make typecheck    - Run TypeScript typecheck','  make check        - Run typecheck, lint, and unit tests','  make build        - Build production bundle'].join('\n'))"

install:
	npm ci

supa-start:
	npx --yes supabase@3.0.0 start --exclude studio,imgproxy,logflare,vector,supavisor,edge-runtime,realtime

supa-stop:
	npx --yes supabase@3.0.0 stop

supa-status:
	npx --yes supabase@3.0.0 status

setup:
	npm run setup:local

seed:
	npx tsx --env-file=.env.test.local scripts/seed.ts

up: supa-start setup seed

dev:
	npm run dev:local

worker:
	npm run worker:local

test:
	npm test

test-db:
	npm run test:db

test-local:
	npm run test:local

lint:
	npm run lint

typecheck:
	npm run typecheck

check: typecheck lint test

build:
	npm run build
