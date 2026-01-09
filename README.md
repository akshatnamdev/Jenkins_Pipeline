🚀 Jenkins CI/CD Pipeline with Docker & Blue Ocean

This repository contains a Docker-based Jenkins setup using Jenkins Blue Ocean, designed to help you quickly spin up a modern CI/CD environment for building, testing, and deploying applications.

The setup focuses on:

Clean Jenkins installation using Docker

Blue Ocean UI for visual pipelines

Docker-in-Docker support for building containers inside Jenkins

Cross-platform compatibility (Linux, macOS, Windows)

🧱 Tech Stack

Jenkins (Blue Ocean)

Docker & Docker Networks

Docker Volumes

Pipeline as Code (Jenkinsfile)

Optional Jenkins Agents

📦 Prerequisites

Make sure you have the following installed on your system:

Docker

Docker Compose (optional but recommended)

Git

🔧 Installation & Setup
1️⃣ Build the Jenkins Blue Ocean Image

You can build the custom Jenkins image locally:

docker build -t myjenkins-blueocean:2.414.2 .


This image includes Jenkins with Blue Ocean and is optimized for CI/CD pipelines.

2️⃣ Create a Dedicated Docker Network
docker network create jenkins


This allows Jenkins containers and agents to communicate securely.

3️⃣ Run Jenkins Container
🐧 macOS / Linux
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

🪟 Windows (PowerShell)
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

🔐 Initial Admin Password

After the container starts, retrieve the Jenkins admin password:

docker exec jenkins-blueocean cat /var/jenkins_home/secrets/initialAdminPassword

🌐 Access Jenkins

Open your browser and visit:

http://localhost:8080


Follow the setup wizard, install recommended plugins, and create your admin user.

🔄 Docker Access Inside Jenkins (Important)

To allow Jenkins to run Docker commands on the host machine, use a lightweight socat container to forward Docker socket traffic.

docker run -d --restart=always \
  -p 127.0.0.1:2376:2375 \
  --network jenkins \
  -v /var/run/docker.sock:/var/run/docker.sock \
  alpine/socat \
  tcp-listen:2375,fork,reuseaddr unix-connect:/var/run/docker.sock


To verify the container network IP:

docker inspect <container_id> | grep IPAddress

🤖 Jenkins Agents (Optional)

You can attach custom Jenkins agents (e.g., Python-based agents) to offload builds and keep the master lightweight.

Example:

docker pull myjenkinsagents:python


These agents can be configured directly inside Jenkins as Docker-based agents.

📂 Repository Structure
.
├── Dockerfile
├── Jenkinsfile
├── README.md
└── agents/

🎯 Use Cases

CI/CD pipeline practice

Dockerized Jenkins learning

DevOps interview preparation

Automation experiments

Cloud-native CI workflows

📘 References

Jenkins Docker Installation (Official Docs)

Jenkins Pipeline Documentation

Blue Ocean UI Documentation

⭐ Final Notes

This setup is ideal for:

Learning Jenkins the right way

Building production-like CI/CD pipelines

Running everything locally with Docker

Feel free to fork, customize, and extend it as per your project needs.

Happy building! ⚙️🔥
