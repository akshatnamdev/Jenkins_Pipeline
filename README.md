Jenkins CI/CD Pipeline

dockerized jenkins • blue ocean • pipelines as code

JENKINS CI/CD PIPELINE – A fully Dockerized Jenkins setup with Blue Ocean UI, designed for building modern CI/CD pipelines using Jenkinsfile, containerized agents, and Docker-native workflows.

This repository provides a clean, reproducible Jenkins environment suitable for learning, experimentation, and real-world DevOps practice.

🎯 Key Features

✅ Dockerized Jenkins with Blue Ocean UI
✅ Pipeline as Code using Jenkinsfile
✅ Docker-in-Docker support for builds
✅ Persistent Jenkins data using volumes
✅ Cross-platform support (Windows / Linux / macOS)
✅ Agent-based execution for scalable pipelines

🏗️ Architecture
JENKINS-PIPELINE/
├── Dockerfile                 # Custom Jenkins + Blue Ocean image
├── Jenkinsfile                # Declarative CI/CD pipeline
├── agents/                    # Optional Jenkins agent images
├── scripts/                   # Helper scripts (if any)
└── README.md

📋 Tech Stack

CI/CD: Jenkins, Blue Ocean

Containers: Docker

Pipeline: Declarative Jenkinsfile (Groovy)

Agents: Docker-based Jenkins agents

SCM: Git

🚀 Quick Start
Prerequisites

Docker (latest)

Git

Any OS (Windows / Linux / macOS)

1️⃣ Build Jenkins Blue Ocean Image
docker build -t myjenkins-blueocean:2.414.2 .

2️⃣ Create Docker Network
docker network create jenkins

3️⃣ Run Jenkins Container
macOS / Linux
docker run --name jenkins-blueocean --restart=on-failure --detach \
  --network jenkins \
  --env DOCKER_HOST=tcp://docker:2376 \
  --env DOCKER_CERT_PATH=/certs/client \
  --env DOCKER_TLS_VERIFY=1 \
  --publish 8080:8080 \
  --publish 50000:50000 \
  --volume jenkins-data:/var/jenkins_home \
  --volume jenkins-docker-certs:/certs/client:ro \
  myjenkins-blueocean:2.414.2

Windows (PowerShell)
docker run --name jenkins-blueocean --restart=on-failure --detach `
  --network jenkins `
  --env DOCKER_HOST=tcp://docker:2376 `
  --env DOCKER_CERT_PATH=/certs/client `
  --env DOCKER_TLS_VERIFY=1 `
  --volume jenkins-data:/var/jenkins_home `
  --volume jenkins-docker-certs:/certs/client:ro `
  --publish 8080:8080 `
  --publish 50000:50000 `
  myjenkins-blueocean:2.414.2

🔐 Jenkins Initial Setup

Get the initial admin password:

docker exec jenkins-blueocean cat /var/jenkins_home/secrets/initialAdminPassword


Open Jenkins UI:

http://localhost:8080


Follow the setup wizard and install recommended plugins.

🔄 Docker Access from Jenkins

To allow Jenkins pipelines to run Docker commands on the host, use a lightweight socket-forwarding container:

docker run -d --restart=always \
  -p 127.0.0.1:2376:2375 \
  --network jenkins \
  -v /var/run/docker.sock:/var/run/docker.sock \
  alpine/socat \
  tcp-listen:2375,fork,reuseaddr unix-connect:/var/run/docker.sock


Check container networking details:

docker inspect <container_id> | grep IPAddress

🤖 Jenkins Agents (Optional)

This setup supports Docker-based Jenkins agents for isolated builds.

Example agent pull:

docker pull myjenkinsagents:python


Agents can be attached via Jenkins → Manage Nodes → Docker Agent configuration.

📡 Pipeline Capabilities

Source code checkout from Git

Docker image build & push

Parallel pipeline stages

Agent-based job execution

Visual pipeline view via Blue Ocean

Easy extension for cloud deployments

🧪 Example Pipeline Flow
Checkout Code
     ↓
Build Application
     ↓
Run Tests
     ↓
Build Docker Image
     ↓
Deploy / Publish


All steps are defined declaratively inside the Jenkinsfile.

⚙️ Configuration Notes

Jenkins data persists via Docker volumes

Pipelines are fully controlled using Jenkinsfile

Blue Ocean provides visual feedback and logs

Agents can be customized per project

🐛 Troubleshooting

Jenkins UI not loading

docker ps
docker logs jenkins-blueocean


Docker commands failing inside pipeline

Ensure socat container is running

Verify Docker socket mapping

Check Jenkins Docker plugin configuration

🧠 Use Cases

Learning Jenkins CI/CD

DevOps portfolio projects

Interview preparation

Pipeline experimentation

Docker-native automation workflows

📝 Development Notes

To add new pipeline stages, edit:

Jenkinsfile


To add custom agents, extend:

agents/

📄 License

MIT License
Free to use, modify, and distribute.

⭐ Final Words

This repository is designed to be simple, practical, and production-inspired — perfect for mastering Jenkins pipelines with Docker.

Build fast. Break less. Automate everything. ⚙️🔥
