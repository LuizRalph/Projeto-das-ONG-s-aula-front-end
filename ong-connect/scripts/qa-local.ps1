<#
.SYNOPSIS
Executa QA local e grava logs e resumo em .runtime/qa/.
.EXAMPLE
.\scripts\qa-local.ps1
.EXAMPLE
.\scripts\qa-local.ps1 -Quick
#>
[CmdletBinding()]
param([switch]$Quick)

$ErrorActionPreference = 'Stop'
$qaRoot = Split-Path -Parent $PSScriptRoot
$qaRunId = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + $PID
$qaOutput = Join-Path $qaRoot ".runtime/qa/$qaRunId"
$qaSteps = New-Object System.Collections.Generic.List[object]
$qaStarted = Get-Date
$qaStatus = 'FALHOU'
$qaFailure = $null
$qaSavedDatabase = [Environment]::GetEnvironmentVariable('DB_DATABASE', 'Process')
$qaSavedPhp = [Environment]::GetEnvironmentVariable('PHP_BINARY', 'Process')
Push-Location $qaRoot

function Invoke-QaNative([string]$Executable, [string[]]$CommandArguments) {
    $qaPreviousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $Executable @CommandArguments 2>&1 | Tee-Object -FilePath $script:qaStepLog -Append | ForEach-Object { Write-Host "$_" }
        $qaNativeExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $qaPreviousPreference }
    if ($qaNativeExit -ne 0) { throw "Comando falhou com código $qaNativeExit. Consulte o log da etapa." }
}
function Invoke-QaStep([string]$Name, [scriptblock]$Action) {
    Write-Host "`n>>> $Name"
    $qaStepStarted = Get-Date
    $script:qaStepLog = Join-Path $qaOutput ((($qaSteps.Count + 1).ToString('00')) + '.log')
    New-Item -ItemType File -Path $script:qaStepLog -Force | Out-Null
    try {
        & $Action
        $qaSteps.Add([pscustomobject]@{name=$Name;status='PASSOU';seconds=[math]::Round(((Get-Date)-$qaStepStarted).TotalSeconds,2);log=$script:qaStepLog})
    } catch {
        $_.Exception.Message | Add-Content -LiteralPath $script:qaStepLog
        $qaSteps.Add([pscustomobject]@{name=$Name;status='FALHOU';seconds=[math]::Round(((Get-Date)-$qaStepStarted).TotalSeconds,2);log=$script:qaStepLog})
        throw
    }
}
function Test-QaPort([string]$DatabaseHost, [int]$DatabasePort) {
    $qaClient = New-Object System.Net.Sockets.TcpClient
    try {
        $qaConnect = $qaClient.ConnectAsync($DatabaseHost, $DatabasePort)
        if (-not $qaConnect.Wait(1000)) { return $false }
        return $qaClient.Connected
    } catch { return $false }
    finally { $qaClient.Dispose() }
}

