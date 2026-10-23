param(
  [string]$Root = (Get-Location).Path,
  [int]$Port = 8765
)

Add-Type -AssemblyName System.Web

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving '$Root' at http://localhost:$Port/ (Ctrl+C to stop)"

$extMime = @{
  '.html' = 'text/html; charset=utf-8'
  '.htm'  = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.json' = 'application/json; charset=utf-8'
  '.woff' = 'font/woff'
  '.woff2'= 'font/woff2'
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
  } catch {
    break
  }

  $req = $ctx.Request
  $res = $ctx.Response

  # Resolve path: '/' -> '/index.html', strip query, normalize
  $raw = $req.Url.AbsolutePath
  if ($raw -eq '/' -or $raw -eq '') { $raw = '/index.html' }
  $raw = $raw -replace '/', '\'
  $raw = $raw.TrimStart('\')

  $filePath = Join-Path $Root $raw

  if (Test-Path -LiteralPath $filePath -PathType Leaf) {
    $ext = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
    $mime = if ($extMime.ContainsKey($ext)) { $extMime[$ext] } else { 'application/octet-stream' }
    try {
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $res.ContentType = $mime
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch {
      $res.StatusCode = 500
    }
  } else {
    $res.StatusCode = 404
    $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $raw")
    $res.ContentType = 'text/plain; charset=utf-8'
    $res.ContentLength64 = $body.Length
    $res.OutputStream.Write($body, 0, $body.Length)
  }

  $res.Close()
}

$listener.Stop()
