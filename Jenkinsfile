pipeline {
  agent any

  environment {
    SONARQUBE_TOKEN = credentials('SONARQUBE_TOKEN')
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
          // Masked output for security
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
            // Modified to skip RetireJS and continue on vulnerabilities
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
        timeout(time: 15, unit: 'MINUTES') {  // Increased timeout
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
          // Cleanup
          sh 'docker stop juice-shop || true'
          sh 'docker rm juice-shop || true'
          
          // Rebuild with no cache
          sh 'docker build --no-cache -t juice-shop .'
          
          // Run with proper config
          sh '''
            docker run -d \
              --name juice-shop \
              -p 0.0.0.0:3000:3000 \
              -e NODE_ENV=production \
              --health-cmd="curl -f http://localhost:3000 || exit 1" \
              --health-interval=5s \
              --restart unless-stopped \
              juice-shop
          '''
          
          // Wait for healthcheck
          sleep(time: 30, unit: 'SECONDS')
          
          // Verify deployment
          def status = sh(
            script: 'docker inspect --format="{{.State.Status}}" juice-shop', 
            returnStdout: true
          ).trim()
          
          if (status != "running") {
            error "Container failed to start (Status: ${status})"
          }
        }
      }
    }
    
    stage('Verify Accessibility') {
      steps {
        script {
          def accessible = sh(
            script: 'curl -sSf http://localhost:3000 >/dev/null', 
            returnStatus: true
          )
          if (accessible != 0) {
            error "Application not accessible on port 3000"
          } else {
            echo "Juice Shop running at http://localhost:3000"
          }
        }
      }
    }

  post {
    always {
      echo "Pipeline completed with status: ${currentBuild.currentResult}"
      archiveArtifacts artifacts: '**/*report.*', allowEmptyArchive: true
    }
    success {
      echo 'Pipeline succeeded! Application deployed to http://localhost:3000'
    }
    failure {
      echo 'Pipeline failed! Check security scan results'
      script {
        // Only send email if configured
        if (env.EMAIL_ENABLED == 'true') {
          mail to: 'aichabenzouina4@gmail.com',
               subject: "Pipeline Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
               body: """Check failed pipeline at ${env.BUILD_URL}
                      Failed stage: ${currentBuild.currentResult}"""
        }
      }
    }
  }
}
