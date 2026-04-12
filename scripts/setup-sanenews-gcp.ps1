[CmdletBinding()]
param(
  [string]$ProjectId = 'sanenews',
  [string]$Region = 'us-west1',
  [string]$GithubRepo = 'spayyavula/newsportal',
  [string]$ArtifactRegistryRepository = 'newsportal',
  [string]$FrontendServiceName = 'newsportal-frontend',
  [string]$CmsServiceName = 'newsportal-cms',
  [string]$RuntimeServiceAccountId = 'newsportal-runtime',
  [string]$DeployerServiceAccountId = 'github-deployer',
  [string]$WorkloadIdentityPoolId = 'github-actions',
  [string]$WorkloadIdentityProviderId = 'github',
  [string]$RootDomain = 'sanenews.net',
  [string]$WwwDomain = 'www.sanenews.net',
  [string]$CmsDomain = 'cms.sanenews.net',
  [string]$SecretValuesFile,
  [switch]$ConfigureGitHubSecrets,
  [switch]$DeployServices,
  [switch]$CreateDomainMappings
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$frontendTemplate = Join-Path $repoRoot 'deploy/cloud-run/frontend-service.yaml'
$cmsTemplate = Join-Path $repoRoot 'deploy/cloud-run/cms-service.yaml'

function Write-Step {
  param([string]$Message)

  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Require-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' is not installed or not on PATH."
  }
}

function Invoke-GCloud {
  param(
    [Parameter(Mandatory)]
    [string[]]$Arguments,
    [switch]$AllowFailure,
    [switch]$AsJson
  )

  Write-Host ("gcloud " + ($Arguments -join ' ')) -ForegroundColor DarkGray
  $output = & gcloud @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $text = ($output | Out-String).Trim()

  if ($exitCode -ne 0 -and -not $AllowFailure) {
    throw "gcloud command failed: gcloud $($Arguments -join ' ')`n$text"
  }

  if ($AsJson -and $text) {
    return $text | ConvertFrom-Json
  }

  return $text
}

function Test-GCloud {
  param([string[]]$Arguments)

  & gcloud @Arguments *> $null
  return $LASTEXITCODE -eq 0
}

function Ensure-ProjectRoleBinding {
  param(
    [string]$Member,
    [string]$Role
  )

  Invoke-GCloud -Arguments @(
    'projects', 'add-iam-policy-binding', $ProjectId,
    "--member=$Member",
    "--role=$Role",
    '--quiet'
  ) | Out-Null
}

function Ensure-ServiceAccountRoleBinding {
  param(
    [string]$ServiceAccountEmail,
    [string]$Member,
    [string]$Role
  )

  Invoke-GCloud -Arguments @(
    'iam', 'service-accounts', 'add-iam-policy-binding', $ServiceAccountEmail,
    "--member=$Member",
    "--role=$Role",
    "--project=$ProjectId",
    '--quiet'
  ) | Out-Null
}

function Ensure-ServiceAccount {
  param(
    [string]$AccountId,
    [string]$DisplayName
  )

  $email = "$AccountId@$ProjectId.iam.gserviceaccount.com"
  if (-not (Test-GCloud @('iam', 'service-accounts', 'describe', $email, "--project=$ProjectId"))) {
    Write-Step "Creating service account $email"
    Invoke-GCloud -Arguments @(
      'iam', 'service-accounts', 'create', $AccountId,
      "--display-name=$DisplayName",
      "--project=$ProjectId"
    ) | Out-Null
  }

  return $email
}

function Ensure-Secret {
  param(
    [string]$Name,
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return
  }

  $tempFile = [System.IO.Path]::GetTempFileName()
  try {
    Set-Content -Path $tempFile -Value $Value -NoNewline

    if (Test-GCloud @('secrets', 'describe', $Name, "--project=$ProjectId")) {
      Invoke-GCloud -Arguments @(
        'secrets', 'versions', 'add', $Name,
        "--data-file=$tempFile",
        "--project=$ProjectId"
      ) | Out-Null
    }
    else {
      Invoke-GCloud -Arguments @(
        'secrets', 'create', $Name,
        "--data-file=$tempFile",
        "--project=$ProjectId"
      ) | Out-Null
    }
  }
  finally {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
  }
}

function Render-Manifest {
  param(
    [string]$TemplatePath,
    [string]$RuntimeServiceAccountEmail
  )

  $renderedPath = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetFileName($TemplatePath))
  $content = Get-Content $TemplatePath -Raw
  $content = $content.Replace('__RUNTIME_SERVICE_ACCOUNT__', $RuntimeServiceAccountEmail)
  Set-Content -Path $renderedPath -Value $content
  return $renderedPath
}

