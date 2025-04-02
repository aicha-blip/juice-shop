pipeline {
  agent any

  environment {
    SONARQUBE_TOKEN = credentials('squ_8f777db6012a7010b24b6c9ca19a7d3a23297363')
  }

  stages {
    // Stage 1: Fetch code
    stage('Checkout') {
      steps {
        git branch: 'master', url: 'https://github.com/aicha-blip/juice-shop.git'
      }
    }

    // Stage 2: Software Composition Analysis (SCA)
    stage('SCA Scan') {
      steps {
        dependencyCheck additionalArguments: '--scan . --format HTML --project "JuiceShop"', odcInstallation: 'OWASP-DC'
        dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
        
        // Archive the report in the stage where it's generated
        archiveArtifacts artifacts: '**/dependency-check-report.html', allowEmptyArchive: true
      }
    }

    // Stage 3: SAST with SonarQube
    stage('SAST Scan') {
      steps {
        withSonarQubeEnv('SonarQube') {
          sh '''
            sonar-scanner \
              -Dsonar.projectKey=juice-shop \
              -Dsonar.sources=. \
              -Dsonar.host.url=http://localhost:9000 \
              -Dsonar.login=${SONARQUBE_TOKEN}
          '''
        }
      }
    }

    // Stage 4: Security Gate
    stage('Security Gate') {
      steps {
        script {
          timeout(time: 5, unit: 'MINUTES') {
            def qg = waitForQualityGate()
            if (qg.status != 'OK') {
              error "Pipeline aborted due to SonarQube quality gate: ${qg.status}"
            }
          }
        }
      }
    }

    // Stage 5: Build & Deploy
    stage('Build & Deploy') {
      steps {
        script {
          sh 'docker build -t juice-shop .'
          try {
            sh 'docker stop juice-shop || true'
            sh 'docker rm juice-shop || true'
            sh 'docker run -d --name juice-shop -p 3000:3000 juice-shop'
          } catch (Exception e) {
            echo "Deployment failed: ${e.getMessage()}"
          }
        }
      }
    }
  }

  post {
    always {
      script {
        // Clean workspace after all stages complete
        cleanWs()
      }
    }
    success {
      echo 'Pipeline completed successfully!'
    }
    failure {
      echo 'Pipeline failed!'
    }
  }
}
