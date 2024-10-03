#!/bin/bash

NAMESPACE="sre-challenge"
SERVICES=("note-taker" "prometheus" "grafana")
# arrary with PIDs
PIDS=()

function start_services() {
    for SERVICE in "${SERVICES[@]}"; do
        echo "Starting port-forward for $SERVICE..."

        # get service port
        PORT=$(kubectl get svc "$SERVICE" -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].port}')

        # port-forward in background, use the same port
        kubectl port-forward svc/"$SERVICE" -n "$NAMESPACE" "$PORT":"$PORT" &

        # save PID
        PIDS+=($!)
        
        # output URL
        echo "$SERVICE URL: http://localhost:$PORT"
    done
    echo "All services port forwarded."
}

function stop_services() {
    echo "Stopping services..."
    for PID in "${PIDS[@]}"; do
        kill "$PID" 2>/dev/null
    done
    echo "All services stopped."
}

# SIGINT (Ctrl+C), call stop_services
trap stop_services SIGINT

# start services
start_services

# wait for background processes to finish
wait
