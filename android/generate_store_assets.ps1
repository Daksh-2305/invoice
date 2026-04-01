Add-Type -AssemblyName System.Drawing
$masterPath = 'C:\Users\pc\.gemini\antigravity\brain\01e8e85e-50d3-4b8a-8741-8621529d2bcf\media__1774623144191.png'
$iconPath = Join-Path 'd:\invoice\android' 'app_store_icon.png'
$featPath = Join-Path 'd:\invoice\android' 'feature_graphic.png'

# Load Master
$src = [System.Drawing.Bitmap]::FromFile($masterPath)

# 1. App Icon (512x512)
$icon = New-Object System.Drawing.Bitmap(512, 512)
$g1 = [System.Drawing.Graphics]::FromImage($icon)
$g1.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g1.DrawImage($src, 0, 0, 512, 512)
$g1.Dispose()
$icon.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved App Icon to: $iconPath"

# 2. Feature Graphic (1024x500)
# Use the salmon-red brand color #E8534A
$feat = New-Object System.Drawing.Bitmap(1024, 500)
$g2 = [System.Drawing.Graphics]::FromImage($feat)
$g2.Clear([System.Drawing.Color]::FromArgb(255, 232, 83, 74))
$logoSz = 300
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage($src, [int]((1024-$logoSz)/2), [int]((500-$logoSz)/2), $logoSz, $logoSz)
$g2.Dispose()
$feat.Save($featPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved Feature Graphic to: $featPath"

# Cleanup
$icon.Dispose()
$feat.Dispose()
$src.Dispose()
