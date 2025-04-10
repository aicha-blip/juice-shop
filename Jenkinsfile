pipeline {
  agent any

  environment {
    SONARQUBE_TOKEN = credentials('SONARQUBE_TOKEN')
    //HOST_IP = sh(script: "ip route get 1 | awk '{print \$NF;exit}'", returnStdout: true).trim() // Auto-detect IP
    HOST_IP = 10.17.0.154
    DEPLOYMENT_URL = "http://${HOST_IP}:3000"
  }

  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Verify Environment') {
      steps {
        script {
          if (!env.SONARQUBE_TOKEN) {
            error "SonarQube token not found in credentials"
          }
          echo "Using SonarQube token: ${SONARQUBE_TOKEN.replaceAll('.', '*')}"
          echo "Detected host IP: ${HOST_IP}"
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
              -Dsonar.host.url=http://${HOST_IP}:9000 \
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

    stage('Build') {
      steps {
        script {
          sh 'docker build --no-cache -t juice-shop . | tee docker-build.log'
          archiveArtifacts artifacts: 'docker-build.log'
        }
      }
    }

    stage('Deploy') {
      steps {
        script {
          // Force cleanup
          sh 'docker rm -f juice-shop || true'
          
          // Run with health checks
          sh """
            docker run -d \
              --name juice-shop \
              -p ${HOST_IP}:3000:3000 \
              --health-cmd="curl -f http://localhost:3000 || exit 1" \
              --health-interval=5s \
              --health-start-period=30s \
              --health-retries=3 \
              juice-shop
          """
          
          // Fast verification (60s max)
          def healthy = sh(
            script: "timeout 60 docker inspect --format='{{.State.Health.Status}}' juice-shop | grep -q healthy",
            returnStatus: true
          ) == 0
          
          if (!healthy) {
            sh 'docker logs juice-shop > container-failure.log 2>&1'
            error """Deployment failed! Verify manually:
                   |1. Check IP: ${HOST_IP} (current: $(hostname -I))
                   |2. Test: curl -v ${DEPLOYMENT_URL}
                   |3. See container-failure.log""".stripMargin()
          }
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: '**/*.log,**/*.json'
    }
    
    failure {
      script {
        // Use Jenkins Extended Email with SMTP config
        emailext (
          subject: "FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
          body: """
            Deployment to ${DEPLOYMENT_URL} failed.
            
            Troubleshooting:
            1. Verify host IP: ${HOST_IP}
            2. Check port: netstat -tulnp | grep 3000
            3. Container logs attached
            
            ${sh(script: 'tail -n 30 container-failure.log', returnStdout: true)}
          """,
          to: 'aichabenzouina4@gmail.com',
          attachmentsPattern: '**/container-failure.log',
          replyTo: 'no-reply@jenkins'
        )
      }
    }
  }
}
