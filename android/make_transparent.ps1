Add-Type -AssemblyName System.Drawing

function Convert-ToTransparentWhite($file) {
    Write-Host "Processing $file"
    $bmp = [System.Drawing.Bitmap]::FromFile($file)
    $w = $bmp.Width
    $h = $bmp.Height
    $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
    $bmpData = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    $stride = $bmpData.Stride
    $bytesSize = $stride * $h
    $pixels = New-Object byte[] $bytesSize
    [System.Runtime.InteropServices.Marshal]::Copy($bmpData.Scan0, $pixels, 0, $bytesSize)
    
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $offset = ($y * $stride) + ($x * 4)
            $b = $pixels[$offset]
            $g = $pixels[$offset + 1]
            $r = $pixels[$offset + 2]
            
            # Calculate luminance
            $lum = [int](0.299 * $r + 0.587 * $g + 0.114 * $b)
            
            # Set pixel to White with Alpha = luminance
            $pixels[$offset] = 255     # B
            $pixels[$offset + 1] = 255 # G
            $pixels[$offset + 2] = 255 # R
            $pixels[$offset + 3] = $lum # A
        }
    }
    
    [System.Runtime.InteropServices.Marshal]::Copy($pixels, 0, $bmpData.Scan0, $bytesSize)
    $bmp.UnlockBits($bmpData)
    
    $tempPath = $file + ".tmp"
    $bmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    
    # Get just the file name to rename properly
    $fileName = Split-Path $file -Leaf
    Remove-Item $file -Force
    Rename-Item $tempPath $fileName
}

$res = "d:\invoice\android\app\src\main\res"
$mipmaps = Get-ChildItem -Path $res -Filter "mipmap-*" -Directory

foreach ($dir in $mipmaps) {
    $fgPath = Join-Path $dir.FullName "ic_launcher_foreground.png"
    if (Test-Path $fgPath) {
        Convert-ToTransparentWhite $fgPath
    }
}
Write-Host "Done transparency conversion."
