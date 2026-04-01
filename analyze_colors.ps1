Add-Type -AssemblyName System.Drawing
try {
    $img = [System.Drawing.Bitmap]::FromFile("d:\invoice\public\pwa-icon.png")
    Write-Host "Image Size: $($img.Width)x$($img.Height)"
    
    $tl = $img.GetPixel(0,0)
    Write-Host "Top-Left: R=$($tl.R), G=$($tl.G), B=$($tl.B), A=$($tl.A)"
    
    $tr = $img.GetPixel($img.Width - 1, 0)
    Write-Host "Top-Right: R=$($tr.R), G=$($tr.G), B=$($tr.B), A=$($tr.A)"
    
    $center = $img.GetPixel([int]($img.Width/2), [int]($img.Height/2))
    Write-Host "Center: R=$($center.R), G=$($center.G), B=$($center.B), A=$($center.A)"
    
    $centerLeft = $img.GetPixel(10, [int]($img.Height/2))
    Write-Host "Center-Left: R=$($centerLeft.R), G=$($centerLeft.G), B=$($centerLeft.B), A=$($centerLeft.A)"
    
    $img.Dispose()
} catch {
    Write-Error $_
}
