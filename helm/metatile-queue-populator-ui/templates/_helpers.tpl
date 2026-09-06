{{/*
Expand the name of the chart.
*/}}
{{- define "metatile-queue-populator-ui.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "metatile-queue-populator-ui.fullname" -}}
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
Backend full name
*/}}
{{- define "metatile-queue-populator-ui.backend.fullname" -}}
{{- printf "%s-backend" (include "metatile-queue-populator-ui.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Frontend full name
*/}}
{{- define "metatile-queue-populator-ui.frontend.fullname" -}}
{{- printf "%s-frontend" (include "metatile-queue-populator-ui.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "metatile-queue-populator-ui.labels" -}}
helm.sh/chart: {{ include "metatile-queue-populator-ui.name" . }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "metatile-queue-populator-ui.backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "metatile-queue-populator-ui.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "metatile-queue-populator-ui.frontend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "metatile-queue-populator-ui.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Cloud Provider Docker Registry URL
*/}}
{{- define "metatile-queue-populator-ui.cloudProviderDockerRegistryUrl" -}}
{{- default .Values.global.cloudProvider.dockerRegistryUrl .Values.cloudProvider.dockerRegistryUrl }}
{{- end }}

{{/*
Cloud Provider Image Pull Secret Name
*/}}
{{- define "metatile-queue-populator-ui.cloudProviderImagePullSecretName" -}}
{{- default .Values.global.cloudProvider.imagePullSecretName .Values.cloudProvider.imagePullSecretName }}
{{- end }}
