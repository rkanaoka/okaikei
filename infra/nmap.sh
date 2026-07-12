$network = "10.5.103"
$port = 9100
$timeout = 200

1..254 | ForEach-Object {
    $ip = "$network.$_"
    $tcp = New-Object System.Net.Sockets.TcpClient
    $connect = $tcp.BeginConnect($ip, $port, $null, $null)
    $wait = $connect.AsyncWaitHandle.WaitOne($timeout, $false)
    if ($wait -and $tcp.Connected) {
        Write-Host "✅ Impressora encontrada: $ip : $port" -ForegroundColor Green
        $tcp.EndConnect($connect)
    }
    $tcp.Close()
}