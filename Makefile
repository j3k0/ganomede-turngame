# makefile

BUNYAN_LEVEL?=1000
SHELL = /bin/bash -o pipefail

all: install test

check: install
	# ./node_modules/.bin/eslint src/ tests/
	# ./node_modules/.bin/coffeelint -q src tests

build: install
	npm run build

test: build
	NOTIFY_FULL_STATE=1 API_SECRET=1234 npx mocha -b --require source-map-support/register --recursive  'dist/tests/turngame/test-api.js' | npx bunyan -l ${BUNYAN_LEVEL}

testw:
	./node_modules/.bin/mocha --watch -b --recursive --compilers coffee:coffee-script/register 'tests/test-**.ts' | ./node_modules/.bin/bunyan -l ${BUNYAN_LEVEL}

coverage: test
	@mkdir -p doc

	@# coverage using blanket
	@#./node_modules/.bin/mocha -b --compilers coffee:coffee-script/register --require blanket -R html-cov tests | ./node_modules/.bin/bunyan -l ${BUNYAN_LEVEL} > doc/coverage.html
	@#echo "coverage exported to doc/coverage.html"

	@# coverage using coffee-coverage
	@#rm -fr .coverage; mkdir -p .coverage; cp *.* .coverage/; ./node_modules/.bin/coffeeCoverage ./src ./.coverage/src; ./node_modules/.bin/coffeeCoverage ./tests ./.coverage/tests; COVERAGE=true ./node_modules/.bin/mocha -b --require coffee-coverage/register -R html-cov .coverage/tests > doc/coverage.html; rm -fr .coverage
	@#echo "coverage exported to doc/coverage.html"

	@# coverage using istanbul
	./node_modules/.bin/istanbul cover --dir doc ./node_modules/.bin/_mocha -- --recursive --compilers coffee:coffee-script/register tests
	@echo "coverage exported to doc/lcov-report/index.html"

run: check
	node index.js | ./node_modules/.bin/bunyan -l ${BUNYAN_LEVEL}

start-daemon:
	node_modules/.bin/forever start index.js

stop-daemon:
	node_modules/.bin/forever stop index.js

install: node_modules

node_modules: package.json
	npm install
	@touch node_modules

clean:
	rm -fr node_modules

docker-prepare:
	@mkdir -p doc
	docker-compose up -d --no-recreate redisGames

docker-run: docker-prepare
	docker-compose run --rm app make run BUNYAN_LEVEL=${BUNYAN_LEVEL}

docker-test: docker-prepare
	docker-compose run --rm app make test BUNYAN_LEVEL=${BUNYAN_LEVEL}

docker-coverage: docker-prepare
	docker-compose run --rm app make coverage

