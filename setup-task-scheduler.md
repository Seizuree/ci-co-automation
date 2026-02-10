# Setting Up Windows Task Scheduler for Talenta Automation

This guide walks you through manually creating scheduled tasks to run the clock in/out scripts automatically every day.

> For an automated setup, run `scripts/setup-schedule.ps1` as Administrator instead.

## Prerequisites

- The project is set up and `pnpm run clock-in` / `pnpm run clock-out` work correctly when run manually.
- You know the full path to the project directory (the batch scripts default to `D:\ci-co-automation`).

## Step 1: Open Task Scheduler

1. Press `Win + R`
2. Type `taskschd.msc`
3. Press Enter

## Step 2: Create the Clock In Task (08:50 AM)

1. Click "Create Basic Task..." in the right panel.

2. **Name and Description**
   - Name: `Talenta Clock In`
   - Description: `Automated daily clock in for Talenta HR`
   - Click Next

3. **Trigger**
   - Select "Daily"
   - Click Next

4. **Daily Settings**
   - Start date: today's date
   - Start time: `8:50:00 AM`
   - Recur every: `1` days
   - Click Next

5. **Action**
   - Select "Start a program"
   - Click Next

6. **Program/Script**
   - Program/script: `D:\ci-co-automation\scripts\clock-in.bat`
   - Click Next

7. **Finish**
   - Review the summary and click Finish

## Step 3: Create the Clock Out Task (6:05 PM)

1. Click "Create Basic Task..." in the right panel.

2. **Name and Description**
   - Name: `Talenta Clock Out`
   - Description: `Automated daily clock out for Talenta HR`
   - Click Next

3. **Trigger**
   - Select "Daily"
   - Click Next

4. **Daily Settings**
   - Start date: today's date
   - Start time: `6:05:00 PM`
   - Recur every: `1` days
   - Click Next

5. **Action**
   - Select "Start a program"
   - Click Next

6. **Program/Script**
   - Program/script: `D:\ci-co-automation\scripts\clock-out.bat`
   - Click Next

7. **Finish**
   - Review the summary and click Finish

## Verification

After setup, you should see both tasks in the Task Scheduler Library:

| Task Name | Schedule |
|---|---|
| Talenta Clock In | Daily at 08:50 AM |
| Talenta Clock Out | Daily at 06:05 PM |

To test a task immediately, right-click on it and select "Run".

## Important Notes

- The computer must be powered on and awake at the scheduled times. Tasks will not run if the machine is in sleep or hibernate mode.
- If you move the project to a different directory, update the paths in both the batch files (`scripts/clock-in.bat`, `scripts/clock-out.bat`) and the Task Scheduler entries.
- To remove the tasks, right-click on each one in Task Scheduler Library and select "Delete".
