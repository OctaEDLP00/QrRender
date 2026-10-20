#!/bin/bash

# Configuración de colores
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Salir si hay errores
set -e

print_package_name() {
    local name=$1
    local colorBracket=$2
    local color=$3
    printf "${colorBracket}[ ${color}${name}${colorBracket} ]${NC}"
}

# Parámetros
NAME=$1
VERSION=$2
CMT_MESSAGE=$3
TAG_MESSAGE=$4
NO_PUBLISH=$5

# Validación de Argumentos
if [ -z "$NAME" ] || [ -z "$VERSION" ]; then
    printf "${RED}❌ ERROR: ${GRAY}Faltan argumentos.\n"
    printf "${GRAY}Correct use: ${YELLOW}.\release.sh ${GRAY}<nombre_paquete> <version> <Commit Msg> <Tag Msg>${NC}\n"
    printf "${GRAY}Example:     ${YELLOW}.\release.sh ${GRAY}@qrx/qrcode 1.0.0-beta.1 feat(cli): add auto-version selection to prevent overflow Release v0.1.0: Stable CLI and Web core${NC}\n"
    exit 1
fi

# --- LÓGICA DE DETECCIÓN DE PRE-RELEASE ---
# Detectamos si hay un guion en la versión (ej: 1.0.0-beta.1)
NPM_TAG="latest"
if [[ "$VERSION" == *"-"* ]]; then
    # Usamos Regex de Bash para extraer la palabra después del guion (beta, rc, alpha)
    if [[ "$VERSION" =~ -([a-zA-Z]+) ]]; then
        NPM_TAG="${BASH_REMATCH[1]}"
    else
        NPM_TAG="latest" # Fallback por seguridad
    fi
fi
# -------------------------------------------

printf "🚀 ${CYAN}Iniciando proceso para ${NC}"
print_package_name "$NAME" "$CYAN" "$DARK_CYAN"
printf " ${YELLOW}v$VERSION${NC} "
if [ "$NPM_TAG" != "latest" ]; then
    printf "${GRAY}(Pre-release tag: ${MAGENTA}$NPM_TAG${GRAY})${NC}\n"
else
    printf "${GRAY}(Tag: ${GREEN}latest${GRAY})${NC}\n"
fi

try_step() {
    local step_msg=$1
    shift
    print_package_name "$NAME" "$CYAN" "$DARK_CYAN"
    printf " ${step_msg}\n"
    "$@"
}

# 1. Validación de Rama
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    printf "${RED}❌ ERROR: No estás en la rama main/master. ¡Abortado!${NC}\n"
    exit 1
fi

# 2. Instalación
try_step "${MAGENTA}📦 Instalando dependencias...${NC}"
pnpm install --frozen-lockfile

# 3. Calidad
try_step "${BLUE}🔍 Validando calidad (Lint/Test)...${NC}"
pnpm lint
pnpm test

# 4. Build
try_step "${NC}🏗️  Generando bundle con tsup...${NC}"
pnpm build

# 5. Versionado
print_package_name "$NAME" "$CYAN" "$DARK_CYAN"
printf " ${NC}📝 Actualizando a v$VERSION...${NC}\n"
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json
else
    sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json
fi

# 6. Git Flow
try_step "${NC}💾 Commiteando y creando tag...${NC}"
git add .
git commit -m "[$NAME] release: v$VERSION - $MESSAGE"
git tag -a "v$VERSION" -m "$MESSAGE"
git push origin "$CURRENT_BRANCH" --follow-tags

if [ "$NO_PUBLISH" = false ] then
    # 7. Publicación en NPM (Con soporte para Tags)
    print_package_name "$NAME" "$CYAN" "$DARK_CYAN"
    printf " ${GREEN}🚀 Publicando en NPM ($NPM_TAG)...${NC}\n"

    pnpm publish --access public --no-git-checks --tag $NPM_TAG

    printf "✅ "
    print_package_name "$NAME" "$CYAN" "$DARK_CYAN"
    printf " v$VERSION ($NPM_TAG) publicada con éxito en NPM."
else
    print_package_name "$NAME" "$CYAN" "$DARK_CYAN"
    printf " v$Version - Publicación omitida a NPM (Dry Run)."
fi

printf "${GREEN}✅ ${NC}"
print_package_name "$NAME" "$CYAN" "$DARK_CYAN"
printf " ${GREEN}v$VERSION ($NPM_TAG) publicada con éxito.${NC}\n"
