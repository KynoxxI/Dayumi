import subprocess
import json

cmd = ['powershell', '-NoProfile', '-Command', "Get-Process -Name '*Dayumi*' | Select-Object Id, ProcessName, MainWindowHandle, MainWindowTitle | ConvertTo-Json"]
try:
    res = subprocess.check_output(cmd, text=True)
    print(res)
except Exception as e:
    print('Error:', e)
