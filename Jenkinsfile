pipeline {
    agent any

    environment {
        IMAGE_NAME     = "bankingapp"
        IMAGE_TAG      = "${BUILD_NUMBER}"
        DOCKERHUB_REPO = "manahyl/banking-app"
        KUBECONFIG     = "/var/lib/jenkins/.kube/config"
        SONARQUBE_ENV  = "sonarqube"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv("${SONARQUBE_ENV}") {
                    sh """
                      sonar-scanner \
                      -Dsonar.projectKey=bankingapp \
                      -Dsonar.sources=.
                    """
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh """
                  trivy image \
                  --severity HIGH,CRITICAL \
                  --exit-code 0 \
                  ${IMAGE_NAME}:${IMAGE_TAG}
                """
            }
        }

        stage('Push Image to DockerHub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                      echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin
                      docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${DOCKERHUB_REPO}:${IMAGE_TAG}
                      docker push ${DOCKERHUB_REPO}:${IMAGE_TAG}
                    """
                }
            }
        }

        stage('OWASP ZAP Scan') {
            steps {
                sh """
                  docker run --rm \
                  -v \$(pwd):/zap/wrk \
                  owasp/zap2docker-stable \
                  zap-baseline.py \
                  -t http://localhost:8080 || true
                """
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh """
                  sed -i 's|IMAGE_TAG|${IMAGE_TAG}|g' kubernetes/deployment.yaml
                  kubectl apply -f kubernetes/ --validate=false || echo 'K8s skipped'
                """
            }
        }

        stage('Deploy Falco Runtime Security') {
            steps {
                sh """
                  kubectl apply -f https://raw.githubusercontent.com/falcosecurity/falco/master/deploy/kubernetes/falco.yaml || true
                """
            }
        }

        stage('Simulate SOC Alert') {
            steps {
                sh """
                  echo "⚠️ Suspicious activity detected in container" >> soc-alert.log
                """
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f'
        }
        success {
            echo '✅ DevSecOps Pipeline Completed Successfully'
        }
        failure {
            echo '❌ Pipeline Failed – Check Logs'
        }
    }
}
