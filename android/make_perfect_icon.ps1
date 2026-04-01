Add-Type -AssemblyName System.Drawing

$src = "d:\invoice\public\pwa-icon.png"
$bmp = [System.Drawing.Bitmap]::FromFile($src)
$w = $bmp.Width
$h = $bmp.Height

$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$bmpData = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$stride = $bmpData.Stride
$bytesSize = $stride * $h
$pixels = New-Object byte[] $bytesSize
[System.Runtime.InteropServices.Marshal]::Copy($bmpData.Scan0, $pixels, 0, $bytesSize)

# Pass 1: Find Min and Max Luminance
$minLum = 255
$maxLum = 0
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $offset = ($y * $stride) + ($x * 4)
        $b = $pixels[$offset]
        $g = $pixels[$offset + 1]
        $r = $pixels[$offset + 2]
        $lum = [int](0.299 * $r + 0.587 * $g + 0.114 * $b)
        if ($lum -lt $minLum) { $minLum = $lum }
        if ($lum -gt $maxLum) { $maxLum = $lum }
    }
}

Write-Host "MinLum: $minLum, MaxLum: $maxLum"

# Guarantee a non-zero denominator
if ($maxLum -eq $minLum) { $maxLum = $minLum + 1 }

# Pass 2: Apply transformation
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $offset = ($y * $stride) + ($x * 4)
        $b = $pixels[$offset]
        $g = $pixels[$offset + 1]
        $r = $pixels[$offset + 2]
        $lum = [int](0.299 * $r + 0.587 * $g + 0.114 * $b)
        
        # Invert luminance to alpha (Darker pixels become more opaque)
        $alphaF = 255.0 * ($maxLum - $lum) / ($maxLum - $minLum)
        $alpha = [int][Math]::Round($alphaF)
        if ($alpha -lt 0) { $alpha = 0 }
        if ($alpha -gt 255) { $alpha = 255 }
        
        # Set to purely White with the calculated Alpha
        $pixels[$offset] = 255     # B
        $pixels[$offset + 1] = 255 # G
        $pixels[$offset + 2] = 255 # R
        $pixels[$offset + 3] = $alpha # A
    }
}

[System.Runtime.InteropServices.Marshal]::Copy($pixels, 0, $bmpData.Scan0, $bytesSize)
$bmp.UnlockBits($bmpData)

$master = "d:\invoice\android\white_bs_transparent.png"
$bmp.Save($master, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Created $master"

# Deploy to mipmap folders
$res = "d:\invoice\android\app\src\main\res"
$dirs = @("mipmap-hdpi", "mipmap-mdpi", "mipmap-xhdpi", "mipmap-xxhdpi", "mipmap-xxxhdpi", "mipmap-ldpi")

foreach ($d in $dirs) {
    $path = Join-Path $res $d
    if (Test-Path $path) {
        $target = Join-Path $path "ic_launcher_foreground.png"
        Copy-Item $master -Destination $target -Force
        Write-Host "Deployed to $target"
    }
}
Write-Host "Perfect White Bs on Transparent Background deployed!"
