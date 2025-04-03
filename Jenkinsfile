pipeline {
  agent any

  environment {
    SONARQUBE_TOKEN = credentials('squ_8f777db6012a7010b24b6c9ca19a7d3a23297363')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('SCA Scan') {
      steps {
        dependencyCheck additionalArguments: '--scan . --format HTML --project "JuiceShop"', odcInstallation: 'OWASP-DC'
        dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
        archiveArtifacts artifacts: '**/dependency-check-report.html', allowEmptyArchive: true
      }
    }

    stage('SAST Scan') {
      steps {
        withSonarQubeEnv('SonarQube') {
          sh """
            sonar-scanner \
              -Dsonar.projectKey=juice-shop \
              -Dsonar.sources=. \
              -Dsonar.host.url=http://sonarqube:9000 \
              -Dsonar.login=${SONARQUBE_TOKEN}
          """
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 5, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('Build & Deploy') {
      steps {
        script {
          sh 'docker build -t juice-shop .'
          try {
            sh 'docker stop juice-shop || true'
            sh 'docker rm juice-shop || true'
            sh 'docker run -d --name juice-shop -p 3000:3000 juice-shop'
          } catch (Exception e) {
            error "Deployment failed: ${e.getMessage()}"
          }
        }
      }
    }
  }

  post {
    always {
      echo "Pipeline completed with status: ${currentBuild.currentResult}"
    }
    success {
      echo 'Pipeline succeeded!'
    }
    failure {
      echo 'Pipeline failed!'
      mail to: 'team@example.com',
           subject: "Failed Pipeline: ${currentBuild.fullDisplayName}",
           body: "Check failed pipeline at ${env.BUILD_URL}"
    }
  }
}
