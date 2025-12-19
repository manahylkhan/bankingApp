pipeline {
    agent {
        docker {
            image 'docker:26.1.3'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    environment {
        DOCKER_IMAGE = "bankingapp:latest"
        KUBECONFIG = '/var/lib/jenkins/.kube/config'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verify Tools') {
            steps {
                sh '''
                  docker --version
                  kubectl version --client || true
                  trivy --version || true
                '''
            }
        }

        stage('Verify Kubernetes Cluster') {
            steps {
                sh '''
                  kubectl config get-contexts
                  kubectl get nodes
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $DOCKER_IMAGE .'
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh 'trivy image --severity HIGH,CRITICAL --no-progress $DOCKER_IMAGE'
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                  kubectl apply -f k8s/
                  kubectl rollout status deployment/secure-bank-pro --timeout=5m
                '''
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f'
        }
        success {
            echo '✅ Pipeline completed successfully!'
        }
        failure {
            echo '❌ Pipeline failed! Check logs.'
        }
    }
}
