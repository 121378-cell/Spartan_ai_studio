/**
 * Sistema Central de Monitorización Continua
 * Monitorea errores de Foreign Key, validación y configuración de tests
 */

const fs = require('fs');
const path = require('path');
const { DatabaseMonitor } = require('./database-monitor');
const { ValidationMonitor } = require('./validation-monitor');
const { TestMonitor } = require('./test-monitor');
const { AlertSystem } = require('./alert-system');
const { MetricsCollector } = require('./metrics-collector');

class MonitoringSystem {
  constructor(configPath = './monitoring-config.json') {
    this.config = this.loadConfig(configPath);
    this.isRunning = false;
    this.monitors = [];
    this.alertSystem = new AlertSystem(this.config.alerts);
    this.metricsCollector = new MetricsCollector();
    
    this.initializeMonitors();
  }

  /**
   * Cargar configuración del sistema de monitorización
   */
  loadConfig(configPath) {
    try {
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
    } catch (error) {
      console.warn('No se pudo cargar la configuración, usando valores por defecto');
    }

    return {
      monitoring: {
        interval: 60000, // 1 minuto
        enabled: true,
        checks: {
          database: true,
          validation: true,
          tests: true
        }
      },
      alerts: {
        email: {
          enabled: false,
          recipients: []
        },
        slack: {
          enabled: false,
          webhook: ''
        },
        thresholds: {
          errorRate: 0.05, // 5%
          responseTime: 5000, // 5 segundos
          testFailureRate: 0.1 // 10%
        }
      },
      metrics: {
        retentionDays: 30,
        collectionInterval: 300000 // 5 minutos
      }
    };
  }

  /**
   * Inicializar monitores
   */
  initializeMonitors() {
    if (this.config.monitoring.checks.database) {
      const dbMonitor = new DatabaseMonitor(this.config.monitoring.interval);
      dbMonitor.on('error', this.handleDatabaseError.bind(this));
      dbMonitor.on('foreign_key_violation', this.handleForeignKeyViolation.bind(this));
      this.monitors.push(dbMonitor);
    }

    if (this.config.monitoring.checks.validation) {
      const validationMonitor = new ValidationMonitor(this.config.monitoring.interval);
      validationMonitor.on('inconsistent_message', this.handleInconsistentMessage.bind(this));
      validationMonitor.on('generic_message', this.handleGenericMessage.bind(this));
      this.monitors.push(validationMonitor);
    }

    if (this.config.monitoring.checks.tests) {
      const testMonitor = new TestMonitor(this.config.monitoring.interval);
      testMonitor.on('test_failure', this.handleTestFailure.bind(this));
      testMonitor.on('configuration_issue', this.handleConfigurationIssue.bind(this));
      this.monitors.push(testMonitor);
    }
  }

  /**
   * Iniciar el sistema de monitorización
   */
  start() {
    if (this.isRunning) {
      console.log('El sistema de monitorización ya está en ejecución');
      return;
    }

    console.log('🚀 Iniciando sistema de monitorización continua...');
    
    this.isRunning = true;
    
    // Iniciar todos los monitores
    this.monitors.forEach(monitor => {
      monitor.start();
      console.log(`✅ Monitor ${monitor.constructor.name} iniciado`);
    });

    // Iniciar recolector de métricas
    this.metricsCollector.start(this.config.metrics.collectionInterval);
    console.log('📊 Recolector de métricas iniciado');

    // Iniciar reporte periódico
    this.startPeriodicReporting();

    console.log('✅ Sistema de monitorización iniciado exitosamente');
  }

  /**
   * Detener el sistema de monitorización
   */
  stop() {
    if (!this.isRunning) {
      console.log('El sistema de monitorización no está en ejecución');
      return;
    }

    console.log('🛑 Deteniendo sistema de monitorización...');

    this.isRunning = false;

    // Detener todos los monitores
    this.monitors.forEach(monitor => {
      monitor.stop();
      console.log(`❌ Monitor ${monitor.constructor.name} detenido`);
    });

    // Detener recolector de métricas
    this.metricsCollector.stop();
    console.log('📊 Recolector de métricas detenido');

    console.log('✅ Sistema de monitorización detenido exitosamente');
  }

  /**
   * Iniciar reporte periódico
   */
  startPeriodicReporting() {
    setInterval(() => {
      this.generateReport();
    }, this.config.monitoring.interval * 10); // Reporte cada 10 ciclos
  }

  /**
   * Generar reporte de monitoreo
   */
  generateReport() {
    const metrics = this.metricsCollector.getMetrics();
    const report = {
      timestamp: new Date().toISOString(),
      systemStatus: this.getSystemStatus(),
      metrics: metrics,
      issues: this.getRecentIssues(),
      recommendations: this.getRecommendations()
    };

    console.log('📋 Reporte de monitoreo generado:');
    console.log(JSON.stringify(report, null, 2));

    // Guardar reporte
    this.saveReport(report);

    // Enviar alertas si es necesario
    this.checkAlerts(report);
  }

  /**
   * Obtener estado del sistema
   */
  getSystemStatus() {
    const activeMonitors = this.monitors.filter(m => m.isActive());
    const totalMonitors = this.monitors.length;
    
    return {
      running: this.isRunning,
      activeMonitors: activeMonitors.length,
      totalMonitors: totalMonitors,
      health: activeMonitors.length === totalMonitors ? 'healthy' : 'degraded'
    };
  }

  /**
   * Obtener problemas recientes
   */
  getRecentIssues() {
    const issues = [];
    
    this.monitors.forEach(monitor => {
      const recentIssues = monitor.getRecentIssues();
      issues.push(...recentIssues);
    });

    return issues.slice(-10); // Últimos 10 problemas
  }

