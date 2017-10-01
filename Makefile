demo:
	@./bin/demo

lint:
	@-$(shell npm bin)/eslint ./lib

.PHONY: demo lint
