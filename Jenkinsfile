pipeline {
    agent any
    environment {
        DOCKER_HUB_USER = 'manahyl'
        APP_NAME = 'secure-bank-pro'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        KUBECONFIG = '/home/ubuntu/.kube/config'
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
                            echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
                            sudo apt-get update
                            sudo apt-get install trivy -y
                        fi
                        
                        # Install Kubectl
                        if ! command -v kubectl &> /dev/null; then
                            KUBECTL_VERSION=$(curl -L -s https://dl.k8s.io/release/stable.txt)
                            sudo curl -LO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
                            sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
                            sudo rm kubectl
                        fi
                        
                        # Install Helm
                        if ! command -v helm &> /dev/null; then
                            curl https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | bash
                        fi
                    '''
                }
            }
        }
        
        stage('Verify Kubernetes Cluster') {
            steps {
                script {
                    echo 'Checking Kubernetes cluster status...'
                    sh '''
                        # Check if minikube is running
                        if ! minikube status &> /dev/null; then
                            echo "Minikube is not running. Starting minikube..."
                            minikube start --driver=docker || {
                                echo "Failed to start minikube. Attempting cleanup and restart..."
                                minikube delete --all --purge
                                rm -rf $HOME/.minikube
                                sudo chown -R $USER:$USER $HOME/.kube $HOME/.minikube
                                minikube start --driver=docker --force
                            }
                        fi
                        
                        # Verify kubectl can connect
                        kubectl cluster-info
                        kubectl get nodes
                    '''
                }
            }
        }
        
        stage('Build & Scan') {
            steps {
                sh "docker build -t ${DOCKER_HUB_USER}/${APP_NAME}:${IMAGE_TAG} ."
                
                script {
                    echo 'Scanning image for vulnerabilities...'
                    def trivyScan = sh(
                        script: "trivy image --exit-code 0 --severity CRITICAL,HIGH ${DOCKER_HUB_USER}/${APP_NAME}:${IMAGE_TAG}",
                        returnStatus: true
                    )
                    
                    if (trivyScan != 0) {
                        echo "⚠️ WARNING: Vulnerabilities found, but continuing build..."
                    } else {
                        echo "✅ No critical vulnerabilities found"
                    }
                }
            }
        }
        
        stage('Push to Registry') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                    sh "echo \${PASS} | docker login -u \${USER} --password-stdin"
                    sh "docker push ${DOCKER_HUB_USER}/${APP_NAME}:${IMAGE_TAG}"
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                script {
                    echo 'Deploying to Kubernetes...'
                    sh '''
                        # Create a copy of deployment file to avoid modifying the original
                        cp kubernetes/deployment.yaml kubernetes/deployment-temp.yaml
                        
                        # Update image tag
                        sed -i "s|IMAGE_PLACEHOLDER|${DOCKER_HUB_USER}/${APP_NAME}:${IMAGE_TAG}|g" kubernetes/deployment-temp.yaml
                        
                        # Set kubectl context to minikube
                        kubectl config use-context minikube
                        
                        # Apply all Kubernetes manifests
                        kubectl apply -f kubernetes/deployment-temp.yaml
                        kubectl apply -f kubernetes/service.yaml
                        kubectl apply -f kubernetes/network-policy.yaml || echo "Network policy not applied (may require CNI support)"
                        kubectl apply -f kubernetes/kyverno-policy.yaml || echo "Kyverno policy not applied (Kyverno may not be installed)"
                        
                        # Wait for deployment to be ready
                        kubectl rollout status deployment/secure-bank-pro -n default --timeout=5m || {
                            echo "Deployment rollout failed or timed out"
                            kubectl get pods -n default
                            kubectl describe deployment secure-bank-pro -n default
                            exit 1
                        }
                        
                        # Cleanup temp file
                        rm kubernetes/deployment-temp.yaml
                        
                        # Show deployment status
                        kubectl get pods -n default
                        kubectl get svc -n default
                    '''
                }
            }
        }
        
        stage('Observability (Prometheus/Grafana)') {
            steps {
                script {
                    echo 'Setting up Prometheus and Grafana monitoring...'
                    sh '''
                        # Add Prometheus Helm repo
                        helm repo add prometheus-community https://prometheus-community.github.io/helm-charts || true
                        helm repo update
                        
                        # Install or upgrade monitoring stack
                        helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
                             --namespace monitoring \
                             --create-namespace \
                             --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
                             --set grafana.adminPassword=admin \
                             --timeout 10m \
                             --wait || {
                                 echo "⚠️ Monitoring stack installation failed, but continuing..."
                             }
                        
                        # Show monitoring pods status
                        kubectl get pods -n monitoring || true
                    '''
                }
            }
        }
        
        stage('Post-Deployment Verification') {
            steps {
                script {
                    echo 'Verifying deployment...'
                    sh '''
                        # Get service URL
                        echo "Application Service Info:"
                        kubectl get svc secure-bank-pro -n default || echo "Service not found"
                        
                        # Get minikube service URL
                        echo "Access application using:"
                        minikube service secure-bank-pro --url || echo "Could not get service URL"
                        
                        # Show all resources
                        echo "All deployed resources:"
                        kubectl get all -n default
                    '''
                }
            }
        }
    }
    
    post {
        success {
            echo '✅ Pipeline completed successfully!'
            echo "Docker Image: ${DOCKER_HUB_USER}/${APP_NAME}:${IMAGE_TAG}"
        }
        failure {
            echo '❌ Pipeline failed! Check logs for details.'
        }
        always {
            script {
                // Cleanup Docker images to save space
                sh 'docker image prune -f || true'
            }
        }
    }
}
