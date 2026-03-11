# ================================================================
# DEPLOIEMENT COMPLET SYGRH - Tous les modules
# Lancer depuis : C:\Users\USER\Downloads\SyGRH-v2\SyGRH-v2
# ================================================================

Write-Host "=== DEPLOIEMENT COMPLET SYGRH ===" -ForegroundColor Cyan

# Vérifier qu'on est au bon endroit
if (-not (Test-Path "package.json")) {
    Write-Host "ERREUR : Lancez depuis le dossier contenant package.json" -ForegroundColor Red
    exit 1
}

# ---- Créer tous les dossiers nécessaires ----
$dossiers = @("lib", "app\agents", "app\dashboard", "app\users", "app\workspace", "app\conges", "app\assistant")
foreach ($d in $dossiers) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
        Write-Host "Dossier cree : $d" -ForegroundColor Green
    }
}

# ---- lib/supabase.js ----
Set-Content -Path "lib\supabase.js" -Encoding UTF8 -Value @'
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
'@
Write-Host "lib/supabase.js OK" -ForegroundColor Green

# ---- Vérifier que les fichiers sources existent ----
# ATTENTION : modifiez ce chemin si vos fichiers téléchargés sont ailleurs
$srcDir = "$env:USERPROFILE\Downloads"

$fichiers = @(
    @{ src = "$srcDir\login_v2.js";          dst = "app\page.js" },
    @{ src = "$srcDir\agents_page.js";       dst = "app\agents\page.js" },
    @{ src = "$srcDir\dashboard_updated.js"; dst = "app\dashboard\page.js" },
    @{ src = "$srcDir\users_management.js";  dst = "app\users\page.js" },
    @{ src = "$srcDir\workspace_agent.js";   dst = "app\workspace\page.js" },
    @{ src = "$srcDir\conges_admin.js";      dst = "app\conges\page.js" },
    @{ src = "$srcDir\assistant_ia.js";      dst = "app\assistant\page.js" }
)

foreach ($f in $fichiers) {
    if (Test-Path $f.src) {
        Copy-Item $f.src $f.dst -Force
        Write-Host "Copié : $($f.dst)" -ForegroundColor Green
    } else {
        Write-Host "MANQUANT (ignoré) : $($f.src)" -ForegroundColor Yellow
    }
}

# ---- Git push ----
Write-Host ""
Write-Host "Envoi sur GitHub..." -ForegroundColor Cyan
git add .
git commit -m "deploiement complet : agents, dashboard, users, conges, assistant"
git push

Write-Host ""
Write-Host "=== TERMINÉ ! Attendez 3 min puis testez ===" -ForegroundColor Cyan
Write-Host "https://sy-grh-mdcjs.vercel.app/agents" -ForegroundColor White
