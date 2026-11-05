[CmdletBinding()]
param(
    [string]$Sdk = (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
)

$ErrorActionPreference = 'Stop'

$jdk = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { Join-Path $env:USERPROFILE '.jdks\jdk-17' }
$java = Join-Path $jdk 'bin\java.exe'
if (-not (Test-Path $java)) {
    throw "JDK 17 not found at $jdk. Set JAVA_HOME or install the portable JDK first."
}
$env:JAVA_HOME = $jdk

$sdkManager = Join-Path $Sdk 'cmdline-tools\latest\bin\sdkmanager.bat'
if (-not (Test-Path $sdkManager)) {
    throw "Android command-line tools not found at $sdkManager."
}

Write-Host "Accepting Android SDK licenses..."
$answers = (1..80 | ForEach-Object { 'y' }) -join "`n"
$answers | & $sdkManager "--sdk_root=$Sdk" --licenses

Write-Host "Installing platform-tools, Android 35 platform, and build-tools 35.0.0..."
& $sdkManager "--sdk_root=$Sdk" 'platform-tools' 'platforms;android-35' 'build-tools;35.0.0'
if ($LASTEXITCODE -ne 0) {
    throw "sdkmanager failed with exit code $LASTEXITCODE."
}

Write-Host "Android SDK ready at $Sdk" -ForegroundColor Green