function Set-GitHubSecret {
  param(
    [string]$Name,
    [string]$Value
  )

  if (-not $ConfigureGitHubSecrets) {
    return
  }

  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Warning "GitHub CLI is not installed. Skipping GitHub secret '$Name'."
    return
  }

  $null = & gh auth status 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "GitHub CLI is not authenticated. Skipping GitHub secret '$Name'."
    return
  }

  Write-Host ("gh secret set " + $Name + " --repo " + $GithubRepo) -ForegroundColor DarkGray
  $Value | & gh secret set $Name --repo $GithubRepo --body - | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to set GitHub secret '$Name'."
  }
}

Require-Command gcloud

Write-Step 'Checking gcloud authentication and project access'
Invoke-GCloud -Arguments @('auth', 'list') | Out-Null
Invoke-GCloud -Arguments @('config', 'set', 'project', $ProjectId) | Out-Null

$projectNumber = Invoke-GCloud -Arguments @('projects', 'describe', $ProjectId, '--format=value(projectNumber)')
if (-not $projectNumber) {
  throw "Unable to resolve the numeric project number for '$ProjectId'."
}

$runtimeServiceAccountEmail = Ensure-ServiceAccount -AccountId $RuntimeServiceAccountId -DisplayName 'Newsportal Runtime'
$deployerServiceAccountEmail = Ensure-ServiceAccount -AccountId $DeployerServiceAccountId -DisplayName 'GitHub Deployer'

Write-Step 'Enabling required Google Cloud APIs'
$services = @(
  'run.googleapis.com',
  'artifactregistry.googleapis.com',
  'cloudbuild.googleapis.com',
  'iam.googleapis.com',
  'iamcredentials.googleapis.com',
  'secretmanager.googleapis.com',
  'sqladmin.googleapis.com'
)
Invoke-GCloud -Arguments (@('services', 'enable') + $services + @("--project=$ProjectId")) | Out-Null

Write-Step 'Ensuring Artifact Registry repository exists'
if (-not (Test-GCloud @('artifacts', 'repositories', 'describe', $ArtifactRegistryRepository, "--location=$Region", "--project=$ProjectId"))) {
  Invoke-GCloud -Arguments @(
    'artifacts', 'repositories', 'create', $ArtifactRegistryRepository,
    '--repository-format=docker',
    "--location=$Region",
    "--project=$ProjectId"
  ) | Out-Null
}

Write-Step 'Binding required IAM roles'
Ensure-ProjectRoleBinding -Member "serviceAccount:$runtimeServiceAccountEmail" -Role 'roles/cloudsql.client'
Ensure-ProjectRoleBinding -Member "serviceAccount:$runtimeServiceAccountEmail" -Role 'roles/secretmanager.secretAccessor'
Ensure-ProjectRoleBinding -Member "serviceAccount:$runtimeServiceAccountEmail" -Role 'roles/logging.logWriter'
Ensure-ProjectRoleBinding -Member "serviceAccount:$deployerServiceAccountEmail" -Role 'roles/run.admin'
Ensure-ProjectRoleBinding -Member "serviceAccount:$deployerServiceAccountEmail" -Role 'roles/cloudbuild.builds.editor'
Ensure-ProjectRoleBinding -Member "serviceAccount:$deployerServiceAccountEmail" -Role 'roles/artifactregistry.writer'
Ensure-ProjectRoleBinding -Member "serviceAccount:$deployerServiceAccountEmail" -Role 'roles/secretmanager.secretAccessor'
Ensure-ServiceAccountRoleBinding -ServiceAccountEmail $runtimeServiceAccountEmail -Member "serviceAccount:$deployerServiceAccountEmail" -Role 'roles/iam.serviceAccountUser'

Write-Step 'Ensuring Workload Identity Federation exists for GitHub Actions'
if (-not (Test-GCloud @('iam', 'workload-identity-pools', 'describe', $WorkloadIdentityPoolId, '--location=global', "--project=$ProjectId"))) {
  Invoke-GCloud -Arguments @(
    'iam', 'workload-identity-pools', 'create', $WorkloadIdentityPoolId,
    '--location=global',
    '--display-name=GitHub Actions',
    "--project=$ProjectId"
  ) | Out-Null
}

if (-not (Test-GCloud @('iam', 'workload-identity-pools', 'providers', 'describe', $WorkloadIdentityProviderId, '--location=global', "--workload-identity-pool=$WorkloadIdentityPoolId", "--project=$ProjectId"))) {
  Invoke-GCloud -Arguments @(
    'iam', 'workload-identity-pools', 'providers', 'create-oidc', $WorkloadIdentityProviderId,
    "--location=global",
    "--workload-identity-pool=$WorkloadIdentityPoolId",
    '--display-name=GitHub OIDC',
    '--issuer-uri=https://token.actions.githubusercontent.com',
    '--attribute-mapping=google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner,attribute.ref=assertion.ref',
    "--attribute-condition=assertion.repository == '$GithubRepo'",
    "--project=$ProjectId"
  ) | Out-Null
}

