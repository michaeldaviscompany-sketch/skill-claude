#!/usr/bin/env bash
# Synchronise la bibliothèque de Skills depuis le dépôt source vers .claude/ de ce projet.
# Usage : ./scripts/sync-skills.sh [URL_DU_DEPOT]
set -euo pipefail
SRC_URL="${1:-https://github.com/michaeldaviscompany-sketch/claude-skill}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

GIT_LFS_SKIP_SMUDGE=1 git clone --quiet --depth 1 "$SRC_URL" "$TMP/src"
mkdir -p "$ROOT/.claude/skills" "$ROOT/.claude/agents"
rm -f "$ROOT"/.claude/skills/*.synced

# 1) Skills : chaque dossier qui contient un SKILL.md (copies dupliquées dédoublonnées par nom).
#    skill-creator est ignoré : la version officielle Anthropic est déjà disponible.
find "$TMP/src" -name SKILL.md -not -path '*/.git/*' | sort | while read -r f; do
  dir="$(dirname "$f")"; name="$(basename "$dir")"
  [ "$name" = "skill-creator" ] && continue
  [ -e "$ROOT/.claude/skills/$name.synced" ] && continue
  rm -rf "$ROOT/.claude/skills/$name"
  cp -r "$dir" "$ROOT/.claude/skills/$name"
  touch "$ROOT/.claude/skills/$name.synced"
  echo "skill : $name"
done
rm -f "$ROOT"/.claude/skills/*.synced

# 2) Agents (sous-agents) : fichiers .md d'un dossier agents/ avec frontmatter YAML valide
find "$TMP/src" -path '*/agents/*.md' -not -path '*/.git/*' | while read -r f; do
  head -1 "$f" | grep -q '^---' || continue
  cp "$f" "$ROOT/.claude/agents/"; echo "agent : $(basename "$f" .md)"
done
