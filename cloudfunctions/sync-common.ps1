# 将 cloudfunctions/common 同步到各云函数目录（部署前执行）
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $root "common"
$targets = @("generateBiography", "chatInterview", "bioShare")

foreach ($name in $targets) {
  $dest = Join-Path $root "$name\common"
  if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
  Copy-Item $src $dest -Recurse -Force
  Write-Host "Synced common -> $name\common"
}
