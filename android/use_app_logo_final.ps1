Add-Type -AssemblyName System.Drawing

$screenshotPath = "C:\Users\pc\.gemini\antigravity\brain\01e8e85e-50d3-4b8a-8741-8621529d2bcf\welcome_screen_bs_icon_1774622708572.png"
$src = [System.Drawing.Bitmap]::FromFile($screenshotPath)

# Coordinates from browser (504x754): 204, 186.7, 96, 96
# Screenshot size: 630x943 (Scale 1.25x)
# Scaled coordinates: 255, 233.75, 120, 120
$cropX = 255
$cropY = 234
$cropW = 120
$cropH = 120

$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$logo = $src.Clone($cropRect, $src.PixelFormat)
$src.Dispose()

# Verification save
$logo.Save("C:\Users\pc\.gemini\antigravity\brain\01e8e85e-50d3-4b8a-8741-8621529d2bcf\billsaathi_logo_verify.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Deploy to all Android mipmap folders
$res = "d:\invoice\android\app\src\main\res"
$sizes = @{
    "mipmap-ldpi"    = 36
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($entry in $sizes.GetEnumerator()) {
    $dir = $entry.Key
    $sz  = $entry.Value
    $path = Join-Path $res $dir
    if (-not (Test-Path $path)) { continue }

    $resized = New-Object System.Drawing.Bitmap($sz, $sz)
    $g = [System.Drawing.Graphics]::FromImage($resized)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.DrawImage($logo, 0, 0, $sz, $sz)
    $g.Dispose()

    $files = @("app_icon.png", "app_icon_foreground.png", "app_icon_round.png", "app_icon_round_foreground.png", "ic_launcher_foreground.png")
    foreach ($f in $files) {
        $out = Join-Path $path $f
        if (Test-Path $out) {
            $resized.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
            # No output for speed
        }
    }
    $resized.Dispose()
}

$logo.Dispose()
Write-Host "Done! Icons deployed with exact 's' style from browser."
