Add-Type -AssemblyName System.Drawing
$res = "d:\invoice\android\app\src\main\res"
$mipmaps = Get-ChildItem -Path $res -Filter "mipmap-*" -Directory

foreach ($dir in $mipmaps) {
    $files = Get-ChildItem -Path $dir.FullName -Filter "*.png"
    foreach ($file in $files) {
        try {
            $bytes = Get-Content -Path $file.FullName -Encoding Byte -TotalCount 2 -ErrorAction Stop
        } catch {
            $bytes = Get-Content -Path $file.FullName -AsByteStream -TotalCount 2 -ErrorAction Ignore
        }
        
        if ($null -ne $bytes -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8) {
            Write-Host "Converting $($file.FullName) to true PNG..."
            $img = [System.Drawing.Image]::FromFile($file.FullName)
            $tempPath = $file.FullName + ".tmp"
            $img.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
            $img.Dispose()
            Remove-Item $file.FullName -Force
            Rename-Item $tempPath $file.Name
        }
    }
}
Write-Host "Conversion completed successfully."
