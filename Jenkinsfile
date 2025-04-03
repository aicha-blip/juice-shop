pipeline {
  agent any

  environment {
    // Make sure this credential ID exists in Jenkins
    SONARQUBE_TOKEN = credentials('SONARQUBE_TOKEN') 
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('SonarQube Analysis') {
      def scannerHome = tool 'SonarQubeScanner';
      withSonarQubeEnv() {
        sh "${scannerHome}/bin/sonar-scanner"
      }
    }

    stage('Verify Environment') {
      steps {
        script {
          // Verify SonarQube token is available
          if (!env.SONARQUBE_TOKEN) {
            error "SonarQube token not found in credentials"
          }
          echo "Using SonarQube token: ${SONARQUBE_TOKEN}"
        }
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
        script {
          try {
            withSonarQubeEnv('SonarQube') {
              sh """
                sonar-scanner \
                  -Dsonar.projectKey=juice-shop \
                  -Dsonar.sources=. \
                  -Dsonar.host.url=http://127.0.0.1:9000 \
                  -Dsonar.login=${SONARQUBE_TOKEN}
              """
            }
          } catch (Exception e) {
            error "SonarQube scan failed: ${e.getMessage()}"
          }
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
      // Archive important files if needed
      archiveArtifacts artifacts: '**/dependency-check-report.*', allowEmptyArchive: true
    }
    success {
      echo 'Pipeline succeeded!'
    }
    failure {
      echo 'Pipeline failed!'
      // Only try to send email if mail server is configured
      script {
        if (env.JENKINS_MAIL_SERVER_CONFIGURED == 'true') {
          mail to: 'aichabenzouina4@gmail.com',
               subject: "Failed Pipeline: ${currentBuild.fullDisplayName}",
               body: "Check failed pipeline at ${env.BUILD_URL}"
        }
      }
    }
  }
}
