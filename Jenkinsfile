pipeline {
    agent any

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

        stage('Tooling Setup') {
            steps {
                script {
                    echo "Installing DevSecOps tools..."

                    sh '''
                      sudo apt-get update

                      # Base tools
                      sudo apt-get install -y wget apt-transport-https gnupg lsb-release curl

                      # Trivy
                      if ! command -v trivy >/dev/null 2>&1; then
                        wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | apt-key add -
                        echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" > /etc/apt/sources.list.d/trivy.list
                        apt-get update
                        apt-get install -y trivy
                      fi

                      # Kubectl
                      if ! command -v kubectl >/dev/null 2>&1; then
                        curl -LO https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl
                        chmod +x kubectl
                        mv kubectl /usr/local/bin/
                      fi
                    '''
                }
            }
        }

        stage('Verify Kubernetes Cluster') {
            steps {
                sh 'kubectl version --client'
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

        stage('Push to Registry') {
            when {
                expression { env.DOCKERHUB_USERNAME != null }
            }
            steps {
                sh '''
                  echo "$DOCKERHUB_PASSWORD" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
                  docker tag $DOCKER_IMAGE $DOCKERHUB_USERNAME/$DOCKER_IMAGE
                  docker push $DOCKERHUB_USERNAME/$DOCKER_IMAGE
                '''
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh 'kubectl apply -f k8s/'
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f'
        }
        failure {
            echo '❌ Pipeline failed! Check logs.'
        }
        success {
            echo '✅ Pipeline completed successfully!'
        }
    }
}
