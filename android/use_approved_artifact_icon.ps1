Add-Type -AssemblyName System.Drawing

# The exact artifact image provided by the user in Step 984 (media__1774623144191.png)
$masterSrc = "C:\Users\pc\.gemini\antigravity\brain\01e8e85e-50d3-4b8a-8741-8621529d2bcf\media__1774623144191.png"

if (-not (Test-Path $masterSrc)) {
    # Fallback if the id was slightly off (shouldn't happen)
    $masterSrc = Get-ChildItem "C:\Users\pc\.gemini\antigravity\brain\01e8e85e-50d3-4b8a-8741-8621529d2bcf\media__*.png" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
}

Write-Host "Using master source: $masterSrc"
$logo = [System.Drawing.Bitmap]::FromFile($masterSrc)

$res = "d:\invoice\android\app\src\main\res"
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

    # Draw both legacy (48) and adaptive (108) from this source
    foreach ($szDP in @(48, 108)) {
        $px = [int]($szDP * $scale)
        $bmp = New-Object System.Drawing.Bitmap($px, $px)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        
        # Draw the logo filling the full square
        $g.DrawImage($logo, 0, 0, $px, $px)
        $g.Dispose()

        # Decision: which files to overwrite
        $files = if ($szDP -eq 48) { 
            @("app_icon.png", "app_icon_round.png", "ic_launcher.png", "ic_launcher_round.png") 
        } else { 
            @("app_icon_foreground.png", "app_icon_round_foreground.png", "ic_launcher_foreground.png") 
        }
        
        foreach ($f in $files) {
            $out = Join-Path $path $f
            if (Test-Path $out) { $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png) }
        }
        $bmp.Dispose()
    }
}
$logo.Dispose()
Write-Host "Done! All Android icons updated with the exact user-provided file."
