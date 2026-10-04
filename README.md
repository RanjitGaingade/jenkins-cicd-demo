# CI/CD Pipeline
Jenkins CI/CD Demo
A complete local CI/CD project demonstrating how to automate a Node.js application deployment using GitHub, Jenkins, Docker, and ngrok.
The project automatically builds, tests, deploys, and verifies a Dockerized Node.js application whenever code is pushed to the main branch.
1. Project Overview
The goal of this project was to build a complete CI/CD pipeline:
Developer
    │
    │ git push
    ▼
 GitHub
    │
    │ Push Webhook
    ▼
 ngrok
    │
    │ HTTPS Tunnel
    ▼
 Jenkins
    │
    ├── Checkout
    ├── Build
    ├── Test
    ├── Deploy
    └── Verify
         │
         ▼
 Docker Container
         │
         ▼
 Node.js Application
         │
         ▼
 http://localhost:3000

2. Technologies Used
Technology	Purpose
Git	Version control
GitHub	Source code repository
Jenkins	CI/CD automation
Docker	Containerization
Node.js	Application runtime
ngrok	Exposes local Jenkins to GitHub
curl	Application health verification
macOS	Local development environment


3. Project Architecture
                         ┌───────────────────┐
                         │     Developer     │
                         │                   │
                         │ git push origin   │
                         │       main        │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │      GitHub       │
                         │                   │
                         │ Source Repository │
                         │ jenkins-cicd-demo │
                         └─────────┬─────────┘
                                   │
                              Push Webhook
                                   │
                                   ▼
                         ┌───────────────────┐
                         │      ngrok        │
                         │                   │
                         │ Public HTTPS URL  │
                         └─────────┬─────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │          Jenkins           │
                    │                            │
                    │        Port 8080           │
                    │                            │
                    │  Checkout                  │
                    │  Build                     │
                    │  Test                      │
                    │  Deploy                    │
                    │  Verify                    │
                    └─────────────┬──────────────┘
                                  │
                             Docker Build
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │      Docker Container      │
                    │                            │
                    │     jenkins-cicd-app       │
                    │                            │
                    │     Node.js :3000          │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
                       Hello from Jenkins
                            CI/CD!

4. Project Structure
The project is intentionally kept simple, with application files in the repository root.
jenkins-cicd-demo/
│
├── app.js
├── package.json
├── Dockerfile
├── Dockerfile.jenkins
├── Jenkinsfile
└── README.md

5. Node.js Application
app.js
The application is a simple HTTP server.
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from Jenkins CI/CD!');
});

server.listen(3000, '0.0.0.0', () => {
  console.log('App listening on port 3000');
});

The application:
- Uses Node.js HTTP server
- Listens on port 3000
- Binds to 0.0.0.0
- Returns:
Hello from Jenkins CI/CD!

6. package.json
{
  "name": "jenkins-cicd-demo",
  "version": "1.0.0",
  "scripts": {
    "start": "node app.js",
    "test": "node --check app.js"
  }
}

The project contains two scripts:
Start application
npm start

Test JavaScript syntax
npm test

7. Application Dockerfile
The Node.js application is containerized using:
FROM node:22-alpine

WORKDIR /app

COPY package.json app.js ./

EXPOSE 3000

CMD ["npm", "start"]

Explanation
FROM node:22-alpine

Uses a lightweight Node.js Alpine image.
WORKDIR /app

Creates /app as the working directory.
COPY package.json app.js ./

Copies the application files into the image.
EXPOSE 3000

Documents that the application uses port 3000.
CMD ["npm", "start"]

Starts the Node.js application.
8. Manual Docker Test
Before integrating Jenkins, the application was tested manually with Docker.
The application was successfully accessed using:
curl http://localhost:3000

Response:
Hello from Jenkins CI/CD!

This confirmed that the application and Docker configuration were working correctly.
9. Custom Jenkins Docker Image
Jenkins itself was also customized.
Dockerfile.jenkins
FROM jenkins/jenkins:lts-jdk21

USER root

