pipeline {
  agent any

  environment {
    SONARQUBE_TOKEN = credentials('SONARQUBE_TOKEN')
    SONARQUBE_URL = 'http://sonarqube:9000'
  }

  tools {
    sonarqubeScanner 'SonarQubeScanner'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Verify Environment') {
      steps {
        script {
          if (!env.SONARQUBE_TOKEN) {
            error "SonarQube token not found in credentials"
          }
          // Safe logging without exposing credentials
          echo "SonarQube token is configured" 
          echo "Using SonarQube server at: ${SONARQUBE_URL}"
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        script {
          withSonarQubeEnv('SonarQube') {
            sh '''
              sonar-scanner \
                -Dsonar.projectKey=juice-shop \
                -Dsonar.sources=. \
                -Dsonar.host.url=${SONARQUBE_URL} \
                -Dsonar.login=${SONARQUBE_TOKEN}
            '''
          }
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
      archiveArtifacts artifacts: '**/dependency-check-report.*', allowEmptyArchive: true
    }
    success {
      echo 'Pipeline succeeded!'
    }
    failure {
      echo 'Pipeline failed!'
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
