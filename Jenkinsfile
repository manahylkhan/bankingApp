pipeline {
    agent {
        docker {
            image 'docker:26.1.4'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    environment {
        DOCKERHUB_USER = 'manahyl'
        IMAGE_NAME = 'banking-app'
        IMAGE_TAG = "${BUILD_NUMBER}"
        KUBECONFIG = '/var/lib/jenkins/.kube/config'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                  docker build -t $DOCKERHUB_USER/$IMAGE_NAME:$IMAGE_TAG .
                '''
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh '''
                  trivy image --severity HIGH,CRITICAL \
                  $DOCKERHUB_USER/$IMAGE_NAME:$IMAGE_TAG || true
                '''
            }
        }

        stage('Push Image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'USER',
                    passwordVariable: 'PASS'
                )]) {
                    sh '''
                      echo $PASS | docker login -u $USER --password-stdin
                      docker push $DOCKERHUB_USER/$IMAGE_NAME:$IMAGE_TAG
                    '''
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                  sed -i "s|your-dockerhub-username/banking-app:v1|$DOCKERHUB_USER/$IMAGE_NAME:$IMAGE_TAG|g" deployment.yaml

                  kubectl apply -f deployment.yaml
                  kubectl apply -f service.yaml
                  kubectl apply -f network-policy.yaml
                  kubectl apply -f kyverno-policy.yaml || true

                  kubectl rollout status deployment/banking-frontend --timeout=5m
                '''
            }
        }
    }

    post {
        success {
            echo "✅ Sprint‑4 Containerization Completed Successfully"
        }
        failure {
            echo "❌ Pipeline Failed — Check Logs"
        }
        always {
            sh 'docker image prune -f || true'
        }
    }
}
