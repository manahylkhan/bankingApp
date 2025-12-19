pipeline {
    agent any

    environment {
        DOCKER_HUB_USER = 'manahyl'
        APP_NAME = 'secure-bank-pro'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Tooling Setup') {
            steps {
                script {
                    echo 'Installing DevSecOps Tools (Trivy, Kubectl, Helm, Terraform)...'
                    sh '''
                        # Install Trivy
                        if ! command -v trivy &> /dev/null; then
                            sudo apt-get install wget apt-transport-https gnupg lsb-release -y
                            wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
                            echo deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main | sudo tee -a /etc/apt/sources.list.d/trivy.list
                            sudo apt-get update
                            sudo apt-get install trivy -y
                        fi

                        # Install Kubectl
                        if ! command -v kubectl &> /dev/null; then
                            sudo curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
                            sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
                        fi

                        # Install Helm
                        if ! command -v helm &> /dev/null; then
                            curl https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | bash
                        fi
                    '''
                }
            }
        }

        stage('Build & Scan') {
            steps {
                sh "docker build -t ${DOCKER_HUB_USER}/${APP_NAME}:${IMAGE_TAG} ."
                // High-severity check: if found, build will fail
                sh "trivy image --exit-code 1 --severity CRITICAL ${DOCKER_HUB_USER}/${APP_NAME}:${IMAGE_TAG}"
            }
        }

        stage('Push to Registry') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                    sh "echo ${PASS} | docker login -u ${USER} --password-stdin"
                    sh "docker push ${DOCKER_HUB_USER}/${APP_NAME}:${IMAGE_TAG}"
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                // Update image in YAML and Apply
                sh "sed -i 's|IMAGE_PLACEHOLDER|${DOCKER_HUB_USER}/${APP_NAME}:${IMAGE_TAG}|g' kubernetes/deployment.yaml"
                sh "kubectl apply -f kubernetes/"
            }
        }

        stage('Observability (Prometheus/Grafana)') {
            steps {
                sh '''
                    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
                    helm repo update
                    helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
                         --namespace monitoring --create-namespace
                '''
            }
        }
    }
}
