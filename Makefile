MAKEFLAGS = -j1

export NODE_ENV = test

.PHONY: clean test test-cov test-clean test-travis test-browser publish build bootstrap publish-core publish-runtime build-website build-core watch-core build-core-test clean-core prepublish

build: clean
	./scripts/build.sh

watch: clean
	scripts/build.sh --watch

watch-dev: clean
	scripts/build.sh --watch --source-maps true

lint:
	node node_modules/.bin/eslint packages/*/src

clean: test-clean
	rm -rf packages/*/lib packages/tacoscript/templates.json

test-clean:
	rm -rf packages/*/test/tmp

test: lint
	./scripts/test.sh
	make test-clean

test-browser:
	./scripts/test-browser.sh

publish:
	git pull --rebase
	make test
	node scripts/publish.js
	make clean

bootstrap:
	npm install
	node scripts/bootstrap.js
