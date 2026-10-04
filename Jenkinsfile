
pipeline {
    agent any

    environment {
        IMAGE_NAME = 'jenkins-cicd-demo'
        CONTAINER_NAME = 'jenkins-cicd-app'
        APP_PORT = '3000'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

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
                      if curl -fsS http://localhost:${APP_PORT}; then
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

