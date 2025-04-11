pipeline {
    agent any

    environment {
        SONARQUBE_TOKEN = credentials('SONARQUBE_TOKEN')
        HOST_IP = "10.17.0.85"
        DEPLOYMENT_URL = "http://${HOST_IP}:3000"
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
                    echo "Using host IP: ${HOST_IP}"
                    if (!env.SONARQUBE_TOKEN) {
                        error "SonarQube token not found"
                    }
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
                            --failOnCVSS 0
                        ''', 
                        odcInstallation: 'OWASP-DC'
                        
                        dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
                    } catch (Exception e) {
                        echo "SCA Scan completed with findings"
                        unstable("Vulnerabilities found")
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
                          --health-interval=10s \
                          --health-start-period=60s \
                          --health-retries=3 \
                          juice-shop
                    """
                    
                    // Verify deployment
                    timeout(time: 2, unit: 'MINUTES') {
                        waitUntil {
                            def status = sh(
                                script: "curl -s -o /dev/null -w '%{http_code}' ${DEPLOYMENT_URL} || echo 503",
                                returnStdout: true
                            ).trim()
                            return (status == "200")
                        }
                    }
                    echo "Application ready at ${DEPLOYMENT_URL}"
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: '**/*.log,**/*.json'
        }
        
        success {
            emailext (
                subject: "SUCCESS: ${env.JOB_NAME}",
                body: """
                    Juice Shop deployed successfully!
                    URL: ${DEPLOYMENT_URL}
                    Build: ${env.BUILD_URL}
                """,
                to: 'aichabenzouina4@gmail.com'
            )
        }
        
        failure {
            script {
                sh 'docker logs juice-shop > container-failure.log 2>&1'
                archiveArtifacts artifacts: 'container-failure.log'
                
                emailext (
                    subject: "FAILED: ${env.JOB_NAME}",
                    body: """
                        Build failed!
                        Error: ${currentBuild.currentResult}
                        Host IP: ${HOST_IP}
                        Logs: ${env.BUILD_URL}artifact/container-failure.log
                    """,
                    to: 'aichabenzouina4@gmail.com',
                    attachmentsPattern: 'container-failure.log'
                )
            }
        }
    }
}
