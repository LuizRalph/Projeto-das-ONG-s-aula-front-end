<# Abre uma instância isolada para QA manual. Encerre com Ctrl+C. #>
[CmdletBinding()]
param([ValidateRange(1024,65535)][int]$Port = 18083)
$ErrorActionPreference = 'Stop'
$qaRoot = Split-Path -Parent $PSScriptRoot
$qaPreviousDatabase = [Environment]::GetEnvironmentVariable('DB_DATABASE','Process')
Push-Location $qaRoot
try {
    $qaPhpArguments = @()
    if ($env:PHP_BINARY) { $qaPhp = (Get-Command $env:PHP_BINARY -ErrorAction Stop).Source }
    elseif (Test-Path -LiteralPath '.runtime/php/php.exe') {
        $qaPhp = Join-Path $qaRoot '.runtime/php/php.exe'
        $qaPhpArguments = @('-n','-d','extension_dir=.runtime/php/ext','-d','extension=pdo_mysql','-d','extension=mbstring','-d','extension=fileinfo')
    } else { $qaPhp = (Get-Command php -ErrorAction Stop).Source }
    $qaConnection = & $qaPhp @qaPhpArguments scripts/qa-preflight.php
    if ($LASTEXITCODE -ne 0) { throw 'Configuração de banco local recusada. Execute primeiro qa-local.ps1.' }
    $qaListener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
    try { $qaListener.Start() } finally { $qaListener.Stop() }
    $env:DB_DATABASE = 'ong_connect_test_manual_' + (Get-Date -Format 'yyyyMMddHHmmss') + '_' + $PID
    foreach ($qaPreparation in @('scripts/prepare-integration.php','scripts/install.php','scripts/integration-fixtures.php')) {
        & $qaPhp @qaPhpArguments $qaPreparation
        if ($LASTEXITCODE -ne 0) { throw "Falha em $qaPreparation. Verifique se o MariaDB local está funcionando." }
    }
    Write-Host "`nQA manual: http://127.0.0.1:$Port/"
    Write-Host "Banco exclusivo: $env:DB_DATABASE"
    Write-Host 'Contas fictícias: admin@example.com, ong@example.com, voluntario@example.com'
    Write-Host 'Senha somente deste banco de testes: SenhaFicticia123!'
    Write-Host 'Siga ong-connect/docs/QA-LOCAL.md. Mantenha este terminal aberto; encerre com Ctrl+C.'
    & $qaPhp @qaPhpArguments -S "127.0.0.1:$Port" -t ong-connect
    if ($LASTEXITCODE -ne 0) { throw 'Servidor de QA encerrado com erro.' }
} finally {
    [Environment]::SetEnvironmentVariable('DB_DATABASE',$qaPreviousDatabase,'Process')
    Pop-Location
}
