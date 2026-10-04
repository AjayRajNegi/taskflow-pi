.PHONY: check test lint typecheck

check: lint typecheck test

test:
	bun test

lint:
	bun run eslint src/**/*.ts

typecheck:
	bun run tsc --noEmit