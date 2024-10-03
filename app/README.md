## Deploying the Note Taker on your local machine
How to run the note taker on your local machine for testing and/or development

## Prerequisites:
Rather than using npm and installing several of the services (i.e. prometheus, redis, etc) on your local machine, we will setup and run our service in a Docker container for testing and development. I made this choice to try and offer support for different operating systems.

- Docker - for building and running images
    - Follow guides here to install and run: https://docs.docker.com/desktop/
- Images we will pull & run:
    - Note-Taker Image - application for note management
    - Redis Image - caching
    - Prometheus - queries & monitoring
    - Grafana - monitoring and visualization

## Steps to Run:
1. From the `app` directory:
```
make run-note-taker
```

## Updating the Official Note Taker Image:
- Currently, the docker image for the note-taker is set to be built and run from your local machine's docker repository.
- If you wish to update the official note-taker image you must request access to the notsuoholi repository in DockerHub.
    - You may reach out to me for access [(contact)](mailto:oliblaine@gmail.com).
    - You may also rebuild the image and push it to your own repository in DockerHub.
        - If you do this, remember to update the image in both the kubernetes manifest and docker-compose.yaml. 

## Note Taker Structure:
### API Endpoints
These are the endpoints currently configured in the application. All other routes will throw errors when accessed.
- `GET /api/notes` - Get all notes currently available
- `POST /api/notes` - Add a new note. All new notes require text.
- `PUT /api/notes/:id` - Edit existing notes
- `DELETE /api/notes/:id` - Delete a note

### Metrics Currently Monitored
The application exposes some built-in and custom metrics for Prometheus at the /metrics endpoint.
Custom metrics include:
- `api_response_time_seconds` - Histogram of API response times
- `successful_requests_total` - Counter for successful requests
- `user_error_requests_total` - Counter for requests with user errors (e.g., empty text)
- `server_error_requests_total` - Counter for server errors

### EJS Templating
The frontend of the note taker uses EJS for rendering pages. The main view is located in views/note.ejs.

## Directory Structure:
```
├── app # app files, operate here to deploy and test locally
│   ├── Dockerfile
│   ├── README.md # readme for application files
│   ├── MAkefile # commands for deploying application locally for development/testing
│   ├── app.js
│   ├── app.log
│   ├── metrics.log
│   ├── monitoring
│   │   └── prometheus-config.yml
│   ├── package-lock.json
│   ├── package.json
│   ├── scripts
│   │   └── deploy.sh
│   ├── tree.md
│   └── views
│       └── note.ejs
```
