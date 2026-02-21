# Push to your new GitHub repo

This project uses **only** your new repo: **https://github.com/rukminivardhan25/wander-wisely-new.git** (no old remotes).

## Use the new GitHub account (remove old one)

Git is currently using a different identity (**23211a0541-oss**), so push fails with 403. Clear it so you can sign in as **rukminivardhan25**:

**Option A – Script (easiest)**  
In PowerShell, from this folder:
```powershell
.\clear-git-credentials.ps1
```

**Option B – Windows Credential Manager**  
1. Press `Win`, type **Credential Manager**, open it.  
2. **Windows Credentials** → under **Generic Credentials**, find **git:https://github.com** or **github.com**.  
3. Click it → **Remove**.

## Push the code

From this folder in PowerShell or Command Prompt:

```powershell
cd "c:\Users\boinapalli rukmini\wander\wander-wisely-main"
git push -u origin main
```

- **Username:** `rukminivardhan25`
- **Password:** use a [Personal Access Token](https://github.com/settings/tokens) (with `repo` scope), not your GitHub password.

After a successful push, your code will be at https://github.com/rukminivardhan25/wander-wisely-new.
