pipeline {
  agent any

  environment {
    SONARQUBE_TOKEN = credentials('SONARQUBE_TOKEN')
    HOST_IP = "10.17.0.154" 
    DEPLOYMENT_URL = "http://${HOST_IP}:3000"
  }

  stages {
    stage('Build') {
      steps {
        script {
          echo "Building Juice Shop container (IP: ${HOST_IP})"
          sh 'docker build --no-cache -t juice-shop . | tee docker-build.log'
          archiveArtifacts artifacts: 'docker-build.log'
        }
      }
    }

    stage('Deploy') {
      steps {
        script {
          // Force remove any existing container
          sh 'docker rm -f juice-shop || true'
          
          // Run with explicit IP binding
          sh """
            docker run -d \
              --name juice-shop \
              -p ${HOST_IP}:3000:3000 \
              --restart unless-stopped \
              juice-shop
          """
          
          // Verify deployment (retry for 3 minutes)
          def deployed = false
          def attempts = 0
          while(!deployed && attempts < 18) {
            attempts++
            try {
              def status = sh(
                script: "curl -s -o /dev/null -w '%{http_code}' ${DEPLOYMENT_URL} || echo 503",
                returnStdout: true
              ).trim()
              
              if (status == "200") {
                deployed = true
                echo "Application is live at ${DEPLOYMENT_URL}"
              } else {
                echo "Attempt ${attempts}/18: Service not ready (Status: ${status})"
                sleep(time: 10, unit: 'SECONDS')
              }
            } catch (Exception e) {
              echo "Attempt ${attempts}/18: Connection failed"
              sleep(time: 10, unit: 'SECONDS')
            }
          }
          
          if (!deployed) {
            error "Deployment failed - Application not reachable at ${DEPLOYMENT_URL}"
          }
        }
      }
    }
  }

  post {
    always {
      echo "Collecting deployment logs..."
      sh """
        docker inspect juice-shop > container-inspect.json
        docker logs juice-shop > container-logs.log 2>&1
        netstat -tuln | grep 3000 > port-check.log || true
      """
      archiveArtifacts artifacts: '*.log,*.json'
    }
    
    failure {
      script {
        echo "TROUBLESHOOTING TIPS:"
        echo "1. Verify your IP is still ${HOST_IP} (run: ipconfig)"
        echo "2. Check port 3000 is open (run: netstat -ano | grep 3000)"
        echo "3. Test manual access: curl -v ${DEPLOYMENT_URL}"
        
        mail to: 'aichabenzouina4@gmail.com',
             subject: "Deployment Failed - Manual Action Required",
             body: """
               Deployment to ${DEPLOYMENT_URL} failed.
               
               REQUIRED ACTIONS:
               1. Verify your current IP address
               2. Check if port 3000 is available
               3. Review attached logs
               
               Last error:
               ${sh(script: 'tail -n 50 container-logs.log', returnStdout: true)}
             """
      }
    }
  }
}
