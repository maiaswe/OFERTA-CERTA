$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$outputRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot '..'))
$archivePath = Join-Path $outputRoot 'Oferta-Certa-Fase-3.zip'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$rootFiles = @('README.md','AGENTS.md','.env.example','.gitignore','.vercelignore','vercel.json','package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.ts','eslint.config.mjs','playwright.config.ts','playwright.live.config.ts')
$folders = @('src','public','db','supabase/migrations','tests','docs','scripts')
$deliveryFiles = @()
foreach ($name in $rootFiles) {
  $itemPath = Join-Path $projectRoot $name
  if (Test-Path -LiteralPath $itemPath) { $deliveryFiles += Get-Item -LiteralPath $itemPath }
}
foreach ($name in $folders) { $deliveryFiles += Get-ChildItem -LiteralPath (Join-Path $projectRoot $name) -Recurse -File }
$archiveStream = [System.IO.File]::Open($archivePath, [System.IO.FileMode]::Create)
$archive = [System.IO.Compression.ZipArchive]::new($archiveStream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in $deliveryFiles) {
    $relative = $file.FullName.Substring($projectRoot.Length + 1).Replace('\','/')
    if ($relative -match '(^|/)\.env(?:$|\.(?!example$))' -or $relative -match '(^|/)(\.local-data|node_modules|\.next)(/|$)' -or $relative -match '\.(key|pfx)$') { throw 'Arquivo privado na lista de entrega.' }
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, "oferta-certa/$relative") | Out-Null
  }
} finally { $archive.Dispose(); $archiveStream.Dispose() }
Write-Output "Pacote criado com $($deliveryFiles.Count) arquivos: $archivePath"
