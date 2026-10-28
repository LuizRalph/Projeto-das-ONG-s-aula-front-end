# Inicia o ambiente já configurado. Não instala serviços no Windows.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    New-Item -ItemType Directory -Path .runtime -Force | Out-Null
    $portablePhp = Join-Path $projectRoot '.runtime/php/php.exe'
    $portableDatabase = Join-Path $projectRoot '.runtime/mariadb-11.4.5-winx64/bin/mariadbd.exe'
    if (-not (Test-Path -LiteralPath config/database.php)) {
        throw 'Configure config/database.php e execute scripts/install.php primeiro. Consulte ong-connect/docs/PHP-MARIADB.md.'
    }
    function PortOpen([int]$Port) {
        $client = New-Object System.Net.Sockets.TcpClient
        try { $client.Connect('127.0.0.1', $Port); return $true }
        catch { return $false }
        finally { $client.Dispose() }
    }
    if ((Test-Path -LiteralPath $portableDatabase) -and (Test-Path -LiteralPath .runtime/db/my.ini) -and -not (PortOpen 3308)) {
        Start-Process -FilePath $portableDatabase -WindowStyle Hidden -WorkingDirectory $projectRoot `
            -ArgumentList @('--defaults-file=.runtime/db/my.ini', '--bind-address=127.0.0.1', '--console') `
            -RedirectStandardOutput .runtime/mariadb-start.log -RedirectStandardError .runtime/mariadb-error.log | Out-Null
        $ready = $false
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            if (PortOpen 3308) { $ready = $true; break }
            Start-Sleep -Milliseconds 500
        }
        if (-not $ready) { throw 'MariaDB não iniciou. Consulte .runtime/mariadb-error.log.' }
    }
    if (-not (PortOpen 8080)) {
        if (Test-Path -LiteralPath $portablePhp) {
            $phpExecutable = $portablePhp
            $phpArguments = @('-n', '-d', 'extension_dir=.runtime/php/ext', '-d', 'extension=pdo_mysql', '-d', 'extension=mbstring', '-d', 'extension=fileinfo')
        } else {
            $phpExecutable = (Get-Command php -ErrorAction Stop).Source
            $phpArguments = @()
        }
        Start-Process -FilePath $phpExecutable -WindowStyle Hidden -WorkingDirectory $projectRoot `
            -ArgumentList ($phpArguments + @('-S', '127.0.0.1:8080', '-t', 'ong-connect')) `
            -RedirectStandardOutput .runtime/php-start.log -RedirectStandardError .runtime/php-error.log | Out-Null
    }
    $ready = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        try {
            $result = Invoke-RestMethod -Uri 'http://127.0.0.1:8080/api/index.php?resource=catalogo' -TimeoutSec 2
            if ($null -ne $result.ongs) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ready) { throw 'A API não respondeu. Confira PHP, MariaDB, instalação e logs em .runtime.' }
    Write-Output 'Site: http://127.0.0.1:8080/'
    Write-Output 'Painel: http://127.0.0.1:8080/dashboard/ongs.html'
} finally { Pop-Location }
