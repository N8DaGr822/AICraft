param([string]$OutputDirectory = 'AITest/wwwroot/tax-reborn')
$ErrorActionPreference = 'Stop'
$version = '2026.10.16-preview.39'
$archive = Join-Path $PSScriptRoot '../.tools/tax-downloads/source.zip'
$expectedHash = 'F09EDE7CA22772B3854245F2149E106C8777B57C167552CBF4132E3504C35A11'
New-Item -ItemType Directory -Force (Split-Path $archive) | Out-Null
if (!(Test-Path -LiteralPath $archive)) {
    Invoke-WebRequest "https://github.com/lxistired/tax-reborn/releases/download/v$version/Tax-Reborn-$version-source.zip" -OutFile $archive
}
if ((Get-Item $archive).Length -ne 142921780 -or (Get-FileHash $archive -Algorithm SHA256).Hash -ne $expectedHash) {
    throw 'Tax Reborn source checksum/size mismatch. Remove the cached archive before retrying.'
}
$root = [IO.Path]::GetFullPath((Join-Path $OutputDirectory $version))
New-Item -ItemType Directory -Force $root | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($archive)
try {
    # Upstream Packaging: Match the browser asset layout used by the native Android build.
    $modules = @('tax_engine.py','tax_special_capital.py','tax_child_income.py','rules_2025.json','forms.py','official_forms.py','tax_extended.py','tax_credits.py','tax_additional.py','tax_longtail.py','tax_filing.py','presentation_schema.py','privacy_review.py')
    foreach ($entry in $zip.Entries) {
        $name = $entry.FullName
        if ($name.StartsWith('/') -or $name.Contains('\') -or $name.Contains(':') -or ($name.Split('/') -contains '..')) { throw 'Unsafe source archive path.' }
        if ((($entry.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000) { throw 'Archive symlinks are unsupported.' }
        $relative = if ($name.StartsWith('web/')) { $name.Substring(4) }
                    elseif ($name.StartsWith('forms/') -or $modules -contains $name) { $name }
                    elseif ($name -eq 'LICENSE') { 'third-party-notices/Tax-Reborn-AGPL-3.0.txt' }
                    else { $null }
        if (!$relative -or $name.EndsWith('/')) { continue }
        $target = [IO.Path]::GetFullPath((Join-Path $root $relative))
        if (!$target.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Archive path escapes destination.' }
        New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)
    }
    # Source Availability: Serve the exact complete release, including dependency sources and notices.
    Copy-Item -LiteralPath $archive -Destination (Join-Path $root 'corresponding-source.zip') -Force
    foreach ($required in @('index.html','tax-worker.js','local-api.js','forms.py','forms/f1040-2025.pdf','vendor/pyodide/pyodide.asm.wasm','third-party-notices/Tax-Reborn-AGPL-3.0.txt')) {
        if (!(Test-Path -LiteralPath (Join-Path $root $required))) { throw "Missing Tax Reborn asset: $required" }
    }
    $manifest = Get-Content -LiteralPath (Join-Path $root 'offline-assets.json') -Raw | ConvertFrom-Json
    foreach ($asset in $manifest.assets) {
        if (!(Test-Path -LiteralPath (Join-Path $root $asset))) { throw "Missing offline manifest asset: $asset" }
    }
} finally { $zip.Dispose() }
Write-Output "Tax Reborn ${version}: verified source and browser assets installed."
