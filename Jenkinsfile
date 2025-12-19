pipeline {
  agent any

  environment {
    IMAGE_NAME = "manahyl/banking-app"
    IMAGE_TAG  = "${BUILD_NUMBER}"
    DOCKER_CONFIG = "${WORKSPACE}/.docker"
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
        sh '''
          mkdir -p $DOCKER_CONFIG
        '''
      }
    }

    stage('Build Docker Image') {
      steps {
        sh '''
          docker build -t $IMAGE_NAME:$IMAGE_TAG .
        '''
      }
    }

    stage('Trivy Scan') {
      steps {
        sh '''
          trivy image --exit-code 0 --severity HIGH,CRITICAL $IMAGE_NAME:$IMAGE_TAG
        '''
      }
    }

    stage('Push Image') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-credentials',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh '''
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
            docker push $IMAGE_NAME:$IMAGE_TAG
          '''
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        sh '''
          sed -i "s|your-dockerhub-username/banking-app:v1|$IMAGE_NAME:$IMAGE_TAG|g" k8s/deployment.yaml
          kubectl apply -f k8s/
          kubectl rollout status deployment/banking-frontend --timeout=180s
        '''
      }
    }
  }

  post {
    always {
      sh 'docker image prune -f || true'
    }
    success {
      echo "✅ PIPELINE SUCCESS"
    }
    failure {
      echo "❌ PIPELINE FAILED"
    }
  }
}
