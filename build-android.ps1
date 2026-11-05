[CmdletBinding()]
param(
    [switch]$Install
)

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$androidDir = Join-Path $root 'android'
$localJdk = Join-Path $env:USERPROFILE '.jdks\jdk-17'

if (-not $env:JAVA_HOME -and (Test-Path (Join-Path $localJdk 'bin\java.exe'))) {
    $env:JAVA_HOME = $localJdk
}

if (-not $env:ANDROID_HOME) {
    $env:ANDROID_HOME = if ($env:ANDROID_SDK_ROOT) {
        $env:ANDROID_SDK_ROOT
    } else {
        Join-Path $env:LOCALAPPDATA 'Android\Sdk'
    }
}

if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    throw "JDK 17 not found. Set JAVA_HOME or install a JDK at $localJdk."
}

if (-not (Test-Path $env:ANDROID_HOME)) {
    throw "Android SDK not found at $env:ANDROID_HOME. Set ANDROID_HOME."
}

& (Join-Path $androidDir 'gradlew.bat') -p $androidDir assembleDebug
if ($LASTEXITCODE -ne 0) {
    throw "Gradle build failed with exit code $LASTEXITCODE."
}

$apk = Join-Path $androidDir 'app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path $apk)) {
    throw "Build finished but the APK was not found at $apk."
}

Write-Host ""
Write-Host "APK ready: $apk" -ForegroundColor Green

$rootApk = Join-Path $root 'shuman.apk'
Copy-Item -Force $apk $rootApk
Write-Host "Latest APK copy: $rootApk" -ForegroundColor Green

if ($Install) {
    $adb = Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'
    if (-not (Test-Path $adb)) {
        throw "adb not found at $adb. Install the Android SDK platform-tools package."
    }
    & $adb install -r $apk
    if ($LASTEXITCODE -ne 0) {
        throw "adb install failed with exit code $LASTEXITCODE."
    }
    Write-Host "Installed on the connected device." -ForegroundColor Green
}
