pipeline {
  agent any

  environment {
    SONARQUBE_TOKEN = credentials('sqp_967746c1d66d98341fb1b9b854066eea277f685e')  // Uses the token stored in Jenkins
  }

  stages {
    // Stage 1: Fetch code
    stage('Checkout') {
      steps {
        git branch: 'main', url: 'https://github.com/your-username/juice-shop.git'
      }
    }

    // Stage 2: Software Composition Analysis (SCA)
    stage('SCA Scan') {
      steps {
        dependencyCheck additionalArguments: '--scan . --format HTML --project "JuiceShop"', odcInstallation: 'OWASP-DC'
        dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
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
              -Dsonar.host.url=http://localhost:9000
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
        sh 'docker build -t juice-shop .'
        sh 'docker run -d --name juice-shop -p 3000:3000 juice-shop'
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: '**/dependency-check-report.html', allowEmptyArchive: true
      cleanWs()
    }
  }
}
