# ============================================================
# SCRIPT DE CORRECTION SYGRH - lib/supabase.js
# Lancer depuis : C:\Users\USER\Downloads\SyGRH-v2\SyGRH-v2
# ============================================================

Write-Host "=== CORRECTION SYGRH EN COURS ===" -ForegroundColor Cyan

# 1. Verifier qu'on est dans le bon dossier
if (-not (Test-Path "package.json")) {
    Write-Host "ERREUR : Lancez ce script depuis le dossier SyGRH-v2 (celui qui contient package.json)" -ForegroundColor Red
    exit 1
}

# 2. Creer le dossier lib s'il n'existe pas
if (-not (Test-Path "lib")) {
    New-Item -ItemType Directory -Name "lib" | Out-Null
    Write-Host "Dossier lib cree" -ForegroundColor Green
}

# 3. Ecrire le bon contenu dans lib/supabase.js (ecrase l'ancien)
$content = @'
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
'@

Set-Content -Path "lib\supabase.js" -Value $content -Encoding UTF8
Write-Host "lib/supabase.js corrige avec succes" -ForegroundColor Green

# 4. Supprimer les anciens fichiers en double s'ils existent
if (Test-Path "lib\supabase_lib.js") { Remove-Item "lib\supabase_lib.js" }
if (Test-Path "lib\supabase_fixed.js") { Remove-Item "lib\supabase_fixed.js" }
if (Test-Path "lib\supabase_lib_fixed.js") { Remove-Item "lib\supabase_lib_fixed.js" }

# 5. Installer @supabase/supabase-js si absent
Write-Host "Verification des dependances..." -ForegroundColor Yellow
$pkg = Get-Content "package.json" | ConvertFrom-Json
if (-not $pkg.dependencies.'@supabase/supabase-js') {
    Write-Host "Installation de @supabase/supabase-js..." -ForegroundColor Yellow
    npm install @supabase/supabase-js --save
    Write-Host "@supabase/supabase-js installe" -ForegroundColor Green
} else {
    Write-Host "@supabase/supabase-js deja present" -ForegroundColor Green
}

# 6. Git : add, commit, push
Write-Host "Envoi sur GitHub..." -ForegroundColor Yellow
git add .
git commit -m "fix: correction definitive lib/supabase.js - utilise supabase-js"
git push

Write-Host ""
Write-Host "=== TERMINE ! Attendez 2-3 min puis verifiez Vercel ===" -ForegroundColor Cyan
Write-Host "URL : https://sy-grh-mdcjs.vercel.app" -ForegroundColor White