$workloadIdentityProvider = Invoke-GCloud -Arguments @(
  'iam', 'workload-identity-pools', 'providers', 'describe', $WorkloadIdentityProviderId,
  '--location=global',
  "--workload-identity-pool=$WorkloadIdentityPoolId",
  '--format=value(name)',
  "--project=$ProjectId"
)

$principalSet = "principalSet://iam.googleapis.com/projects/$projectNumber/locations/global/workloadIdentityPools/$WorkloadIdentityPoolId/attribute.repository/$GithubRepo"
Ensure-ServiceAccountRoleBinding -ServiceAccountEmail $deployerServiceAccountEmail -Member $principalSet -Role 'roles/iam.workloadIdentityUser'

if ($SecretValuesFile) {
  Write-Step 'Creating or updating Secret Manager secrets from JSON file'
  $secretValues = Get-Content $SecretValuesFile -Raw | ConvertFrom-Json -AsHashtable
  foreach ($entry in $secretValues.GetEnumerator()) {
    Ensure-Secret -Name $entry.Key -Value ([string]$entry.Value)
  }
}

if ($DeployServices) {
  Write-Step 'Deploying Cloud Run services from repository manifests'
  $renderedFrontend = Render-Manifest -TemplatePath $frontendTemplate -RuntimeServiceAccountEmail $runtimeServiceAccountEmail
  $renderedCms = Render-Manifest -TemplatePath $cmsTemplate -RuntimeServiceAccountEmail $runtimeServiceAccountEmail
  try {
    Invoke-GCloud -Arguments @('run', 'services', 'replace', $renderedCms, "--region=$Region", "--project=$ProjectId") | Out-Null
    Invoke-GCloud -Arguments @('run', 'services', 'replace', $renderedFrontend, "--region=$Region", "--project=$ProjectId") | Out-Null
  }
  finally {
    Remove-Item $renderedFrontend -ErrorAction SilentlyContinue
    Remove-Item $renderedCms -ErrorAction SilentlyContinue
  }
}

if ($CreateDomainMappings) {
  Write-Step 'Creating Cloud Run domain mappings'
  $mappings = @(
    @{ Domain = $RootDomain; Service = $FrontendServiceName },
    @{ Domain = $WwwDomain; Service = $FrontendServiceName },
    @{ Domain = $CmsDomain; Service = $CmsServiceName }
  )

  foreach ($mapping in $mappings) {
    try {
      Invoke-GCloud -Arguments @(
        'beta', 'run', 'domain-mappings', 'create',
        "--service=$($mapping.Service)",
        "--domain=$($mapping.Domain)",
        "--region=$Region",
        "--project=$ProjectId",
        '--quiet'
      ) | Out-Null
    }
    catch {
      Write-Warning "Domain mapping for '$($mapping.Domain)' could not be created automatically. This usually means the domain is not yet verified in Search Console or DNS is still pending."
    }

    $description = Invoke-GCloud -Arguments @(
      'beta', 'run', 'domain-mappings', 'describe',
      "--domain=$($mapping.Domain)",
      "--region=$Region",
      "--project=$ProjectId",
      '--format=json'
    ) -AllowFailure -AsJson

    if ($description -and $description.status -and $description.status.resourceRecords) {
      Write-Host "DNS records for $($mapping.Domain):" -ForegroundColor Yellow
      foreach ($record in $description.status.resourceRecords) {
        Write-Host ("  {0} {1} {2}" -f $record.type, $record.name, $record.rrdata)
      }
    }
  }
}

Set-GitHubSecret -Name 'GCP_WORKLOAD_IDENTITY_PROVIDER' -Value $workloadIdentityProvider
Set-GitHubSecret -Name 'GCP_DEPLOYER_SERVICE_ACCOUNT' -Value $deployerServiceAccountEmail
Set-GitHubSecret -Name 'GCP_RUNTIME_SERVICE_ACCOUNT' -Value $runtimeServiceAccountEmail

Write-Step 'Completed bootstrap summary'
Write-Host "Project ID: $ProjectId"
Write-Host "Project number: $projectNumber"
Write-Host "Workload Identity Provider: $workloadIdentityProvider"
Write-Host "GitHub deployer service account: $deployerServiceAccountEmail"
Write-Host "Cloud Run runtime service account: $runtimeServiceAccountEmail"
Write-Host "Frontend domain: https://$RootDomain"
Write-Host "CMS domain: https://$CmsDomain"

if (-not $ConfigureGitHubSecrets) {
  Write-Host "`nGitHub secrets to set:" -ForegroundColor Yellow
  Write-Host "  GCP_WORKLOAD_IDENTITY_PROVIDER=$workloadIdentityProvider"
  Write-Host "  GCP_DEPLOYER_SERVICE_ACCOUNT=$deployerServiceAccountEmail"
  Write-Host "  GCP_RUNTIME_SERVICE_ACCOUNT=$runtimeServiceAccountEmail"
}

Write-Host "`nIf domain mappings were created, add the printed DNS records at your registrar and wait for certificate provisioning." -ForegroundColor Yellow