RUN apt-get update \
    && apt-get install -y docker.io curl \
    && rm -rf /var/lib/apt/lists/*

USER jenkins

The custom image provides:
- Jenkins
- Docker CLI
- curl
Docker CLI is required so Jenkins can build and run application containers.
10. Jenkins Container
The Jenkins container is exposed on:
http://localhost:8080

Docker port mapping:
0.0.0.0:8080 -> 8080

The application container uses:
0.0.0.0:3000 -> 3000

The final local architecture is:
Mac
│
├── Jenkins Container
│      └── :8080
│
└── Node.js Container
       └── :3000

11. Docker Socket
Jenkins needs access to Docker to build and deploy the application.
The Docker socket was mounted into Jenkins:
/var/run/docker.sock

Initially, Jenkins could execute the Docker CLI but received:
permission denied while trying to connect to the Docker daemon socket

The issue was resolved for this local learning environment by running the Jenkins container as root.
This is suitable for a local lab but is not recommended as a production security configuration.
12. Jenkins Pipeline
The pipeline is defined as code in:
Jenkinsfile

Current pipeline:
pipeline {
    agent any

    environment {
        IMAGE_NAME = 'jenkins-cicd-demo'
        CONTAINER_NAME = 'jenkins-cicd-app'
        APP_PORT = '3000'
    }

    stages {
        stage('Build') {
            steps {
                sh 'docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} .'
            }
        }

        stage('Test') {
            steps {
                sh 'docker run --rm ${IMAGE_NAME}:${BUILD_NUMBER} node --check app.js'
                sh 'docker image inspect ${IMAGE_NAME}:${BUILD_NUMBER}'
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    docker rm -f ${CONTAINER_NAME} 2>/dev/null || true

                    docker run -d \
                      --name ${CONTAINER_NAME} \
                      --restart unless-stopped \
                      -p ${APP_PORT}:3000 \
                      ${IMAGE_NAME}:${BUILD_NUMBER}
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                    for i in $(seq 1 10); do
                      if curl -fsS http://host.docker.internal:${APP_PORT}; then
                        exit 0
                      fi

                      sleep 2
                    done

                    echo "Application did not become healthy"
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo 'Build, test, and deployment completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check the console output.'
        }
    }
}

13. Pipeline Stages
Stage 1 — Build
docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} .

Jenkins builds a Docker image.
The Jenkins build number becomes the image tag.
For example:
jenkins-cicd-demo:4
jenkins-cicd-demo:5
jenkins-cicd-demo:6

This provides a simple versioning mechanism for builds.
Stage 2 — Test
The test runs inside the newly built Docker image:
docker run --rm ${IMAGE_NAME}:${BUILD_NUMBER} node --check app.js

This was important because Jenkins itself does not have Node.js installed.
Instead of:
node --check app.js

the pipeline uses:
docker run --rm ... node --check app.js

This ensures the test environment uses the same Node.js environment as the application.
The pipeline also runs:
docker image inspect ${IMAGE_NAME}:${BUILD_NUMBER}

to verify that the Docker image exists.
14. Deployment
The deployment stage removes the previous application container:
docker rm -f jenkins-cicd-app

The || true prevents the pipeline from failing when the container doesn't exist.
Then Jenkins starts the new container:
docker run -d \
  --name jenkins-cicd-app \
  --restart unless-stopped \
  -p 3000:3000 \
  jenkins-cicd-demo:${BUILD_NUMBER}

The application becomes available on:
http://localhost:3000

15. Deployment Verification
Initially, verification used:
curl http://localhost:3000

This failed inside Jenkins.
The reason is that localhost inside the Jenkins container refers to the Jenkins container itself, not the Mac host and not the application container.
The solution was:
curl http://host.docker.internal:3000

Docker Desktop provides:
host.docker.internal

for accessing the host from a container.
The final verification therefore checks:
Jenkins container
       │
       │ host.docker.internal:3000
       ▼
Mac host
       │
       │ port 3000
       ▼
Node.js application

The health check retries up to 10 times, waiting 2 seconds between attempts.
16. GitHub Integration
The GitHub repository is:
RanjitGaingade/jenkins-cicd-demo
Jenkins was configured with:
Definition:
Pipeline script from SCM

SCM:
Git

Repository:
https://github.com/RanjitGaingade/jenkins-cicd-demo.git

Branch:
*/main

Script Path:
Jenkinsfile

This allows Jenkins to obtain the Jenkinsfile directly from GitHub.
17. Automatic GitHub Webhook
Jenkins was configured with:
GitHub hook trigger for GITScm polling

GitHub was configured with a webhook pointing to the Jenkins endpoint:
https://<ngrok-url>/github-webhook/

The webhook uses:
Content-Type: application/json

and is configured for:
Just the push event

18. ngrok Integration
Because Jenkins is running locally, GitHub cannot directly access:
http://localhost:8080

GitHub's servers need a publicly accessible endpoint.
ngrok provides a temporary HTTPS tunnel.
The tunnel was started using:
ngrok http 8080

Example:
Forwarding
https://obedient-reshoot-wick.ngrok-free.dev
    ->
http://localhost:8080

The resulting architecture:
GitHub
   │
   │ HTTPS
   ▼
ngrok public URL
   │
   ▼
localhost:8080
   │
   ▼
Jenkins

19. Webhook Verification
The GitHub webhook was successfully tested.
Ping event
ping
Response 200

Push event
push
Response 200
Completed in 0.61 seconds

This confirmed that GitHub can successfully communicate with Jenkins through ngrok.
20. Final CI/CD Workflow
The completed workflow is:
┌───────────────┐
│   Developer   │
└───────┬───────┘
        │
        │ git push origin main
        ▼
┌───────────────┐
│    GitHub     │
└───────┬───────┘
        │
        │ Push webhook
        ▼
┌───────────────┐
│     ngrok     │
└───────┬───────┘
        │
        ▼
