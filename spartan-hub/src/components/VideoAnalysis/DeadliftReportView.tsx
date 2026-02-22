import React, { useState } from 'react';
import { FormAnalysisResult } from '../../types/pose';
import { 
  FileText, 
  BarChart2, 
  Layers, 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  Activity,
  ArrowRight
} from 'lucide-react';

interface DeadliftReportViewProps {
  result: FormAnalysisResult;
  onRetry: () => void;
  onClose: () => void;
}

type TabType = 'resumen' | 'elementos' | 'cargas' | 'validacion';

export const DeadliftReportView: React.FC<DeadliftReportViewProps> = ({
  result,
  onRetry,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('resumen');

  // Metáforas de Ingeniería Estructural
  const structuralElements = [
    {
      id: 'viga_principal',
      name: 'Viga Principal (Torso/Columna)',
      status: result.metrics?.backAngle && result.metrics.backAngle < 15 ? 'optimal' : 'critical',
      value: `${result.metrics?.backAngle}° desviación`,
      limit: '< 15°',
      load: 'Compresión Axial + Momento Flector',
      material: 'Tejido Óseo/Muscular'
    },
    {
      id: 'columnas_soporte',
      name: 'Columnas de Soporte (Fémur/Tibia)',
      status: result.metrics?.kneeExtension && result.metrics.kneeExtension > 160 ? 'optimal' : 'warning',
      value: `${result.metrics?.kneeExtension}° extensión`,
      limit: '> 160° (Bloqueo)',
      load: 'Compresión',
      material: 'Estructura Ósea'
    },
    {
      id: 'pivote_central',
      name: 'Articulación (Cadera)',
      status: 'optimal', // Asumido
      value: `${result.metrics?.hipHinge}° flexión`,
      limit: 'Rango 45°-90°',
      load: 'Torque Rotacional',
      material: 'Complejo Articular'
    }
  ];

  // Cálculo de Cargas (Estimación Biomecánica Simplificada)
  // Asumiendo un levantador de 80kg y barra de 100kg para el ejemplo
  const userWeight = 80;
  const barWeight = 100;
  const torsoMass = userWeight * 0.48; // ~48% del peso corporal
  const g = 9.81;
  
  // Momento estimado en L5/S1 (Nm)
  // Torque = (M_torso * d_torso) + (M_load * d_load)
  // Asumiendo brazos de palanca estándar basados en el ángulo de la espalda detectado
  const backAngleRad = (result.metrics?.backAngle || 0) * (Math.PI / 180);
  const momentArmFactor = Math.sin(backAngleRad + (45 * Math.PI / 180)); // Simplificación geométrica
  const estimatedTorque = Math.round(((torsoMass * 0.35) + (barWeight * 0.4)) * g * momentArmFactor);

  const downloadCSV = () => {
    const headers = ['Elemento', 'Estado', 'Valor Medido', 'Límite Normativo', 'Tipo de Carga'];
    const rows = structuralElements.map(el => 
      [el.name, el.status, el.value, el.limit, el.load].join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reporte_estructural_peso_muerto.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg overflow-hidden">
      {/* Header Técnico */}
      <div className="bg-slate-900 text-white p-6 border-b border-slate-700">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold font-mono flex items-center gap-2">
              <Activity className="text-blue-400" />
              ANÁLISIS ESTRUCTURAL: PESO MUERTO
            </h2>
            <p className="text-slate-400 text-sm mt-1 font-mono">
              REF: STR-DL-{new Date().toLocaleDateString().replace(/\//g, '')} | NORMATIVA: BIOMECH-2026
            </p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${result.score >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>
              {result.score}/100
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Índice de Integridad</div>
          </div>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="flex border-b border-gray-200 bg-white">
        {[
          { id: 'resumen', label: 'Resumen Ejecutivo', icon: FileText },
          { id: 'elementos', label: 'Elementos Estructurales', icon: Layers },
          { id: 'cargas', label: 'Cálculo de Cargas', icon: BarChart2 },
          { id: 'validacion', label: 'Validación Normativa', icon: CheckCircle },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* VISTA RESUMEN */}
        {activeTab === 'resumen' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Estado General</h3>
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-full ${result.score >= 80 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    {result.score >= 80 ? <CheckCircle className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {result.score >= 80 ? 'Estructuralmente Sano' : 'Atención Requerida'}
                    </div>
                    <p className="text-sm text-gray-500">Basado en {result.frameCount} cuadros analizados</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 col-span-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Hallazgos Críticos</h3>
                {result.issues.length > 0 ? (
                  <ul className="space-y-3">
                    {result.issues.map((issue, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-red-900 block">{issue.label}</span>
                          <span className="text-sm text-red-700">{issue.description}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-3 text-green-700 bg-green-50 p-4 rounded-lg border border-green-100">
                    <CheckCircle className="w-5 h-5" />
                    <span>No se detectaron fallos estructurales significativos.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recomendaciones Técnicas
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-blue-800 text-sm">
                    <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-70" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* VISTA ELEMENTOS ESTRUCTURALES */}
        {activeTab === 'elementos' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Elemento</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Valor Medido</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Límite Normativo</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo de Carga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {structuralElements.map((el) => (
                    <tr key={el.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-medium text-gray-900">{el.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          el.status === 'optimal' ? 'bg-green-100 text-green-800' : 
                          el.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          {el.status === 'optimal' ? 'CONFORME' : 'NO CONFORME'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-600">{el.value}</td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-500">{el.limit}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{el.load}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gráfico Simulado de Distribución */}
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Distribución de Cargas por Nivel</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Nivel Superior (Torso)</span>
                      <span>{result.metrics?.backAngle || 0 > 20 ? 'Sobrecarga' : 'Nominal'}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${result.metrics?.backAngle || 0 > 20 ? 'bg-red-500' : 'bg-blue-500'}`} 
                        style={{ width: `${Math.min(100, (result.metrics?.backAngle || 0) * 3)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Nivel Medio (Cadera)</span>
                      <span>Nominal</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Nivel Inferior (Rodillas)</span>
                      <span>{result.metrics?.kneeExtension || 0 < 160 ? 'Inestable' : 'Estable'}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${result.metrics?.kneeExtension || 0 < 160 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                        style={{ width: `${Math.min(100, (result.metrics?.kneeExtension || 0) / 1.8)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VISTA CARGAS */}
        {activeTab === 'cargas' && (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white rounded-xl p-8 text-center">
              <h3 className="text-slate-400 uppercase text-xs font-bold tracking-widest mb-2">Momento Flector Estimado (L5/S1)</h3>
              <div className="text-5xl font-mono font-bold mb-2">
                {estimatedTorque} <span className="text-2xl text-slate-500">Nm</span>
              </div>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Cálculo basado en modelo biomecánico estándar considerando peso usuario (80kg) y carga externa (100kg).
              </p>
            </div>

            {/* Evaluación de Riesgo de Lesiones */}
            {result.injuryRisk ? (
              <div className={`border rounded-xl p-6 ${
                result.injuryRisk.level === 'critical' || result.injuryRisk.level === 'high' 
                  ? 'bg-red-50 border-red-200' 
                  : result.injuryRisk.level === 'moderate'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
              }`}>
                <h4 className={`font-bold mb-4 flex items-center gap-2 ${
                  result.injuryRisk.level === 'critical' || result.injuryRisk.level === 'high' 
                    ? 'text-red-900' 
                    : result.injuryRisk.level === 'moderate'
                      ? 'text-yellow-900'
                      : 'text-green-900'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                  Evaluación de Riesgo: {result.injuryRisk.level.toUpperCase()}
                </h4>
                
                {result.injuryRisk.factors.length > 0 ? (
                  <div className="space-y-4">
                    {result.injuryRisk.factors.map((factor, idx) => (
                      <div key={idx} className="bg-white/60 rounded-lg p-3">
                        <div className="flex justify-between mb-1">
                          <span className="font-semibold text-gray-900">{factor.name}</span>
                          <span className="text-xs font-mono bg-gray-200 px-2 py-0.5 rounded">
                            Contribución: {(factor.riskContribution * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{factor.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-green-800">
                    No se han detectado factores de riesgo biomecánico significativos. La ejecución es segura bajo cargas estándar.
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Alerta de Integridad Estructural
                </h4>
                <p className="text-sm text-yellow-800">
                  {result.metrics?.backAngle && result.metrics.backAngle > 20 
                    ? "CRÍTICO: La desviación de la viga principal (columna) excede el 20%. El momento flector se incrementa exponencialmente, aumentando el riesgo de fallo estructural (lesión discal)."
                    : "NOMINAL: La geometría actual mantiene las cargas dentro de los límites de seguridad del material biológico."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* VISTA VALIDACIÓN */}
        {activeTab === 'validacion' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Validación Cruzada vs Normativa</h3>
              <div className="space-y-6">
                {[
                  { 
                    label: 'Neutralidad Espinal', 
                    current: result.metrics?.backAngle || 0, 
                    target: 0, 
                    tolerance: 15,
                    unit: '° desv.'
                  },
                  { 
                    label: 'Bloqueo de Rodilla', 
                    current: result.metrics?.kneeExtension || 0, 
                    target: 180, 
                    tolerance: 20,
                    unit: '° ext.'
                  }
                ].map((metric, idx) => {
                  const diff = Math.abs(metric.current - metric.target);
                  const passed = diff <= metric.tolerance;
                  
                  return (
                    <div key={idx} className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {passed ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-gray-900">{metric.label}</span>
                          <span className={`font-mono font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                            {metric.current}{metric.unit}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 relative">
                          <div 
                            className="absolute top-0 bottom-0 bg-gray-400/30" 
                            style={{ 
                              left: `${Math.max(0, 50 - (metric.tolerance/2))}%`, 
                              width: `${metric.tolerance}%` 
                            }}
                          ></div>
                          <div 
                            className={`h-2 rounded-full absolute transition-all duration-500 ${passed ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ 
                              left: `${Math.min(100, (metric.current / (metric.target * 2 || 100)) * 100)}%`, // Simplified positioning logic
                              width: '10px'
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Objetivo: {metric.target}{metric.unit}</span>
                          <span>Tolerancia: ±{metric.tolerance}{metric.unit}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer de Acciones */}
      <div className="p-6 bg-white border-t border-gray-200 flex justify-between items-center">
        <button
          onClick={downloadCSV}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="px-6 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors"
          >
            Nuevo Análisis
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors shadow-sm"
          >
            Cerrar Informe
          </button>
        </div>
      </div>
    </div>
  );
};
