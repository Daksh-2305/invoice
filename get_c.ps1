Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile("d:\invoice\public\pwa-icon.png")
$tl = $img.GetPixel(0,0)
$c = $img.GetPixel([int]($img.Width/2), [int]($img.Height/2))
"Top-Left: R=$($tl.R) G=$($tl.G) B=$($tl.B)" | Out-File -FilePath d:\invoice\colors.txt
"Center:   R=$($c.R) G=$($c.G) B=$($c.B)" | Out-File -FilePath d:\invoice\colors.txt -Append
$c2 = $img.GetPixel([int]($img.Width/2), [int]($img.Height/2) + 20)
"Center2:  R=$($c2.R) G=$($c2.G) B=$($c2.B)" | Out-File -FilePath d:\invoice\colors.txt -Append
$img.Dispose()
