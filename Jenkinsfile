pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "bankingapp:latest"
        KUBECONFIG = "/var/lib/jenkins/.kube/config"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Tooling Setup') {
            steps {
                sh '''
                  sudo apt-get update
                  sudo apt-get install -y wget apt-transport-https gnupg lsb-release curl

                  if ! command -v trivy >/dev/null; then
                    wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
                    echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/trivy.list
                    sudo apt-get update
                    sudo apt-get install -y trivy
                  fi

                  if ! command -v kubectl >/dev/null; then
                    curl -LO https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl
                    chmod +x kubectl
                    sudo mv kubectl /usr/local/bin/
                  fi
                '''
            }
        }

        stage('Verify Kubernetes Cluster') {
            steps {
                sh '''
                  kubectl config use-context minikube
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
                sh 'trivy image --severity HIGH,CRITICAL $DOCKER_IMAGE'
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
            sh 'docker image prune -f || true'
        }
        success {
            echo '✅ Pipeline completed successfully!'
        }
        failure {
            echo '❌ Pipeline failed! Check logs.'
        }
    }
}
