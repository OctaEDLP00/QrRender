# release.ps1
param (
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$Version,
    [Parameter(Mandatory = $true)]
    [string]$CmtMessage = "Release version",
    [Parameter(Mandatory = $true)]
    [string]$TagMessage,
    [Parameter(Mandatory = $false)]
    [bool]$NoPublish = $false
)

# Use
# .\release.ps1 -Name "@qrx/qrcode" -Version 0.0.1-rc.1 -CtmMessage "msg here" -TagMessage "tag msg here"
# CtmMessage by default message is "Release version"

Import-Module PSWriteColor
$ErrorActionPreference = "Stop"

function Write-PackageName (
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $false)]
    [string]$BracketColor = "Blue",
    [Parameter(Mandatory = $false)]
    [string]$TextColor = "Cyan"
)
{
    Write-Color -Text "[", "$Name", "]" -Color $BracketColor, $TextColor, $BracketColor -NoNewline
}

# Validar argumentos
if (
    !$Name -and
    !$Version -and
    !$CmtMessage -and
    !$TagMessage
)
{
    Write-Color -Text "❌ ERROR: ", "Faltan argumentos." -Color Red, Gray
    Write-Color -Text "Uso correcto: ", ".\release.ps1 ", "-Name ", "<nombre_paquete> ", "-Version ", "<version> ", "-CmtMessage ", "<Commit Msg> ", "-TagMessage ", "<Tag Msg>" `
        -Color Gray, Yellow, Gray, DarkGray, Gray, DarkGray, Gray, DarkGray, Gray, DarkGray
    Write-Color -Text "Ejemplo: ", ".\release.ps1 ", "-Name ", "@qrx/qrcode ", "-Version ", "1.0.0-beta.1 ", "-CmtMessage ", "feat(cli): add auto-version selection to prevent overflow ", "-TagMessage ", "Release v0.1.0: Stable CLI and Web core"`
        -Color Gray, Yellow, Gray, DarkGray, Gray, DarkGray, Gray, DarkGray, Gray, DarkGray
    exit 1
}

# ---- LÓGICA DE DETECCIÓN DE PRE-RELEASE ----
# Detectamos si hay un guion en la versión (ej: 1.0.0-beta.1)
$NPM_TAG = "latest" # Valor por defecto
if ($Version -match "-([a-zA-Z]+)")
{
    $NPM_TAG = $Matches[1]
} else
{
    $NPM_TAG = "latest"
}
# -------------------------------------------

Write-Color -Text "🚀 ", "Iniciando proceso para " -Color Cyan, White -NoNewline
Write-PackageName -Name $Name -BracketColor Cyan -TextColor DarkCyan
Write-Color -Text " v$Version" -Color Yellow

try
{
    # 1. Validación de Rama
    $currentBranch = git rev-parse --abbrev-ref HEAD
    if ($currentBranch -ne "main" -and $currentBranch -ne "master")
    {
        throw "No estás en la rama main/master. ¡Proceso abortado!"
    }

    # 2. Instalación y Limpieza
    Write-PackageName -Name $Name -BracketColor Cyan -TextColor DarkCyan
    Write-Color -Text " 📦 Instalando dependencias..." -Color White
    pnpm install --frozen-lockfile

    # 3. Calidad (Lint y Test)
    Write-PackageName -Name $Name -BracketColor Cyan -TextColor DarkCyan
    Write-Color -Text " 🔍 Validando calidad de código..." -Color White
    pnpm lint
    pnpm test:run

    # 4. Build
    Write-PackageName -Name $Name
    Write-Color -Text " 🏗️  Generando bundle con tsup..." -Color White
    pnpm build

    # 5. Versionado
    Write-PackageName -Name $Name -BracketColor Cyan -TextColor DarkCyan
    Write-Color -Text " 📝 Actualizando a v$Version..." -Color White
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    $packageJson.version = $Version
    $packageJson | ConvertTo-Json -Depth 100 | Set-Content "package.json"

    # 6. Git Flow
    Write-PackageName -Name $Name -BracketColor Cyan -TextColor DarkCyan
    Write-Color -Text " 💾 Commiteando y creando tag..." -Color White
    git add .
    git commit -m "[$Name] release: v$Version - $CmtMessage"
    git tag -a "v$Version" -m "$TagMessage"
    git push origin $currentBranch --follow-tags

    if (-not $NoPublish)
    {
        # 7. Publicación en NPM (Paso Final)
        Write-PackageName -Name $Name -BracketColor Cyan -TextColor DarkCyan
        Write-Color -Text " 🚀 Publicando en NPM Registry..." -Color Green

        # Usamos --access public por si es el primer publish de un scope @algo
        pnpm publish --access public --no-git-checks --tag $NPM_TAG

        Write-Color -Text "✅ " -NoNewline
        Write-PackageName -Name $Name -BracketColor Cyan -TextColor DarkCyan
        Write-Color -Text " v$Version ($NPM_TAG) publicada con éxito en GitHub y NPM." -Color Green
    } else
    {
        Write-PackageName -Name $Name -BracketColor Yellow -TextColor DarkYellow
        Write-Color -Text " v$Version - Publicación omitida (Dry Run)." -Color Yellow
    }

} catch
{
    Write-Color -Color Red -Text "❌ ERROR: $($_.Exception.Message)"
    exit 1
}
