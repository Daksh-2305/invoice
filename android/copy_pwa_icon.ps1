Add-Type -AssemblyName System.Drawing

$src = "d:\invoice\public\pwa-icon.png"
$bmp = [System.Drawing.Bitmap]::FromFile($src)
$master = "d:\invoice\android\true_pwa_icon.png"
$bmp.Save($master, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

$res = "d:\invoice\android\app\src\main\res"
$dirs = @("mipmap-hdpi", "mipmap-mdpi", "mipmap-xhdpi", "mipmap-xxhdpi", "mipmap-xxxhdpi", "mipmap-ldpi")

foreach ($d in $dirs) {
    $path = Join-Path $res $d
    if (Test-Path $path) {
        $target = Join-Path $path "ic_launcher_foreground.png"
        Copy-Item $master -Destination $target -Force
        Write-Host "Processed $target"
    }
}
Write-Host "PWA Icon deployed as foreground!"
