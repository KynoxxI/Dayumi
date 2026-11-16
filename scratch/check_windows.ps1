Add-Type @'
  using System;
  using System.Runtime.InteropServices;
  using System.Text;
  public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  }
'@
[Win32]::EnumWindows({
  param($hwnd, $lparam)
  if ([Win32]::IsWindowVisible($hwnd)) {
    $sb = New-Object System.Text.StringBuilder 256
    [Win32]::GetWindowText($hwnd, $sb, 256) | Out-Null
    $title = $sb.ToString()
    if ($title.Length -gt 0) {
      $pId = 0
      [Win32]::GetWindowThreadProcessId($hwnd, [ref]$pId) | Out-Null
      Write-Host "PID: $pId | Title: $title"
    }
  }
  return $true
}, [IntPtr]::Zero)
