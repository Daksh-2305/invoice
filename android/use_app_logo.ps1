Add-Type -AssemblyName System.Drawing

$screenshotPath = "C:\Users\pc\.gemini\antigravity\brain\01e8e85e-50d3-4b8a-8741-8621529d2bcf\billsaathi_logo_screen_1774622124173.png"

$src = [System.Drawing.Bitmap]::FromFile($screenshotPath)
Write-Host "Screenshot size: $($src.Width) x $($src.Height)"

# The logo appears roughly centered horizontally, in the top third of a 627x928 screenshot
# Approx logo bounds from visual inspection: x~235, y~220, w~160, h~160
# Let's be a bit generous and crop from x=230, y=215, size=170x170
$cropX = 230
$cropY = 215
$cropW = 170
$cropH = 170

$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$logo = $src.Clone($cropRect, $src.PixelFormat)
$src.Dispose()

# Now resize and deploy to each mipmap density
$sizes = @{
    "mipmap-ldpi"    = 36
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

$res = "d:\invoice\android\app\src\main\res"

foreach ($entry in $sizes.GetEnumerator()) {
    $dir = $entry.Key
    $sz  = $entry.Value
    $path = Join-Path $res $dir
    if (-not (Test-Path $path)) { continue }

    # Resize the cropped logo to the target size
    $resized = New-Object System.Drawing.Bitmap($sz, $sz)
    $g = [System.Drawing.Graphics]::FromImage($resized)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.DrawImage($logo, 0, 0, $sz, $sz)
    $g.Dispose()

    # Deploy to all icon files in this density folder
    $files = @("app_icon.png", "app_icon_foreground.png", "app_icon_round.png", "app_icon_round_foreground.png", "ic_launcher_foreground.png")
    foreach ($f in $files) {
        $out = Join-Path $path $f
        if (Test-Path $out) {
            $resized.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
            Write-Host "Deployed $sz x $sz -> $out"
        }
    }
    $resized.Dispose()
}
$logo.Dispose()
Write-Host "Done! All Android icons now use the exact logo from the app."
