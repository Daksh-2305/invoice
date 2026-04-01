Add-Type -AssemblyName System.Drawing

$screenshotPath = "C:\Users\pc\.gemini\antigravity\brain\01e8e85e-50d3-4b8a-8741-8621529d2bcf\welcome_screen_bs_icon_1774622708572.png"
$src = [System.Drawing.Bitmap]::FromFile($screenshotPath)

# Coordinates from browser (504x754): 204, 186.7, 96, 96
# Screenshot size: 630x943 (Scale 1.25x)
# Scaled coordinates: 255, 233.75, 120, 120
$cropRect = New-Object System.Drawing.Rectangle(255, 234, 120, 120)
$logo = $src.Clone($cropRect, $src.PixelFormat)
$src.Dispose()

$res = "d:\invoice\android\app\src\main\res"

# Density scales: mdpi=1.0, hdpi=1.5, xhdpi=2.0, xxhdpi=3.0, xxxhdpi=4.0
$densities = @{
    "mipmap-mdpi"    = 1.0
    "mipmap-hdpi"    = 1.5
    "mipmap-xhdpi"   = 2.0
    "mipmap-xxhdpi"  = 3.0
    "mipmap-xxxhdpi" = 4.0
}

foreach ($entry in $densities.GetEnumerator()) {
    $dir   = $entry.Key
    $scale = $entry.Value
    $path  = Join-Path $res $dir
    if (-not (Test-Path $path)) { continue }

    # 1. Legacy icons (48dp)
    $sz48 = [int](48 * $scale)
    $bmp48 = New-Object System.Drawing.Bitmap($sz48, $sz48)
    $g = [System.Drawing.Graphics]::FromImage($bmp48)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($logo, 0, 0, $sz48, $sz48)
    $g.Dispose()
    
    $legacyFiles = @("app_icon.png", "app_icon_round.png", "ic_launcher.png", "ic_launcher_round.png")
    foreach ($f in $legacyFiles) {
        $out = Join-Path $path $f
        if (Test-Path $out) { $bmp48.Save($out, [System.Drawing.Imaging.ImageFormat]::Png) }
    }
    $bmp48.Dispose()

    # 2. Adaptive Foreground (108dp)
    $sz108 = [int](108 * $scale)
    $bmp108 = New-Object System.Drawing.Bitmap($sz108, $sz108)
    $g = [System.Drawing.Graphics]::FromImage($bmp108)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # Adaptive icons need the actual content to be within the 66dp center safe zone.
    # 108dp total, 66dp center. So content is 61% of total size.
    $safeSize = [int]($sz108 * 0.61)
    $offset = [int](($sz108 - $safeSize) / 2)
    $g.DrawImage($logo, $offset, $offset, $safeSize, $safeSize)
    $g.Dispose()

    $adaptiveFiles = @("app_icon_foreground.png", "app_icon_round_foreground.png", "ic_launcher_foreground.png")
    foreach ($f in $adaptiveFiles) {
        $out = Join-Path $path $f
        if (Test-Path $out) { $bmp108.Save($out, [System.Drawing.Imaging.ImageFormat]::Png) }
    }
    $bmp108.Dispose()
}

$logo.Dispose()
Write-Host "Done! All legacy (48dp) and adaptive (108dp) icons deployed with exact 's' style."
