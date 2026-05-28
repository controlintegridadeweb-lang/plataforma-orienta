# Remove pastas duplicadas criadas por copia incorreta do repositorio no Windows.
# Execute na raiz do git (pasta que contem orienta-v1/ e .github/).

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path (Join-Path $repoRoot "orienta-v1"))) {
  $repoRoot = Get-Location
}

$targets = @(
  (Join-Path $repoRoot "PLATAFORMA ORIENTA"),
  (Join-Path $repoRoot "_lixo-pasta-duplicada")
)

foreach ($path in $targets) {
  if (-not (Test-Path $path)) {
    Write-Host "Ignorado (nao existe): $path"
    continue
  }
  Write-Host "Removendo: $path"
  Remove-Item -LiteralPath $path -Recurse -Force
}

Write-Host "Concluido. Abra apenas esta pasta como raiz do projeto:"
Write-Host $repoRoot
