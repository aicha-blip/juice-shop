pipeline {
  agent any

  environment {
    SONARQUBE_TOKEN = credentials('SONARQUBE_TOKEN')
    COMPUTER_NAME = "DESKTOP-ABC123"  // ← Replace with your computer name
    DOCKER_HOSTNAME = "${COMPUTER_NAME}.local"
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
          echo "Using SonarQube token: ${SONARQUBE_TOKEN.replaceAll('.', '*')}"
          echo "Using hostname: ${DOCKER_HOSTNAME}"
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        script {
          def scannerHome = tool 'SonarQubeScanner'
          withSonarQubeEnv('SonarQube') {
            sh """
              ${scannerHome}/bin/sonar-scanner \
              -Dsonar.projectKey=juice-shop \
              -Dsonar.sources=. \
              -Dsonar.host.url=http://${DOCKER_HOSTNAME}:9000 \
              -Dsonar.login=${SONARQUBE_TOKEN}
            """
          }
        }
      }
    }

    stage('SCA Scan') {
      steps {
        script {
          try {
            dependencyCheck additionalArguments: '''
              --scan . \
              --format HTML \
              --format XML \
              --project "JuiceShop" \
              --disableRetireJS \
              --failOnCVSS 0''', 
              odcInstallation: 'OWASP-DC'
            
            dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
            archiveArtifacts artifacts: '**/dependency-check-report.*', allowEmptyArchive: true
            
          } catch (Exception e) {
            echo "SCA Scan completed with findings (not failing pipeline)"
            unstable("Dependency-Check found vulnerabilities")
          }
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 5, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: false
        }
      }
    }

    stage('Build & Deploy') {
      when {
        expression { currentBuild.resultIsBetterOrEqualTo('UNSTABLE') }
      }
      steps {
        script {
          // Build with cleanup
          sh 'docker build --no-cache -t juice-shop .'
          
          // Stop old container if exists
          sh 'docker stop juice-shop || true'
          sh 'docker rm juice-shop || true'
          
          // Run with health checks and hostname binding
          sh """
            docker run -d \
              --name juice-shop \
              -p 3000:3000 \
              --add-host=${DOCKER_HOSTNAME}:host-gateway \
              --health-cmd="curl -f http://localhost:3000 || exit 1" \
              --health-interval=10s \
              --health-start-period=60s \
              --health-retries=3 \
              juice-shop
          """
          
          // Verify deployment
          timeout(time: 2, unit: 'MINUTES') {
            waitUntil {
              def status = sh(
                script: "curl -s -o /dev/null -w '%{http_code}' http://${DOCKER_HOSTNAME}:3000",
                returnStdout: true
              ).trim()
              return (status == "200")
            }
          }
        }
      }
    }
  }

  post {
    always {
      echo "Pipeline completed with status: ${currentBuild.currentResult}"
      archiveArtifacts artifacts: '**/*report.*,**/docker-build.log', allowEmptyArchive: true
    }
    success {
      echo "Pipeline succeeded! Application deployed to http://${DOCKER_HOSTNAME}:3000"
    }
    failure {
      echo 'Pipeline failed! Check security scan results'
      script {
        sh 'docker logs juice-shop > container-failure.log 2>&1'
        archiveArtifacts artifacts: 'container-failure.log'
        
        if (env.EMAIL_ENABLED == 'true') {
          mail to: 'aichabenzouina4@gmail.com',
               subject: "Pipeline Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
               body: """Check failed pipeline at ${env.BUILD_URL}
                      Failed stage: ${currentBuild.currentResult}
                      Last logs: ${sh(script: 'tail -n 50 container-failure.log', returnStdout: true)}"""
        }
      }
    }
  }
}
