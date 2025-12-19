pipeline {
    agent any

    environment {
        IMAGE_NAME = "manahyl/banking-app"
        IMAGE_TAG  = "${BUILD_NUMBER}"
        KUBECONFIG = "/var/lib/jenkins/.kube/config"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Prepare Docker Auth Dir') {
            steps {
                sh 'mkdir -p $WORKSPACE/.docker'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
            }
        }

        stage('Trivy Scan') {
            steps {
                sh "trivy image --exit-code 0 --severity HIGH,CRITICAL ${IMAGE_NAME}:${IMAGE_TAG}"
            }
        }

        stage('Push Image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                      echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin
                      docker push ${IMAGE_NAME}:${IMAGE_TAG}
                    """
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh """
                  sed -i 's|your-dockerhub-username/banking-app:v1|${IMAGE_NAME}:${IMAGE_TAG}|g' kubernetes/deployment.yaml

                  kubectl apply -f kubernetes/ --validate=false || echo '⚠️ K8s deploy skipped'
                """
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f'
        }
        failure {
            echo '❌ PIPELINE FAILED'
        }
        success {
            echo '✅ PIPELINE SUCCESS'
        }
    }
}
