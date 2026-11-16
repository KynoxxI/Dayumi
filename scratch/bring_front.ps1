Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  using System.Text;
  public class WinFocus {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  }
"@

$electronPids = (Get-Process -Name "electron" -ErrorAction SilentlyContinue).Id

[WinFocus]::EnumWindows({
  param($hWnd, $lParam)
  $pId = 0
  [WinFocus]::GetWindowThreadProcessId($hWnd, [ref]$pId) | Out-Null
  if ($electronPids -contains $pId) {
    [WinFocus]::ShowWindow($hWnd, 9) # SW_RESTORE
    [WinFocus]::SetForegroundWindow($hWnd)
    Write-Host "Brought window to front for PID $pId"
  }
  return $true
}, [IntPtr]::Zero)
