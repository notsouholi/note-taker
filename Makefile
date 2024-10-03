# makefile for the note-taker application

# deploy redis, prometheus and grafana:
deploy-redis-and-monitors: deploy-metrics-server
	kubectl get namespace sre-challenge &> /dev/null || kubectl create namespace sre-challenge && \
	kubectl apply -f kubernetes/prometheus-grafana/ && \
	kubectl apply -f kubernetes/redis/

# Deploy the note-taker application:
deploy-note-taker: deploy-redis-and-monitors
	kubectl apply -f kubernetes/note-taker/ && \
	kubectl apply -f kubernetes/chaoskube/

deploy-metrics-server:
	kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# basic script to run services on localhost
start-services:
	./scripts/start-services.sh
