pipeline {
  agent any

  environment {
    SONARQUBE_TOKEN = credentials('SONARQUBE_TOKEN')
    DOCKER_BUILD_TIMEOUT_MINUTES = 30  // Changed to integer
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
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        script {
          def scannerHome = tool 'SonarQubeScanner'
          withSonarQubeEnv('SonarQube') {
            sh "/var/jenkins_home/tools/hudson.plugins.sonar.SonarRunnerInstallation/SonarQubeScanner/bin/sonar-scanner -Dsonar.projectKey=juice-shop -Dsonar.sources=. -Dsonar.host.url=http://10.17.0.154:9000 -Dsonar.login=${SONARQUBE_TOKEN}"
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

    stage('Build & Deploy') {
      when {
        expression { currentBuild.resultIsBetterOrEqualTo('UNSTABLE') }
      }
      steps {
        script {
          // Cleanup any existing containers
          sh 'docker stop juice-shop || true'
          sh 'docker rm juice-shop || true'
          
          // Build with timeout as integer
          timeout(time: env.DOCKER_BUILD_TIMEOUT_MINUTES, unit: 'MINUTES') {
            sh '''
              docker build \
                --no-cache \
                --build-arg NODE_ENV=production \
                -t juice-shop . | tee docker-build.log
            '''
            archiveArtifacts artifacts: 'docker-build.log'
          }
          
          // Run container with health checks
          sh '''
            docker run -d \
              --name juice-shop \
              -p 0.0.0.0:3000:3000 \
              -e NODE_ENV=production \
              --health-cmd="curl -f http://localhost:3000/rest/admin/application-version || exit 1" \
              --health-interval=10s \
              --health-start-period=90s \
              --health-timeout=5s \
              --health-retries=3 \
              juice-shop
          '''
          
          // Wait for healthcheck (up to 2 minutes)
          def healthy = false
          def healthCheckAttempts = 12
          for (int i = 0; i < healthCheckAttempts; i++) {
            def health = sh(
              script: 'docker inspect --format="{{.State.Health.Status}}" juice-shop',
              returnStdout: true
            ).trim()
            
            if (health == "healthy") {
              healthy = true
              break
            }
            
            // Collect logs after 3 attempts (30 seconds)
            if (i >= 3) {
              sh 'docker logs juice-shop > container.logs 2>&1'
              archiveArtifacts artifacts: 'container.logs'
            }
            
            sleep(time: 10, unit: 'SECONDS')
          }
          
          if (!healthy) {
            sh 'docker logs juice-shop > container-failure.log 2>&1'
            archiveArtifacts artifacts: 'container-failure.log'
            error "Container failed health checks after ${healthCheckAttempts * 10} seconds. See archived logs."
          }
        }
      }
    }
  }
  
  post {
    always {
      echo "Pipeline completed with status: ${currentBuild.currentResult}"
      archiveArtifacts artifacts: '**/*report.*,**/*.log', allowEmptyArchive: true
    }
    success {
      echo 'Pipeline succeeded! Application deployed to http://<your-server>:3000'
    }
    failure {
      echo 'Pipeline failed! Check security scan results and container logs'
      script {
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
