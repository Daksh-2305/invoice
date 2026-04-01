Add-Type -AssemblyName System.Drawing

# Icon sizes for each density
$sizes = @{
    "mipmap-ldpi"    = 36
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

$res = "d:\invoice\android\app\src\main\res"

# Exact color from the app's CSS primary color (salmon-red)
$red = [System.Drawing.Color]::FromArgb(255, 232, 83, 74)

foreach ($entry in $sizes.GetEnumerator()) {
    $dir = $entry.Key
    $sz  = $entry.Value
    $path = Join-Path $res $dir
    if (-not (Test-Path $path)) { continue }

    $bmp = New-Object System.Drawing.Bitmap($sz, $sz)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    # Red background (full square)
    $g.Clear($red)

    # White "Bs" in Georgia Bold — matching the app exactly
    $fontSize = [float]($sz * 0.40)
    $font  = New-Object System.Drawing.Font("Georgia", $fontSize, [System.Drawing.FontStyle]::Bold)
    $brush = [System.Drawing.Brushes]::White
    $sf    = New-Object System.Drawing.StringFormat
    $sf.Alignment     = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect  = New-Object System.Drawing.RectangleF(0, 0, $sz, $sz)
    $g.DrawString("Bs", $font, $brush, $rect, $sf)

    $g.Dispose()
    $font.Dispose()

    # Deploy to all icon variants in this density folder
    $files = @(
        "app_icon.png", "app_icon_foreground.png",
        "app_icon_round.png", "app_icon_round_foreground.png",
        "ic_launcher_foreground.png"
    )
    foreach ($f in $files) {
        $out = Join-Path $path $f
        if (Test-Path $out) {
            $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
        }
    }
    $bmp.Dispose()
    Write-Host "Done $dir ($sz x $sz)"
}
Write-Host "All icons drawn with Georgia Bold font!"
