{{/*
Expand the name of the chart.
*/}}
{{- define "metatile-queue-populator-ui.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "metatile-queue-populator-ui.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "metatile-queue-populator-ui.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
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
Backend Image Tag
*/}}
{{- define "metatile-queue-populator-ui.backend.tag" -}}
{{- default (printf "v%s" .Chart.AppVersion) .Values.backend.image.tag }}
{{- end }}

{{/*
Frontend Image Tag
*/}}
{{- define "metatile-queue-populator-ui.frontend.tag" -}}
{{- default (printf "v%s" .Chart.AppVersion) .Values.frontend.image.tag }}
{{- end }}

{{/*
Common labels with mclabels fallback
*/}}
{{- define "metatile-queue-populator-ui.labels" -}}
helm.sh/chart: {{ include "metatile-queue-populator-ui.chart" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- if (hasKey .Template "mclabels.labels") }}
{{ include "mclabels.labels" . }}
{{- end }}
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "metatile-queue-populator-ui.backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "metatile-queue-populator-ui.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: backend
{{- if (hasKey .Template "mclabels.selectorLabels") }}
{{ include "mclabels.selectorLabels" . }}
{{- end }}
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "metatile-queue-populator-ui.frontend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "metatile-queue-populator-ui.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: frontend
{{- if (hasKey .Template "mclabels.selectorLabels") }}
{{ include "mclabels.selectorLabels" . }}
{{- end }}
{{- end }}

{{/*
Returns the cloud provider name from global if exists or from the chart's values, defaults to minikube
*/}}
{{- define "metatile-queue-populator-ui.cloudProviderFlavor" -}}
{{- if .Values.global.cloudProvider.flavor }}
    {{- .Values.global.cloudProvider.flavor -}}
{{- else if .Values.cloudProvider -}}
    {{- .Values.cloudProvider.flavor | default "minikube" -}}
{{- else -}}
    {{ "minikube" }}
{{- end -}}
{{- end -}}

{{/*
Returns the cloud provider docker registry url from global if exists or from the chart's values
*/}}
{{- define "metatile-queue-populator-ui.cloudProviderDockerRegistryUrl" -}}
{{- if .Values.global.cloudProvider.dockerRegistryUrl }}
    {{- printf "%s" .Values.global.cloudProvider.dockerRegistryUrl | trimSuffix "/" }}/
{{- else if .Values.cloudProvider.dockerRegistryUrl -}}
    {{- printf "%s" .Values.cloudProvider.dockerRegistryUrl | trimSuffix "/" }}/
{{- else -}}
{{- end -}}
{{- end -}}

{{/*
Returns the cloud provider image pull secret name from global if exists or from the chart's values
*/}}
{{- define "metatile-queue-populator-ui.cloudProviderImagePullSecretName" -}}
{{- if .Values.global.cloudProvider.imagePullSecretName }}
    {{- .Values.global.cloudProvider.imagePullSecretName -}}
{{- else if .Values.cloudProvider.imagePullSecretName -}}
    {{- .Values.cloudProvider.imagePullSecretName -}}
{{- end -}}
{{- end -}}
