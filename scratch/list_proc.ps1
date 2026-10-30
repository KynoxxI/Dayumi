Get-CimInstance Win32_Process -Filter "name = 'electron.exe'" | ForEach-Object {
    [PSCustomObject]@{
        ProcessId = $_.ProcessId
        CommandLine = $_.CommandLine
    }
} | Format-List
