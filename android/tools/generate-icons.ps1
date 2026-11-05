# Generates the legacy launcher PNGs used below Android 8.0 (API 26).
Add-Type -AssemblyName System.Drawing

$res = Join-Path (Split-Path $PSScriptRoot -Parent) 'app\src\main\res'
$densities = [ordered]@{
    'mdpi'    = 48
    'hdpi'    = 72
    'xhdpi'   = 96
    'xxhdpi'  = 144
    'xxxhdpi' = 192
}

foreach ($density in $densities.Keys) {
    $size = $densities[$density]
    $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $radius = $size * 0.22
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2
    $path.AddArc(0, 0, $diameter, $diameter, 180, 90)
    $path.AddArc($size - $diameter, 0, $diameter, $diameter, 270, 90)
    $path.AddArc($size - $diameter, $size - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc(0, $size - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    $backgroundBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 8, 8, 11))
    $graphics.FillPath($backgroundBrush, $path)

    $gold = [System.Drawing.Color]::FromArgb(255, 233, 184, 114)
    $softGold = [System.Drawing.Color]::FromArgb(115, 233, 184, 114)
    $center = $size / 2

    $outerPen = New-Object System.Drawing.Pen($softGold, [float]($size * 0.018))
    $outerPad = $size * 0.225
    $graphics.DrawEllipse($outerPen, [float]$outerPad, [float]$outerPad, [float]($size - 2 * $outerPad), [float]($size - 2 * $outerPad))

    $ringPen = New-Object System.Drawing.Pen($gold, [float]($size * 0.045))
    $ringPad = $size * 0.30
    $graphics.DrawEllipse($ringPen, [float]$ringPad, [float]$ringPad, [float]($size - 2 * $ringPad), [float]($size - 2 * $ringPad))

    $handPen = New-Object System.Drawing.Pen($gold, [float]($size * 0.052))
    $handPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $handPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawLine($handPen, [float]$center, [float]$center, [float]$center, [float]($size * 0.365))
    $graphics.DrawLine($handPen, [float]$center, [float]$center, [float]($size * 0.635), [float]($size * 0.585))

    $dotRadius = $size * 0.056
    $dotBrush = New-Object System.Drawing.SolidBrush($gold)
    $graphics.FillEllipse($dotBrush, [float]($center - $dotRadius), [float]($center - $dotRadius), [float]($dotRadius * 2), [float]($dotRadius * 2))

    $outDir = Join-Path $res "mipmap-$density"
    New-Item -ItemType Directory -Force $outDir | Out-Null
    $outFile = Join-Path $outDir 'ic_launcher.png'
    $bitmap.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)

    $graphics.Dispose()
    $bitmap.Dispose()
    $backgroundBrush.Dispose()
    $outerPen.Dispose()
    $ringPen.Dispose()
    $handPen.Dispose()
    $dotBrush.Dispose()
    $path.Dispose()

    Write-Output "Generated $outFile"
}