┌────────────────────────────┐
│          Jenkins           │
│                            │
│  Checkout                  │
│      ↓                     │
│  Build                     │
│      ↓                     │
│  Test                      │
│      ↓                     │
│  Deploy                    │
│      ↓                     │
│  Verify                    │
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────┐
│     Docker Container       │
│                            │
│    jenkins-cicd-app        │
│                            │
│    Node.js :3000           │
└──────────────┬─────────────┘
               │
               ▼
     Hello from Jenkins
           CI/CD!

21. Developer Workflow
After the setup is complete, the developer only needs to do:
cd ~/jenkins-cicd

Make changes to the application.
Then:
git add .
git commit -m "Update application"
git push origin main

The rest happens automatically:
git push
   ↓
GitHub
   ↓
Webhook
   ↓
ngrok
   ↓
Jenkins
   ↓
Docker Build
   ↓
Test
   ↓
Deploy
   ↓
Health Check
   ↓
SUCCESS

No manual Build Now action is required.
22. Successful Pipeline Result
The completed Jenkins pipeline produced:
Build, test, and deployment completed successfully!

and:
Finished: SUCCESS

This confirms that all stages completed successfully.
23. Useful Commands
Check containers
docker ps

Check Jenkins
curl -I http://localhost:8080

A 403 Forbidden response from an unauthenticated curl request is still evidence that Jenkins is reachable.
Check application
curl http://localhost:3000

Expected:
Hello from Jenkins CI/CD!

View application logs
docker logs jenkins-cicd-app

View Jenkins logs
docker logs jenkins

Check Docker images
docker images

Start ngrok
ngrok http 8080

24. Troubleshooting Lessons
Problem 1 — ./app not found
The original pipeline used:
docker build ... ./app

But the repository structure was:
Dockerfile
app.js
package.json
Jenkinsfile

All files were at the repository root.
Therefore the correct build context is:
docker build ... .

Problem 2 — node: not found in Jenkins
The pipeline initially tried:
node --check app.js

Jenkins didn't have Node.js installed.
The solution was to execute Node.js from the application image:
docker run --rm ${IMAGE_NAME}:${BUILD_NUMBER} node --check app.js

Problem 3 — curl localhost:3000 failed
The verification stage originally used:
curl http://localhost:3000

from inside Jenkins.
Inside a container:
localhost

refers to that container.
The solution was:
curl http://host.docker.internal:3000

Problem 4 — Jenkins couldn't access Docker
Jenkins initially received:
permission denied while trying to connect to the Docker daemon socket

The local learning environment was configured so Jenkins could access the Docker daemon.
This demonstrates an important Docker/Jenkins concept: the Docker CLI and Docker daemon are separate concerns, and the Jenkins process needs permission to communicate with the daemon.
Problem 5 — GitHub couldn't access localhost
GitHub cannot send a webhook to:
localhost:8080

because that refers to the machine making the request.
ngrok solved this by providing:
Public HTTPS URL
       ↓
ngrok
       ↓
localhost:8080
       ↓
Jenkins

25. Security Considerations
This project is primarily a learning/lab environment.
The current setup has some security limitations:
- Jenkins is exposed through a temporary ngrok URL.
- The ngrok URL can change when the tunnel is restarted.
- Jenkins has access to the Docker socket.
- Jenkins is running as root in the local setup.
These approaches simplify learning but should not be copied directly into a production environment.
For production, consider:
- Dedicated Jenkins infrastructure
- HTTPS with a stable domain
- Proper authentication and authorization
- Webhook secrets
- Least-privilege Jenkins agents
- Avoiding unnecessary Docker socket exposure
- Container/image security scanning
- Secret management
- Network restrictions
- Regular patching and updates
26. Final Architecture Summary
                  SOURCE
                    │
                    ▼
              ┌──────────┐
              │  GitHub  │
              └────┬─────┘
                   │
                Webhook
                   │
                   ▼
              ┌──────────┐
              │  ngrok   │
              └────┬─────┘
                   │
                   ▼
              ┌──────────┐
              │ Jenkins  │
              └────┬─────┘
                   │
             Jenkinsfile
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
     Build       Test       Deploy
                              │
                              ▼
                       ┌─────────────┐
                       │   Docker    │
                       │  Container  │
                       └──────┬──────┘
                              │
                              ▼
                       Node.js :3000
                              │
                              ▼
                    Health Verification
                              │
                              ▼
                           SUCCESS

27. Project Outcome
This project successfully demonstrates a complete local CI/CD implementation:
GitHub
  ↓
Webhook
  ↓
ngrok
  ↓
Jenkins
  ↓
Docker Build
  ↓
Automated Test
  ↓
Docker Deployment
  ↓
Health Check
  ↓
SUCCESS

The project can now serve as a foundation for the next stage of learning: moving the same CI/CD architecture from a local Mac environment to AWS, using a proper Jenkins server and production-style networking.