try {
    New-Item -ItemType Directory -Path $qaOutput -Force | Out-Null
    # Evita que o teste isolado de senhas herde um banco de outra sessão.
    [Environment]::SetEnvironmentVariable('DB_DATABASE', $null, 'Process')
    $qaPortablePhp = Join-Path $qaRoot '.runtime/php/php.exe'
    $qaPhpArguments = @()
    if ($qaSavedPhp) {
        $qaPhp = (Get-Command $qaSavedPhp -ErrorAction Stop).Source
    } elseif (Test-Path -LiteralPath $qaPortablePhp) {
        $qaPhp = $qaPortablePhp
        $qaPhpArguments = @('-n','-d',('extension_dir=' + (Join-Path $qaRoot '.runtime/php/ext')),'-d','extension=pdo_mysql','-d','extension=mbstring','-d','extension=fileinfo')
    } else { $qaPhp = (Get-Command php -ErrorAction Stop).Source }
    $qaPortableNode = Join-Path $qaRoot '.runtime/node.exe'
    $qaNode = if (Test-Path -LiteralPath $qaPortableNode) { $qaPortableNode } else { (Get-Command node -ErrorAction Stop).Source }
    Invoke-QaStep 'Requisitos' {
        Invoke-QaNative $qaPhp ($qaPhpArguments + @('-v'))
        Invoke-QaNative $qaNode @('--version')
        Invoke-QaNative $qaNode @('-e','if(parseInt(process.versions.node)<22)process.exit(1)')
    }
    Invoke-QaStep 'Sintaxe PHP e JavaScript' {
        foreach ($qaFile in Get-ChildItem -Path ong-connect/api,scripts,config -Filter *.php -File -Recurse) {
            Invoke-QaNative $qaPhp ($qaPhpArguments + @('-l',$qaFile.FullName))
        }
        foreach ($qaFile in Get-ChildItem -Path ong-connect/assets/js,scripts -File -Recurse | Where-Object { $_.Extension -in @('.js','.cjs') }) {
            Invoke-QaNative $qaNode @('--check',$qaFile.FullName)
        }
    }
    Invoke-QaStep 'Segurança P0: senhas' { Invoke-QaNative $qaPhp ($qaPhpArguments + @('scripts/test-security-p0.php')) }
    Invoke-QaStep 'Cliente JavaScript' { Invoke-QaNative $qaNode @('scripts/test-client.cjs') }
    if (-not $Quick) {
        Invoke-QaStep 'Banco local e portas de integração' {
            $qaPreflight = & $qaPhp @qaPhpArguments scripts/qa-preflight.php
            if ($LASTEXITCODE -ne 0) { throw 'Configuração de banco recusada pelo preflight. Confira a mensagem acima e config/database.php.' }
            $qaDatabase = ($qaPreflight -join "`n") | ConvertFrom-Json
            "MariaDB local: $($qaDatabase.host):$($qaDatabase.port)" | Tee-Object -FilePath $script:qaStepLog -Append | Write-Host
            if (-not (Test-QaPort $qaDatabase.host $qaDatabase.port)) {
                $qaMariaDb = Join-Path $qaRoot '.runtime/mariadb-11.4.5-winx64/bin/mariadbd.exe'
                $qaMariaConfig = Join-Path $qaRoot '.runtime/db/my.ini'
                if ($qaDatabase.port -ne 3308 -or -not (Test-Path -LiteralPath $qaMariaDb) -or -not (Test-Path -LiteralPath $qaMariaConfig)) {
                    throw 'MariaDB local parado. Inicie a instância configurada e execute novamente.'
                }
                Start-Process -FilePath $qaMariaDb -WindowStyle Hidden -WorkingDirectory $qaRoot `
                    -ArgumentList @('--defaults-file=.runtime/db/my.ini','--bind-address=127.0.0.1','--console') `
                    -RedirectStandardOutput (Join-Path $qaOutput 'mariadb-start.log') -RedirectStandardError (Join-Path $qaOutput 'mariadb-error.log') | Out-Null
                for ($qaAttempt=0; $qaAttempt -lt 30; $qaAttempt++) {
                    if (Test-QaPort $qaDatabase.host $qaDatabase.port) { break }
                    Start-Sleep -Milliseconds 500
                }
                if (-not (Test-QaPort $qaDatabase.host $qaDatabase.port)) { throw 'MariaDB portátil não iniciou. Consulte mariadb-error.log nesta execução.' }
            }
            foreach ($qaPort in @(18081,18082)) {
                if (Test-QaPort '127.0.0.1' $qaPort) { throw "Porta $qaPort ocupada. Encerre a execução de testes anterior e tente novamente." }
            }
        }
        Invoke-QaStep 'Integração HTTP, banco, permissões e concorrência' { Invoke-QaNative $qaNode @('scripts/test-shared.cjs') }
    }
    $qaStatus = 'PASSOU'
} catch {
    $qaFailure = $_.Exception.Message
    Write-Host "`nQA FALHOU: $qaFailure" -ForegroundColor Red
} finally {
    [Environment]::SetEnvironmentVariable('DB_DATABASE', $qaSavedDatabase, 'Process')
    [Environment]::SetEnvironmentVariable('PHP_BINARY', $qaSavedPhp, 'Process')
    $qaSummary = [ordered]@{
        status=$qaStatus;mode=$(if($Quick){'rapido'}else{'completo'});started=$qaStarted.ToString('o');finished=(Get-Date).ToString('o')
        steps=@($qaSteps.ToArray());error=$qaFailure;manualQA='PENDENTE - seguir ong-connect/docs/QA-LOCAL.md'
    }
    if (Test-Path -LiteralPath $qaOutput) {
        $qaSummary | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $qaOutput 'resultado.json') -Encoding UTF8
        @("QA: $qaStatus", "Modo: $($qaSummary.mode)", 'QA manual: PENDENTE', "Falha: $qaFailure", '', ($qaSteps | Format-Table name,status,seconds -AutoSize | Out-String)) | Set-Content -LiteralPath (Join-Path $qaOutput 'resumo.txt') -Encoding UTF8
    }
    Pop-Location
}
Write-Host "`nQA automatizado: $qaStatus"
Write-Host "Relatórios: $qaOutput"
Write-Host 'QA manual: seguir ong-connect/docs/QA-LOCAL.md. Nenhuma publicação foi realizada.'
if ($qaStatus -ne 'PASSOU') { exit 1 }
exit 0
