{{/*
Expand the name of the chart.
*/}}
{{- define "spartan-hub.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "spartan-hub.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "spartan-hub.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "spartan-hub.labels" -}}
helm.sh/chart: {{ include "spartan-hub.chart" . }}
{{ include "spartan-hub.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "spartan-hub.selectorLabels" -}}
app.kubernetes.io/name: {{ include "spartan-hub.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "spartan-hub.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "spartan-hub.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create secret name
*/}}
{{- define "spartan-hub.secretName" -}}
{{- if .Values.externalSecretName }}
{{- .Values.externalSecretName }}
{{- else }}
{{- printf "%s-secrets" (include "spartan-hub.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Create ingress host
*/}}
{{- define "spartan-hub.ingressHost" -}}
{{- .Values.ingress.host | default (printf "spartan-hub.%s" .Values.clusterDomain) }}
{{- end }}