  /**
   * Obtener recomendaciones
   */
  getRecommendations() {
    const recommendations = [];
    const metrics = this.metricsCollector.getMetrics();

    // Recomendaciones basadas en métricas
    if (metrics.errorRate > this.config.alerts.thresholds.errorRate) {
      recommendations.push({
        type: 'error_rate',
        message: 'La tasa de errores está por encima del umbral. Revisar logs y solucionar problemas críticos.',
        priority: 'high'
      });
    }

    if (metrics.testFailureRate > this.config.alerts.thresholds.testFailureRate) {
      recommendations.push({
        type: 'test_failures',
        message: 'La tasa de fallas en tests está por encima del umbral. Revisar configuración de tests.',
        priority: 'medium'
      });
    }

    if (metrics.responseTime > this.config.alerts.thresholds.responseTime) {
      recommendations.push({
        type: 'performance',
        message: 'El tiempo de respuesta está por encima del umbral. Optimizar consultas y procesos.',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Manejar errores de base de datos
   */
  handleDatabaseError(error) {
    console.error('❌ Error de base de datos detectado:', error.message);
    
    this.alertSystem.sendAlert({
      type: 'database_error',
      severity: 'high',
      message: `Error de base de datos: ${error.message}`,
      timestamp: new Date().toISOString()
    });

    this.metricsCollector.recordError('database', error.message);
  }

  /**
   * Manejar violaciones de Foreign Key
   */
  handleForeignKeyViolation(violation) {
    console.error('🔗 Violación de Foreign Key detectada:', violation);
    
    this.alertSystem.sendAlert({
      type: 'foreign_key_violation',
      severity: 'critical',
      message: `Violación de Foreign Key: ${violation.table} -> ${violation.referencedTable}`,
      details: violation,
      timestamp: new Date().toISOString()
    });

    this.metricsCollector.recordError('foreign_key', violation.message);
  }

  /**
   * Manejar mensajes de validación inconsistentes
   */
  handleInconsistentMessage(message) {
    console.warn('⚠️ Mensaje de validación inconsistente detectado:', message);
    
    this.alertSystem.sendAlert({
      type: 'validation_message',
      severity: 'medium',
      message: `Mensaje de validación inconsistente: ${message.field}`,
      details: message,
      timestamp: new Date().toISOString()
    });

    this.metricsCollector.recordIssue('validation_message', message.field);
  }

  /**
   * Manejar mensajes de validación genéricos
   */
  handleGenericMessage(message) {
    console.warn('📝 Mensaje de validación genérico detectado:', message);
    
    this.alertSystem.sendAlert({
      type: 'generic_validation_message',
      severity: 'low',
      message: `Mensaje de validación genérico: ${message.message}`,
      details: message,
      timestamp: new Date().toISOString()
    });

    this.metricsCollector.recordIssue('generic_message', message.message);
  }

  /**
   * Manejar fallas en tests
   */
  handleTestFailure(failure) {
    console.error('🧪 Test fallido detectado:', failure.testName);
    
    this.alertSystem.sendAlert({
      type: 'test_failure',
      severity: 'medium',
      message: `Test fallido: ${failure.testName}`,
      details: failure,
      timestamp: new Date().toISOString()
    });

    this.metricsCollector.recordTestFailure(failure.testName);
  }

  /**
   * Manejar problemas de configuración
   */
  handleConfigurationIssue(issue) {
    console.error('⚙️ Problema de configuración detectado:', issue);
    
    this.alertSystem.sendAlert({
      type: 'configuration_issue',
      severity: 'medium',
      message: `Problema de configuración: ${issue.type}`,
      details: issue,
      timestamp: new Date().toISOString()
    });

    this.metricsCollector.recordIssue('configuration', issue.type);
  }

  /**
   * Verificar alertas basadas en métricas
   */
  checkAlerts(report) {
    const thresholds = this.config.alerts.thresholds;

    if (report.metrics.errorRate > thresholds.errorRate) {
      this.alertSystem.sendAlert({
        type: 'high_error_rate',
        severity: 'high',
        message: `Tasa de errores alta: ${(report.metrics.errorRate * 100).toFixed(2)}%`,
        details: { threshold: thresholds.errorRate, current: report.metrics.errorRate },
        timestamp: new Date().toISOString()
      });
    }

    if (report.metrics.testFailureRate > thresholds.testFailureRate) {
      this.alertSystem.sendAlert({
        type: 'high_test_failure_rate',
        severity: 'medium',
        message: `Tasa de fallas en tests alta: ${(report.metrics.testFailureRate * 100).toFixed(2)}%`,
        details: { threshold: thresholds.testFailureRate, current: report.metrics.testFailureRate },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Guardar reporte
   */
  saveReport(report) {
    const reportsDir = path.join(__dirname, 'monitoring-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(reportsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  }

  /**
   * Obtener estadísticas del sistema
   */
  getStats() {
    return {
      running: this.isRunning,
      monitors: this.monitors.map(m => ({
        name: m.constructor.name,
        active: m.isActive(),
        lastCheck: m.getLastCheck()
      })),
      metrics: this.metricsCollector.getMetrics(),
      alerts: this.alertSystem.getStats()
    };
  }
}

// Exportar la clase
module.exports = { MonitoringSystem };

// Si se ejecuta directamente, iniciar el sistema
if (require.main === module) {
  const monitoringSystem = new MonitoringSystem();
  
  // Manejar señales de terminación
  process.on('SIGINT', () => {
    console.log('\n🛑 Señal de terminación recibida, deteniendo sistema...');
    monitoringSystem.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Señal de terminación recibida, deteniendo sistema...');
    monitoringSystem.stop();
    process.exit(0);
  });

  // Iniciar sistema
  monitoringSystem.start();
}