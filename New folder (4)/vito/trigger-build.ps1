$json = Get-Content 'C:\Users\SBS\Desktop\New folder (4)\vito\build-request.json' -Raw
Write-Host "Attempting POST /api/builds..."
try {
    $result = Invoke-RestMethod -Uri 'http://localhost:3001/api/builds' -Method POST -Body $json -ContentType 'application/json'
    Write-Host "SUCCESS:"
    $result | ConvertTo-Json -Depth 10
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "FAILED with status: $statusCode"

    # Try to read error body
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error body: $errorBody"
    } catch {
        Write-Host "Could not read error body: $_"
    }
}
