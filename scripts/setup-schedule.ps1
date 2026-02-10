# Task settings: run missed tasks on wake/login, allow on battery
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

# Setup Clock In task (8:55 AM)
$action1 = New-ScheduledTaskAction -Execute "D:\ci-co-automation\scripts\clock-in.bat"
$trigger1 = New-ScheduledTaskTrigger -Daily -At "08:55"
Register-ScheduledTask -TaskName "Talenta Clock In" -Action $action1 -Trigger $trigger1 -Settings $settings -Force

# Setup Clock Out task (6:05 PM)
$action2 = New-ScheduledTaskAction -Execute "D:\ci-co-automation\scripts\clock-out.bat"
$trigger2 = New-ScheduledTaskTrigger -Daily -At "18:05"
Register-ScheduledTask -TaskName "Talenta Clock Out" -Action $action2 -Trigger $trigger2 -Settings $settings -Force

Write-Host "Scheduled tasks created successfully!"
